const BaseService = require('../../core/BaseService')
const Subject = require('../../models/Subject.model')
const AppError = require('../../core/AppError')
const Question = require('../../models/Question.model')
const User = require('../../models/User.model')
const crypto = require('crypto')
const mongoose = require('mongoose')
const { createLogger } = require('../../config/logger')
const { groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const liveTestRepository = require('./live-test.repository')

const withResolvedSyllabus = (doc) => {
    if (!doc) return doc
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const chapterNameById = new Map()
    const topicNameById = new Map()

    const subjectList = Array.isArray(obj.subjectIds) ? obj.subjectIds : []
    for (const subject of subjectList) {
        if (subject && Array.isArray(subject.chapters)) {
            for (const chapter of subject.chapters) {
                if (chapter && chapter._id) {
                    chapterNameById.set(String(chapter._id), chapter.name)
                }
                if (chapter && Array.isArray(chapter.topics)) {
                    for (const topic of chapter.topics) {
                        if (topic && topic._id) {
                            topicNameById.set(String(topic._id), topic.name)
                        }
                    }
                }
            }
        }
    }

    obj.chapterIds = (Array.isArray(obj.chapterIds) ? obj.chapterIds : []).map((id) => {
        const name = chapterNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            chapterName: name,
        }
    })

    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => {
        const name = topicNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            topicName: name,
        }
    })

    obj.subjectIds = subjectList.map((subject) => {
        if (subject && typeof subject === 'object' && subject._id) {
            return {
                _id: subject._id,
                name: subject.name || null,
            }
        }
        return { _id: subject, name: null }
    })

    return obj
}

class LiveTestService extends BaseService {
    constructor() {
        super(liveTestRepository, 'live-test')
        this.logger = createLogger('live-test:service')
    }

    async getSyllabus(examId) {
        if (!examId) throw new AppError('examId is required', 400, 'VALIDATION_ERROR')

        const filter = { isDeleted: false, status: 'active' }
        if (examId.includes(',')) {
            filter.examIds = { $in: examId.split(',') }
        } else {
            filter.examIds = examId
        }

        const subjects = await Subject.find(filter)
            .select('_id name sortOrder chapters')
            .sort({ sortOrder: 1, name: 1 })
            .lean()

        const subjectList = []
        const chapterList = []

        for (const subject of subjects) {
            subjectList.push({
                _id: subject._id,
                name: subject.name,
                sortOrder: subject.sortOrder
            })

            const embeddedChapters = Array.isArray(subject.chapters) ? subject.chapters : []
            for (const chapter of embeddedChapters) {
                chapterList.push({
                    _id: chapter._id,
                    chapterName: chapter.name,
                    subjectId: subject._id,
                    topics: Array.isArray(chapter.topics)
                        ? chapter.topics.map(t => ({ _id: t._id, name: t.name }))
                        : []
                })
            }
        }

        return {
            subjects: subjectList,
            chapters: chapterList
        }
    }

    async autoGenerateQuestions({ testId, subjectId, chapterIds, limit }) {
        if (!testId) throw new AppError('testId is required', 400, 'VALIDATION_ERROR')
        if (!subjectId) throw new AppError('subjectId is required', 400, 'VALIDATION_ERROR')

        // Parse and normalize chapterIds
        let parsedChapterIds = []
        if (Array.isArray(chapterIds)) {
            parsedChapterIds = chapterIds.map(id => new mongoose.Types.ObjectId(id))
        } else if (typeof chapterIds === 'string' && chapterIds) {
            parsedChapterIds = chapterIds.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
        }

        // Query active questions matching the filter
        const query = {
            subjectId: new mongoose.Types.ObjectId(subjectId),
            isDeleted: false,
            status: 'active'
        }

        if (parsedChapterIds.length > 0) {
            query.chapterId = { $in: parsedChapterIds }
        }

        // Exclude questions that are already mapped to this target test to avoid mapping duplicate questions
        query.test = { $ne: new mongoose.Types.ObjectId(testId) }

        const adminQuestionService = require('../../admin/questions/admin-question.service')
        const parentTest = await adminQuestionService.resolveParentTest(testId)
        if (!parentTest) throw new AppError('Target test not found', 404, 'NOT_FOUND')

        let maxLimit = Number(limit) || 100

        const existingQuestions = await Question.find(query)
            .limit(maxLimit)
            .lean()

        if (existingQuestions.length === 0) {
            return {
                mappedCount: 0,
                message: 'No matching questions found to map'
            }
        }

        // Determine starting order
        let currentOrder = await adminQuestionService.nextOrder(testId)

        // Build the cloned questions payload
        const clonedQuestions = existingQuestions.map(q => {
            const cloned = {
                ...q,
                test: new mongoose.Types.ObjectId(testId),
                order: currentOrder++,
                sortOrder: q.sortOrder || 0,
                perQuestionTime: parentTest.isPerQuestionTime !== false ? (q.perQuestionTime || 60) : null
            }

            delete cloned._id
            delete cloned.createdAt
            delete cloned.updatedAt
            delete cloned.isDeleted
            delete cloned.__v

            return cloned
        })

        // Insert cloned questions
        const createdDocs = await Question.insertMany(clonedQuestions)

        // Sync question count on the parent test
        await adminQuestionService.syncQuestionCount(testId)

        return {
            mappedCount: createdDocs.length,
            message: `${createdDocs.length} questions mapped successfully`
        }
    }

    // User-side list endpoint (date is required/defaulted, no exam dependence)
    async listLiveTests(userId, query = {}) {
        const now = new Date()
        const LiveTestAttempt = require('../../models/LiveTestAttempt.model')
        const userAttempts = await LiveTestAttempt.find({ user: userId }).select('liveTest status').lean()
        const completedTestIds = new Set(userAttempts.filter(a => a.status === 'completed').map(a => a.liveTest.toString()))
        const activeTestIds = Array.from(userAttempts.filter(a => a.status === 'started' || a.status === 'ongoing').map(a => a.liveTest.toString()))

        const filter = { isDeleted: false, status: 'active' }

        if (query.q) {
            filter.$or = [
                { title: { $regex: query.q, $options: 'i' } },
                { description: { $regex: query.q, $options: 'i' } },
            ]
        }

        const startOfToday = new Date()
        startOfToday.setUTCHours(0, 0, 0, 0)
        const endOfToday = new Date()
        endOfToday.setUTCHours(23, 59, 59, 999)

        // Apply type filter if provided
        if (query.type === 'ongoing') {
            filter.$or = [
                {
                    scheduleAt: { $gte: startOfToday, $lte: endOfToday },
                    _id: { $nin: Array.from(completedTestIds) }
                },
                {
                    scheduleAt: null,
                    startDateTime: { $gte: startOfToday, $lte: endOfToday },
                    _id: { $nin: Array.from(completedTestIds) }
                }
            ]
        } else if (query.type === 'upcoming') {
            filter.$or = [
                { scheduleAt: { $gt: endOfToday } },
                { scheduleAt: null, startDateTime: { $gt: endOfToday } }
            ]
        } else if (query.type === 'attempted') {
            filter._id = { $in: Array.from(completedTestIds) }
        }

        if (query.date && query.date !== 'all') {
            const dateStr = query.date
            const startOfDay = new Date(dateStr)
            startOfDay.setUTCHours(0, 0, 0, 0)
            const endOfDay = new Date(dateStr)
            endOfDay.setUTCHours(23, 59, 59, 999)
            filter.scheduleAt = { $gte: startOfDay, $lte: endOfDay }
        }

        const liveTestsResult = await this.repository.findMany(filter, {
            page: query.page,
            limit: query.limit,
            sort: { createdAt: -1 },
            populate: [
                { path: 'examId', select: 'name' },
                { path: 'subExamIds', select: 'name' },
                { path: 'subjectIds', select: 'name chapters' }
            ]
        })

        const processedData = await Promise.all(liveTestsResult.data.map(async (item) => {
            const id = item._id.toString()
            const questionCount = await Question.countDocuments({ test: id, isDeleted: false })
            const completedAttempt = await LiveTestAttempt.findOne({ liveTest: id, user: userId, status: 'completed' })
                .select('score totalMarks status attemptedAt sessionId')
                .sort({ attemptedAt: -1 })
                .lean()

            const latestAttempt = await LiveTestAttempt.findOne({ liveTest: id, user: userId })
                .select('sessionId status')
                .sort({ attemptedAt: -1 })
                .lean()

            const resolved = withResolvedSyllabus(item)
            delete resolved.description
            delete resolved.instructions
            delete resolved.instructionsNew
            delete resolved.thumbnail
            delete resolved.localizedContent

            let attemptStatus = 'not_attempted'
            if (completedAttempt) {
                attemptStatus = 'attempted'
            } else if (latestAttempt && (latestAttempt.status === 'started' || latestAttempt.status === 'ongoing')) {
                attemptStatus = 'ongoing'
            }

            return {
                ...resolved,
                mappedQuestions: questionCount,
                attemptStatus,
                latestAttempt: completedAttempt || latestAttempt || null,
                sessionId: latestAttempt?.sessionId || null,
            }
        }))

        // Calculate metadata counts based on search query (if present)
        const countFilter = { isDeleted: false, status: 'active' }
        if (query.q) {
            countFilter.$or = [
                { title: { $regex: query.q, $options: 'i' } },
                { description: { $regex: query.q, $options: 'i' } },
            ]
        }

        const ongoingCount = await this.repository.model.countDocuments({
            ...countFilter,
            $or: [
                {
                    scheduleAt: { $gte: startOfToday, $lte: endOfToday },
                    _id: { $nin: Array.from(completedTestIds) }
                },
                {
                    scheduleAt: null,
                    startDateTime: { $gte: startOfToday, $lte: endOfToday },
                    _id: { $nin: Array.from(completedTestIds) }
                }
            ]
        })

        const upcomingCount = await this.repository.model.countDocuments({
            ...countFilter,
            $or: [
                { scheduleAt: { $gt: endOfToday } },
                { scheduleAt: null, startDateTime: { $gt: endOfToday } }
            ]
        })

        const attemptedCount = await this.repository.model.countDocuments({
            ...countFilter,
            _id: { $in: Array.from(completedTestIds) }
        })

        return {
            data: processedData,
            pagination: {
                ...liveTestsResult.pagination,
                ongoingCount,
                upcomingCount,
                attemptedCount
            },
            ongoingCount,
            upcomingCount,
            attemptedCount
        }
    }

    async getLiveTestInstructions(liveTestId, _userId) {
        const liveTest = await this.repository.getLiveTestById(liveTestId)
        if (!liveTest) throw new AppError('Live test not found', 404, 'NOT_FOUND')

        return {
            _id: liveTest._id,
            title: liveTest.title,
            duration: liveTest.duration,
            totalQuestions: liveTest.totalQuestions,
            totalMarks: liveTest.totalMarks,
            marksPerQuestion: liveTest.marksPerQuestion,
            negativeMarks: liveTest.negativeMarks,
            passingMarks: liveTest.passingMarks,
            instructions: liveTest.instructions,
            instructionsNew: liveTest.instructionsNew,
            localizedContent: liveTest.localizedContent
        }
    }

    async startSession(liveTestId, userId, language = 'hi') {
        const liveTest = await this.repository.getLiveTestById(liveTestId)
        if (!liveTest || liveTest.status !== 'active') {
            throw new AppError('Live test not found', 404, 'NOT_FOUND')
        }

        const hasAccess = !liveTest.isPaid
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForLiveTest(liveTestId)
        if (!questions.length) throw new AppError('No questions mapped for this live test', 400, 'VALIDATION_ERROR')

        const sessionId = crypto.randomUUID()
        const totalQuestions = new Set(questions.map(q => q.order)).size
        const totalMarks = Number(liveTest.totalMarks || totalQuestions * Number(liveTest.marksPerQuestion || 1))

        await this.repository.createAttempt({
            user: userId,
            liveTest: liveTest._id,
            sessionId,
            totalTime: liveTest.duration * 60,
            totalMarks,
            status: 'started',
            answers: []
        })

        const groupedQuestions = groupQuestionsBySubject(questions)
        return {
            sessionId,
            liveTest: {
                _id: liveTest._id,
                title: liveTest.title,
                duration: liveTest.duration,
                totalQuestions: liveTest.totalQuestions,
                totalMarks,
                passingMarks: liveTest.passingMarks,
                negativeMarks: liveTest.negativeMarks,
            },
            questionsBySubject: groupedQuestions,
        }
    }

    async updateSession(liveTestId, sessionId, userId, payload = {}) {
        const liveTest = await this.repository.getLiveTestById(liveTestId)
        if (!liveTest || liveTest.status !== 'active') {
            throw new AppError('Live test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        if (attempt.status === 'completed' || attempt.status === 'abandoned') {
            throw new AppError('Session already closed', 400, 'VALIDATION_ERROR')
        }

        let updatedAnswers = attempt.answers || []

        if (payload.answer && payload.answer.questionId) {
            const index = updatedAnswers.findIndex(a => a.questionId.toString() === payload.answer.questionId.toString())
            if (index !== -1) {
                updatedAnswers[index] = payload.answer
            } else {
                updatedAnswers.push(payload.answer)
            }
        } else if (payload.answers && Array.isArray(payload.answers)) {
            payload.answers.forEach(newAns => {
                const index = updatedAnswers.findIndex(a => a.questionId.toString() === newAns.questionId.toString())
                if (index !== -1) {
                    updatedAnswers[index] = newAns
                } else {
                    updatedAnswers.push(newAns)
                }
            })
        }

        const questions = await this.repository.findQuestionsForLiveTest(liveTestId)
        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, updatedAnswers, liveTest)

        const totalMarks = Number(liveTest.totalMarks || totalQuestions * Number(liveTest.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 100).toFixed(2)) : 0
        const timeTaken = updatedAnswers.reduce((acc, ans) => acc + (ans.timeTaken || 0), 0)

        const status = payload.status || 'ongoing'

        attempt.answers = updatedAnswers
        attempt.score = score
        attempt.totalMarks = totalMarks
        attempt.accuracy = accuracy
        attempt.timeTaken = timeTaken
        attempt.correct = correct
        attempt.wrong = wrong
        attempt.skipped = skipped
        attempt.unattempted = unattempted
        attempt.status = status
        if (status === 'completed') {
            attempt.attemptedAt = new Date()
        }

        await attempt.save()

        return {
            attemptId: attempt._id,
            sessionId,
            status,
            score,
            totalMarks,
            passingMarks: Number(liveTest.passingMarks || 0),
            isPassed: score >= Number(liveTest.passingMarks || 0),
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted
        }
    }

    async getSessionAnalytics(liveTestId, sessionId, userId) {
        const liveTest = await this.repository.getLiveTestById(liveTestId)
        if (!liveTest) throw new AppError('Live test not found', 404, 'NOT_FOUND')

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) throw new AppError('Session not found', 404, 'NOT_FOUND')

        const { rank, totalParticipants } = await this.repository.getAttemptRank(liveTestId, attempt.score || 0, attempt.timeTaken || 0)

        const questions = await this.repository.findQuestionsForLiveTest(liveTestId)
        const userAnswers = attempt.answers || []

        const sectionWise = new Map()
        const topicWise = new Map()

        const marksPerQuestion = Number(liveTest.marksPerQuestion || 1)
        const negativeMarks = Number(liveTest.negativeMarks || 0)

        const processedOrders = new Set()

        for (const q of questions) {
            if (processedOrders.has(q.order)) continue
            processedOrders.add(q.order)

            const siblingQuestionIds = questions.filter(sq => sq.order === q.order).map(sq => String(sq._id))
            const ans = userAnswers.find(a => siblingQuestionIds.includes(String(a.questionId)))

            let isAttempted = false
            let isCorrect = false
            let marksObtained = 0

            if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
                isAttempted = true

                const answeredQ = questions.find(sq => String(sq._id) === String(ans.questionId))
                let correctIndex = -1
                if (answeredQ) {
                    if (answeredQ.en?.options) correctIndex = answeredQ.en.options.findIndex(opt => opt.isCorrect)
                    if (correctIndex === -1 && answeredQ.hi?.options) correctIndex = answeredQ.hi.options.findIndex(opt => opt.isCorrect)
                }

                if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
                    isCorrect = true
                    marksObtained = marksPerQuestion
                } else {
                    marksObtained = -negativeMarks
                }
            }

            const subjectsToProcess = q.subjectId ? [q.subjectId] : [null]
            const chaptersToProcess = q.chapterId ? [q.chapterId] : ['uncategorized']
            const topicsToProcess = q.topicId ? [q.topicId] : ['uncategorized']

            const subj = subjectsToProcess[0]
            const chapId = String(chaptersToProcess[0])
            const topId = String(topicsToProcess[0])

            let groupId = null
            let groupType = null
            let groupName = 'Uncategorized'

            if (subj && subj.chapters && chapId !== 'uncategorized') {
                const foundChapter = subj.chapters.find((c) => String(c._id) === chapId)
                if (foundChapter) {
                    if (topId !== 'uncategorized' && foundChapter.topics) {
                        const foundTopic = foundChapter.topics.find((t) => String(t._id) === topId)
                        if (foundTopic) {
                            groupId = topId
                            groupType = 'topic'
                            groupName = foundTopic.name
                        }
                    }
                    if (!groupId) {
                        groupId = chapId
                        groupType = 'chapter'
                        groupName = foundChapter.name
                    }
                }
            }

            if (groupId) {
                if (!topicWise.has(groupId)) {
                    topicWise.set(groupId, {
                        id: groupId,
                        type: groupType,
                        name: groupName,
                        totalQuestions: 0,
                        attempted: 0,
                        correct: 0,
                        wrong: 0,
                        skipped: 0,
                        unattempted: 0,
                    })
                }
                const twStats = topicWise.get(groupId)
                twStats.totalQuestions++
                if (isAttempted) {
                    twStats.attempted++
                    if (isCorrect) twStats.correct++
                    else twStats.wrong++
                } else if (ans && ans.status === 'skipped') {
                    twStats.skipped++
                } else {
                    twStats.unattempted++
                }
            }

            for (const subj of subjectsToProcess) {
                const subjectId = subj?._id ? String(subj._id) : (subj ? String(subj) : 'uncategorized')
                const subjectName = subj?.name || 'Uncategorized'

                if (!sectionWise.has(subjectId)) {
                    sectionWise.set(subjectId, {
                        subject: { _id: subjectId === 'uncategorized' ? null : subjectId, name: subjectName },
                        score: 0,
                        totalMarks: 0,
                        attempted: 0,
                        totalQuestions: 0,
                        correct: 0,
                        wrong: 0,
                        skipped: 0,
                        unattempted: 0,
                        chapters: new Map()
                    })
                }
                const sec = sectionWise.get(subjectId)
                sec.totalQuestions++
                sec.totalMarks += marksPerQuestion
                if (isAttempted) {
                    sec.attempted++
                    if (isCorrect) sec.correct++
                    else sec.wrong++
                    sec.score += marksObtained
                } else if (ans && ans.status === 'skipped') {
                    sec.skipped++
                } else {
                    sec.unattempted++
                }

                for (const chap of chaptersToProcess) {
                    const chapterId = String(chap)
                    let chapterName = 'Uncategorized'
                    if (subj && subj.chapters && chapterId !== 'uncategorized') {
                        const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId)
                        if (foundChapter) chapterName = foundChapter.name
                    }

                    if (!sec.chapters.has(chapterId)) {
                        sec.chapters.set(chapterId, {
                            chapter: { _id: chapterId === 'uncategorized' ? null : chapterId, name: chapterName },
                            score: 0,
                            totalMarks: 0,
                            attempted: 0,
                            totalQuestions: 0,
                            correct: 0,
                            wrong: 0,
                            skipped: 0,
                            unattempted: 0,
                            topics: new Map()
                        })
                    }
                    const chapStats = sec.chapters.get(chapterId)
                    chapStats.totalQuestions++
                    chapStats.totalMarks += marksPerQuestion
                    if (isAttempted) {
                        chapStats.attempted++
                        if (isCorrect) chapStats.correct++
                        else chapStats.wrong++
                        chapStats.score += marksObtained
                    } else if (ans && ans.status === 'skipped') {
                        chapStats.skipped++
                    } else {
                        chapStats.unattempted++
                    }

                    for (const top of topicsToProcess) {
                        const topicId = String(top)
                        let topicName = 'Uncategorized'
                        if (subj && subj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
                            const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId)
                            if (foundChapter && foundChapter.topics) {
                                const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId)
                                if (foundTopic) topicName = foundTopic.name
                            }
                        }

                        if (!chapStats.topics.has(topicId)) {
                            chapStats.topics.set(topicId, {
                                topic: { _id: topicId === 'uncategorized' ? null : topicId, name: topicName },
                                score: 0,
                                totalMarks: 0,
                                attempted: 0,
                                totalQuestions: 0,
                                correct: 0,
                                wrong: 0,
                                skipped: 0,
                                unattempted: 0,
                            })
                        }
                        const topStats = chapStats.topics.get(topicId)
                        topStats.totalQuestions++
                        topStats.totalMarks += marksPerQuestion
                        if (isAttempted) {
                            topStats.attempted++
                            if (isCorrect) topStats.correct++
                            else topStats.wrong++
                            topStats.score += marksObtained
                        } else if (ans && ans.status === 'skipped') {
                            topStats.skipped++
                        } else {
                            topStats.unattempted++
                        }
                    }
                }
            }
        }

        const sectionWisePerformance = Array.from(sectionWise.values()).map(sec => ({
            subject: sec.subject,
            score: sec.score,
            totalMarks: sec.totalMarks,
            attempted: sec.attempted,
            totalQuestions: sec.totalQuestions,
            correct: sec.correct,
            wrong: sec.wrong,
            skipped: sec.skipped,
            unattempted: sec.unattempted,
            accuracy: sec.attempted > 0 ? parseFloat(((sec.correct / sec.attempted) * 100).toFixed(2)) : 0,
            chapters: Array.from(sec.chapters.values()).map(chap => {
                const hasRealTopics = Array.from(chap.topics.values()).some(t => t.topic._id !== null)
                return {
                    chapter: chap.chapter,
                    score: chap.score,
                    totalMarks: chap.totalMarks,
                    attempted: chap.attempted,
                    totalQuestions: chap.totalQuestions,
                    correct: chap.correct,
                    wrong: chap.wrong,
                    skipped: chap.skipped,
                    unattempted: chap.unattempted,
                    ...(hasRealTopics ? {} : { isWeak: chap.totalQuestions > 0 ? (chap.correct / chap.totalQuestions) < 0.5 : false }),
                    percentage: chap.totalMarks > 0 ? parseFloat(((Math.max(0, chap.score) / chap.totalMarks) * 100).toFixed(2)) : 0,
                    topics: Array.from(chap.topics.values()).map(top => ({
                        topic: top.topic,
                        score: top.score,
                        totalMarks: top.totalMarks,
                        attempted: top.attempted,
                        totalQuestions: top.totalQuestions,
                        correct: top.correct,
                        wrong: top.wrong,
                        skipped: top.skipped,
                        unattempted: top.unattempted,
                        isWeak: top.totalQuestions > 0 ? (top.correct / top.totalQuestions) < 0.5 : false,
                        percentage: top.totalMarks > 0 ? parseFloat(((Math.max(0, top.score) / top.totalMarks) * 100).toFixed(2)) : 0
                    }))
                }
            })
        }))

        const percentile = totalParticipants > 1
            ? parseFloat((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(2))
            : 100.0

        let expertComment = "Keep practicing!"
        if (percentile >= 90) expertComment = "Excellent Work! You have high chances of getting selected."
        else if (percentile >= 75) expertComment = "Well Done! Good performance."

        const topicAnalytics = Array.from(topicWise.values()).map(tw => ({
            id: tw.id,
            type: tw.type,
            name: tw.name,
            totalQuestions: tw.totalQuestions,
            attempted: tw.attempted,
            correct: tw.correct,
            wrong: tw.wrong,
            skipped: tw.skipped,
            unattempted: tw.unattempted,
            accuracy: tw.attempted > 0 ? parseFloat(((tw.correct / tw.attempted) * 100).toFixed(2)) : 0,
            isWeak: tw.totalQuestions > 0 ? (tw.correct / tw.totalQuestions) < 0.5 : false
        }))

        return {
            expertComment,
            overallPerformance: {
                score: attempt.score,
                totalMarks: attempt.totalMarks,
                rank,
                totalParticipants,
                accuracy: attempt.accuracy,
                percentile,
                attempted: attempt.correct + attempt.wrong,
                totalQuestions: liveTest.totalQuestions,
                timeSpent: attempt.timeTaken ? parseFloat((attempt.timeTaken / 60).toFixed(2)) : 0
            },
            sectionWisePerformance,
            topicAnalytics,
            sessionId: attempt.sessionId,
            status: attempt.status,
            correct: attempt.correct,
            wrong: attempt.wrong,
            skipped: attempt.skipped,
            unattempted: attempt.unattempted,
            passingMarks: Number(liveTest.passingMarks || 0),
            isPassed: attempt.score >= Number(liveTest.passingMarks || 0),
            rank,
            totalParticipants,
        }
    }

    async getSessionSolution(liveTestId, sessionId, userId) {
        const liveTest = await this.repository.getLiveTestById(liveTestId)
        if (!liveTest || liveTest.isDeleted || liveTest.status !== 'active') {
            throw new AppError('Live test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const questions = await Question.find({
            test: liveTestId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime en hi exam subExams subjectId chapterId topicId')
            .populate('subjectId', 'name chapters')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        const answersByQuestionId = {}
        for (const ans of (attempt.answers || [])) {
            if (ans && ans.questionId) {
                answersByQuestionId[ans.questionId.toString()] = ans
            }
        }

        const groupedQuestions = {}
        for (const q of questions) {
            const orderKey = String(q.order)
            if (!groupedQuestions[orderKey]) groupedQuestions[orderKey] = { en: {}, hi: {} }

            let langs = []
            if (q.en && (q.en.question?.text || q.en.options?.length)) langs.push('en')
            if (q.hi && (q.hi.question?.text || q.hi.options?.length)) langs.push('hi')
            if (langs.length === 0) {
                langs = q.language === 'both' ? ['en', 'hi'] : [q.language || 'en']
            }

            const userAnswer = answersByQuestionId[q._id.toString()] || null

            let subjectData = null
            let chapterData = null
            let topicData = null

            if (q.subjectId && typeof q.subjectId === 'object') {
                subjectData = { _id: q.subjectId._id, name: q.subjectId.name }
                if (q.chapterId && Array.isArray(q.subjectId.chapters)) {
                    const chapter = q.subjectId.chapters.find(c => String(c._id) === String(q.chapterId))
                    if (chapter) {
                        chapterData = { _id: chapter._id, name: chapter.name }
                        if (q.topicId && Array.isArray(chapter.topics)) {
                            const topic = chapter.topics.find(t => String(t._id) === String(q.topicId))
                            if (topic) {
                                topicData = { _id: topic._id, name: topic.name }
                            }
                        }
                    }
                }
            }

            for (const lang of langs) {
                if (lang !== 'en' && lang !== 'hi') continue

                const langObj = q[lang] || {}
                const questionData = langObj.question || q.question || {}
                const explanationData = langObj.explanation || q.explanation || {}
                const optionsData = (langObj.options && langObj.options.length > 0) ? langObj.options : (q.options || [])

                const correctIndex = optionsData.findIndex(opt => opt && opt.isCorrect)
                const isAttempted = !!(userAnswer && userAnswer.status !== 'skipped' && userAnswer.selectedOption !== null && userAnswer.selectedOption !== undefined)
                const isCorrect = isAttempted && correctIndex !== -1 ? (userAnswer.selectedOption === correctIndex) : false

                groupedQuestions[orderKey][lang] = {
                    _id: q._id,
                    exam: q.exam || null,
                    subExams: q.subExams || [],
                    subject: subjectData,
                    chapter: chapterData,
                    topic: topicData,
                    question: { text: htmlToPlainText(questionData.text || ''), image: questionData.image || '' },
                    options: optionsData.map((opt) => ({
                        text: htmlToPlainText(opt.text || ''),
                        image: opt.image || '',
                        isCorrect: !!opt.isCorrect,
                    })),
                    explanation: { text: htmlToPlainText(explanationData.text || ''), image: explanationData.image || '' },
                    order: q.order,
                    sortOrder: q.sortOrder,
                    perQuestionTime: q.perQuestionTime,
                    userAnswer: userAnswer ? {
                        selectedOption: userAnswer.selectedOption,
                        status: userAnswer.status,
                        timeTaken: userAnswer.timeTaken,
                    } : null,
                    status: userAnswer?.status || 'unattempted',
                    timeTaken: userAnswer?.timeTaken || 0,
                    isCorrect,
                }
            }
        }

        return Object.values(groupedQuestions)
    }

    async listMyAttempts(userId, query = {}) {
        const filter = {}
        if (query.liveTestId) filter.liveTest = query.liveTestId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }
}

module.exports = new LiveTestService()
