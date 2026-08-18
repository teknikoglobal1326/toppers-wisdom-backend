const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const { groupQuestionsByLanguage, groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const crypto = require('crypto')
const { htmlToPlainText } = require('../../lib/htmlText')
const previousYearPaperRepository = require('./previous-year-paper.repository')
const rewardsService = require('../rewards/rewards.service')


class PreviousYearPaperService extends BaseService {
    constructor() {
        super(previousYearPaperRepository, 'previous-year-paper')
        this.logger = createLogger('previous-year-paper:service')
    }

    async getSubscribedPaperIds(userId) {
        const UserSubscription = require('../../models/UserSubscription.model')
        const Subscription = require('../../models/Subscription.model')

        const activeUserSubs = await UserSubscription.find({
            user: userId,
            isActive: true,
            endDate: { $gte: new Date() }
        }).select('subscription').lean()

        const activeSubIds = activeUserSubs.map(us => us.subscription.toString())
        const subscribedPaperIds = new Set()

        if (activeSubIds.length > 0) {
            const subs = await Subscription.find({
                _id: { $in: activeSubIds },
                isActive: true,
                isDeleted: false,
                'tests.moduleType': 'PreviousYearPaper'
            }).select('tests').lean()

            subs.forEach(sub => {
                if (sub.tests) {
                    sub.tests.forEach(testItem => {
                        if (testItem.moduleType === 'PreviousYearPaper' && testItem.moduleId) {
                            testItem.moduleId.forEach(mId => {
                                subscribedPaperIds.add(mId.toString())
                            })
                        }
                    })
                }
            })
        }
        return subscribedPaperIds
    }

    async checkUserTestAccess(previousYearPaper, test, userId) {
        if (!test.isPaid) return true
        if (previousYearPaper && !previousYearPaper.isPaid) return true

        const subscribedPaperIds = await this.getSubscribedPaperIds(userId)
        if (previousYearPaper && subscribedPaperIds.has(previousYearPaper._id.toString())) return true

        return false
    }

    async listPreviousYearPapers(userId, query = {}) {
        const user = await User.findById(userId).select('subExams language exam').lean()
        const subExamIds = (user?.subExams || []).map((item) => item._id)

        const filter = { isDeleted: false, status: query.status || 'active' }
        if (user && user.exam && user.exam._id) {
            filter.exam = user.exam._id
        }
        if (query.examId) filter.exam = query.examId
        if (query.subExamId) filter.subExams = query.subExamId
        if (query.subjectId) filter.subjectIds = query.subjectId
        const clauses = []
        if (query.q) {
            clauses.push({
                $or: [
                    { title: { $regex: query.q, $options: 'i' } },
                    { description: { $regex: query.q, $options: 'i' } },
                ],
            })
        }

        if (clauses.length === 1) Object.assign(filter, clauses[0])
        if (clauses.length > 1) filter.$and = clauses

        const direction = query.order === 'asc' ? 1 : -1
        const sort = query.sortBy === 'title'
            ? { title: direction, createdAt: -1 }
            : { createdAt: direction }

        // console.log("Listing Previous Year Papers with filter:", JSON.stringify(filter, null, 2))

        const result = await this.repository.listPreviousYearPapers(filter, {
            page: query.page,
            limit: query.limit,
            sort,
            select: 'title description thumbnail exam subExams subjectIds isPaid status createdAt',
            populate: [{ path: 'exam' }, { path: 'subExams' }, { path: 'subjectIds', select: 'name' }],
        })

        // console.log(`Found ${result.data.length} previous year papers`)

        const previousYearPaperIds = result.data.map((item) => item._id)
        const [testCounts, attemptCounts, subscribedPaperIds] = await Promise.all([
            this.repository.getTestCountsByPreviousYearPaper(previousYearPaperIds),
            this.repository.getAttemptCountsByPreviousYearPaper(userId, previousYearPaperIds),
            this.getSubscribedPaperIds(userId),
        ])

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = !item.isPaid || subscribedPaperIds.has(id)
            return {
                ...item,
                description: htmlToPlainText(item.description),
                totalTests: testCounts[id] || 0,
                totalAttempts: attemptCounts[id] || 0,
                hasAccess,
                isLocked: !hasAccess,
            }
        })

        return result
    }

    async getPreviousYearPaper(previousYearPaperId, userId) {
        const previousYearPaper = await this.repository.getPreviousYearPaperById(previousYearPaperId)
        console.log("previous", previousYearPaper);
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const subscribedPaperIds = await this.getSubscribedPaperIds(userId)
        const hasAccess = !previousYearPaper.isPaid || subscribedPaperIds.has(previousYearPaper._id.toString())
        const testCounts = await this.repository.getTestCountsByPreviousYearPaper([previousYearPaper._id])

        return {
            ...previousYearPaper,
            description: htmlToPlainText(previousYearPaper.description),
            totalTests: testCounts[previousYearPaper._id.toString()] || 0,
            hasAccess,
            isLocked: !hasAccess,
        }
    }

    async listPreviousYearPaperTests(previousYearPaperId, userId, query = {}) {
        const previousYearPaper = await this.repository.getPreviousYearPaperById(previousYearPaperId)
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const filter = {
            previousYearPaper: previousYearPaperId,
            isDeleted: false,
            status: query.status || 'active',
        }

        if (query.q) {
            filter.$or = [
                { title: { $regex: query.q, $options: 'i' } },
                { description: { $regex: query.q, $options: 'i' } },
            ]
        }

        if (query.subjectId) filter.subjectIds = query.subjectId
        if (query.chapterId) filter.chapterIds = query.chapterId
        if (query.topicId) filter.topicIds = query.topicId

        const direction = query.order === 'asc' ? 1 : -1
        const sortField = query.sortBy || 'createdAt'
        const sort = { [sortField]: direction, createdAt: -1 }

        const result = await this.repository.listPreviousYearPaperTests(filter, {
            page: query.page,
            limit: query.limit,
            sort,
        })

        const testIds = result.data.map((item) => item._id)
        const [questionCounts, latestAttempts, subscribedPaperIds] = await Promise.all([
            this.repository.getQuestionCountsByTestIds(testIds),
            this.repository.getLatestAttemptsByTestIds(userId, testIds),
            this.getSubscribedPaperIds(userId),
        ])

        const paperHasAccess = !previousYearPaper.isPaid || subscribedPaperIds.has(previousYearPaperId.toString())

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = paperHasAccess || !item.isPaid
            const attemptStats = latestAttempts[id]

            return {
                ...item,
                description: htmlToPlainText(item.description),
                mappedQuestions: questionCounts[id] || 0,
                hasAccess,
                isLocked: !hasAccess,
                attemptStatus: attemptStats ? 'attempted' : 'not_attempted',
                latestAttempt: attemptStats || null,
            }
        })

        return result
    }

    async startTest(testId, userId, language = 'hi') {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const previousYearPaper = await this.repository.getPreviousYearPaperById(test.previousYearPaper)
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserTestAccess(previousYearPaper, test, userId)
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const groupedQuestions = groupQuestionsBySubject(questions)

        this.logger.info({ userId, testId, count: questions.length }, 'Starting previous-year-paper test')

        return {
            previousYearPaper: {
                _id: previousYearPaper._id,
                title: previousYearPaper.title,
                thumbnail: previousYearPaper.thumbnail,
            },
            test: {
                _id: test._id,
                title: test.title,
                duration: test.duration,
                isPerQuestionTime: test.isPerQuestionTime !== false,
                totalQuestions: test.totalQuestions,
                totalMarks: test.totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
            },
            hasAccess,
            questionsBySubject: groupedQuestions,
        }
    }

    async submitTest(testId, userId, payload = {}, language = 'hi') {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const previousYearPaper = await this.repository.getPreviousYearPaperById(test.previousYearPaper)
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserTestAccess(previousYearPaper, test, userId)
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, payload.answers, test)

        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0
            ? parseFloat(((correct / totalQuestions) * 100).toFixed(2))
            : 0

        const attempt = await this.repository.createAttempt({
            user: userId,
            previousYearPaper: previousYearPaper._id,
            test: test._id,
            answers: payload.answers,
            score,
            totalMarks,
            accuracy,
            timeTaken: payload.timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
            status: 'completed',
        })

        this.logger.info({ userId, testId, score, accuracy }, 'Submitted previous-year-paper test')

        return {
            attemptId: attempt._id,
            score,
            totalMarks,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: score >= Number(test.passingMarks || 0),
            accuracy,
            correct,
            wrong,
            skipped,
            unattempted,
        }
    }

    async startSession(testId, userId, language = 'hi') {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const previousYearPaper = await this.repository.getPreviousYearPaperById(test.previousYearPaper)
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserTestAccess(previousYearPaper, test, userId)
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        /* eslint-disable no-console */
        const Question = require('../../models/Question.model')
        const rawQuestions = await Question.find({ test: testId }).lean()

        rawQuestions.forEach((q, idx) => {
            console.log(`[DIAGNOSTIC] Question #${idx + 1}:
               _id: ${q._id}
               order: ${q.order}
               sortOrder: ${q.sortOrder}
               status: ${q.status}
               isDeleted: ${q.isDeleted}
               subjectId: ${q.subjectId}
               chapterId: ${q.chapterId}
               topicId: ${q.topicId}
            `)
        })

        const questions = await this.repository.findQuestionsForTest(testId)
     
        /* eslint-enable no-console */

        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const sessionId = crypto.randomUUID()

        // Ensure totalMarks is calculated
        const totalQuestions = new Set(questions.map(q => q.groupId ? String(q.groupId) : String(q._id))).size
        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))

        const attempt = await this.repository.createAttempt({
            user: userId,
            previousYearPaper: previousYearPaper._id,
            test: test._id,
            sessionId,
            totalTime: test.duration * 60,
            totalMarks,
            status: 'started',
            answers: []
        })

        const groupedQuestions = groupQuestionsBySubject(questions)

        return {
            sessionId,
            previousYearPaper: {
                _id: previousYearPaper._id,
                title: previousYearPaper.title,
                thumbnail: previousYearPaper.thumbnail,
            },
            test: {
                _id: test._id,
                title: test.title,
                duration: test.duration,
                isPerQuestionTime: test.isPerQuestionTime !== false,
                totalQuestions: test.totalQuestions,
                totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
            },
            hasAccess,
            questionsBySubject: groupedQuestions,
        }
    }

    async updateSession(testId, sessionId, userId, payload = {}) {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
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

        const questions = await this.repository.findQuestionsForTest(testId)
        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, updatedAnswers, test)

        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0
            ? parseFloat(((correct / totalQuestions) * 100).toFixed(2))
            : 0

        const timeTaken = updatedAnswers.reduce((acc, ans) => acc + (ans.timeTaken || 0), 0)

        const status = payload.status || 'ongoing'

        const updatedAttempt = await this.repository.updateAttemptBySession(sessionId, userId, {
            answers: updatedAnswers,
            score,
            totalMarks,
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
            status,
        })

        if (status === 'completed') {
            try {
                await rewardsService.logActivity(userId, 'pyp_paper');
            } catch (err) {
                this.logger.error({ err, userId, testId }, 'Error auto-logging streak activity in updateSession');
            }
        }

        return {
            attemptId: updatedAttempt._id,
            sessionId,
            status,
            score,
            totalMarks,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: score >= Number(test.passingMarks || 0),
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
        }
    }

    async getSessionAnalytics(testId, sessionId, userId) {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const { rank, totalParticipants } = await this.repository.getAttemptRank(testId, attempt.score || 0, attempt.timeTaken || 0)

        const questions = await this.repository.findQuestionsForTest(testId)
        const userAnswers = attempt.answers || []

        const sectionWise = new Map()
        const topicWise = new Map()

        // Initialize question mapping
        const marksPerQuestion = Number(test.marksPerQuestion || 1)
        const negativeMarks = Number(test.negativeMarks || 0)

        for (const q of questions) {
            const ans = userAnswers.find(a => String(a.questionId) === String(q._id))

            let isAttempted = false
            let isCorrect = false
            let marksObtained = 0

            if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
                isAttempted = true

                let correctIndex = -1
                if (q.en?.options) correctIndex = q.en.options.findIndex(opt => opt.isCorrect)
                if (correctIndex === -1 && q.hi?.options) correctIndex = q.hi.options.findIndex(opt => opt.isCorrect)
                if (correctIndex === -1 && q.options) correctIndex = q.options.findIndex(opt => opt.isCorrect)

                if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
                    isCorrect = true
                    marksObtained = marksPerQuestion
                } else {
                    marksObtained = -negativeMarks
                }
            }

            const subjectsToProcess = q.subjectId ? [q.subjectId] : [null];
            const chaptersToProcess = q.chapterId ? [q.chapterId] : ['uncategorized'];
            const topicsToProcess = q.topicId ? [q.topicId] : ['uncategorized'];

            const subj = subjectsToProcess[0];
            const chapId = String(chaptersToProcess[0]);
            const topId = String(topicsToProcess[0]);

            let groupId = null;
            let groupType = null;
            let groupName = 'Uncategorized';

            if (subj && subj.chapters && chapId !== 'uncategorized') {
                const foundChapter = subj.chapters.find((c) => String(c._id) === chapId);
                if (foundChapter) {
                    if (topId !== 'uncategorized' && foundChapter.topics) {
                        const foundTopic = foundChapter.topics.find((t) => String(t._id) === topId);
                        if (foundTopic) {
                            groupId = topId;
                            groupType = 'topic';
                            groupName = foundTopic.name;
                        }
                    }
                    if (!groupId) {
                        groupId = chapId;
                        groupType = 'chapter';
                        groupName = foundChapter.name;
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
                    });
                }
                const twStats = topicWise.get(groupId);
                twStats.totalQuestions++;
                if (isAttempted) {
                    twStats.attempted++;
                    if (isCorrect) twStats.correct++;
                    else twStats.wrong++;
                } else if (ans && ans.status === 'skipped') {
                    twStats.skipped++;
                } else {
                    twStats.unattempted++;
                }
            }

            for (const subj of subjectsToProcess) {
                const subjectId = subj?._id ? String(subj._id) : (subj ? String(subj) : 'uncategorized');
                const subjectName = subj?.name || 'Uncategorized';

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
                    const chapterId = String(chap);
                    let chapterName = 'Uncategorized';
                    if (subj && subj.chapters && chapterId !== 'uncategorized') {
                        const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
                        if (foundChapter) chapterName = foundChapter.name;
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
                        const topicId = String(top);
                        let topicName = 'Uncategorized';
                        if (subj && subj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
                            const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
                            if (foundChapter && foundChapter.topics) {
                                const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId);
                                if (foundTopic) topicName = foundTopic.name;
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
                const hasRealTopics = Array.from(chap.topics.values()).some(t => t.topic._id !== null);
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
                };
            })
        }))

        const percentile = totalParticipants > 1
            ? parseFloat((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(2))
            : 100.0;

        let expertComment = "Keep practicing!";
        if (percentile >= 90) expertComment = "Excellent Work! You have high chances of getting selected.";
        else if (percentile >= 75) expertComment = "Well Done! Good performance.";

        const topicAnalytics = Array.from(topicWise.values()).map(tw => {
            const isWeak = tw.totalQuestions > 0 ? (tw.correct / tw.totalQuestions) < 0.5 : false;
            return {
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
                isWeak,
                is_week: isWeak
            };
        })

        return {
            expertComment,
            overallPerformance: {
                score: attempt.score,
                totalMarks: attempt.totalMarks,
                rank,
                accuracy: attempt.accuracy,
                percentile,
                attempted: attempt.correct + attempt.wrong,
                totalQuestions: test.totalQuestions,
                timeSpent: attempt.timeTaken ? parseFloat((attempt.timeTaken / 60).toFixed(2)) : 0
            },
            sectionWisePerformance,
            topicAnalytics,
            // Keeping backwards compatibility
            sessionId: attempt.sessionId,
            status: attempt.status,
            correct: attempt.correct,
            wrong: attempt.wrong,
            skipped: attempt.skipped,
            unattempted: attempt.unattempted,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: attempt.score >= Number(test.passingMarks || 0),
        }
    }

    async getSessionSolution(testId, sessionId, userId) {
        const test = await this.repository.getPreviousYearPaperTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        // Fetch questions with explanations
        const questions = await require('../../models/Question.model').find({
            test: testId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime en hi')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        // Map user answers by questionId for quick lookup
        const answersByQuestionId = {}
        for (const ans of (attempt.answers || [])) {
            if (ans && ans.questionId) {
                answersByQuestionId[ans.questionId.toString()] = ans
            }
        }

        const groupedQuestions = {}
        for (const q of questions) {
            const questionKey = String(q._id)
            if (!groupedQuestions[questionKey]) groupedQuestions[questionKey] = { en: {}, hi: {} }

            // Determine available languages
            let langs = []
            if (q.en && (q.en.question?.text || q.en.options?.length)) langs.push('en')
            if (q.hi && (q.hi.question?.text || q.hi.options?.length)) langs.push('hi')
            if (langs.length === 0) {
                langs = q.language === 'both' ? ['en', 'hi'] : [q.language || 'en']
            }

            const userAnswer = answersByQuestionId[q._id.toString()] || null

            for (const lang of langs) {
                if (lang !== 'en' && lang !== 'hi') continue

                const langObj = q[lang] || {}
                const questionData = langObj.question || q.question || {}
                const explanationData = langObj.explanation || q.explanation || {}
                const optionsData = (langObj.options && langObj.options.length > 0) ? langObj.options : (q.options || [])

                const correctIndex = optionsData.findIndex(opt => opt && opt.isCorrect)
                const isAttempted = !!(userAnswer && userAnswer.status !== 'skipped' && userAnswer.selectedOption !== null && userAnswer.selectedOption !== undefined)
                const isCorrect = isAttempted && correctIndex !== -1 ? (userAnswer.selectedOption === correctIndex) : false

                groupedQuestions[questionKey][lang] = {
                    _id: q._id,
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
        if (query.previousYearPaperId) filter.previousYearPaper = query.previousYearPaperId
        if (query.testId) filter.test = query.testId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }

    async getTestInstructions(testId, userId) {
        const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
        const test = await PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false }).lean()
        if (!test || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        return {
            testId: test._id,
            title: test.title,
            duration: test.duration,
            totalQuestions: test.totalQuestions,
            totalMarks: test.totalMarks,
            marksPerQuestion: test.marksPerQuestion,
            negativeMarks: test.negativeMarks,
            passingMarks: test.passingMarks,
            instructions: test.instructions,
            instructionsNew: test.instructionsNew,
            localizedContent: test.localizedContent || {}
        }
    }

    async getOverallUserStats(userId) {
        const mongoose = require('mongoose')
        const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
        const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')

        const totalTestsCount = await PreviousYearPaperTest.countDocuments({
            isDeleted: false,
            status: 'active'
        })

        // User's first attempts per test
        const userFirstAttempts = await PreviousYearPaperAttempt.aggregate([
            { 
                $match: { 
                    user: new mongoose.Types.ObjectId(userId), 
                    status: 'completed'
                } 
            },
            { $sort: { attemptedAt: 1 } },
            {
                $group: {
                    _id: '$test',
                    accuracy: { $first: '$accuracy' }
                }
            }
        ])

        const attemptedTestCount = userFirstAttempts.length
        const totalAccuracy = userFirstAttempts.reduce((acc, curr) => acc + (curr.accuracy || 0), 0)
        const averageAccuracy = attemptedTestCount > 0 ? parseFloat((totalAccuracy / attemptedTestCount).toFixed(2)) : 0

        // Overall ranking in the series based on sum of first attempts
        const userScores = await PreviousYearPaperAttempt.aggregate([
            { 
                $match: { 
                    status: 'completed'
                } 
            },
            { $sort: { attemptedAt: 1 } },
            {
                $group: {
                    _id: { user: '$user', test: '$test' },
                    firstScore: { $first: '$score' },
                    firstTimeTaken: { $first: '$timeTaken' }
                }
            },
            {
                $group: {
                    _id: '$_id.user',
                    totalScore: { $sum: '$firstScore' },
                    totalTime: { $sum: '$firstTimeTaken' }
                }
            },
            {
                $sort: { totalScore: -1, totalTime: 1 }
            }
        ])

        const rankIndex = userScores.findIndex(item => item._id.toString() === userId.toString())
        const rank = rankIndex !== -1 ? rankIndex + 1 : (attemptedTestCount > 0 ? userScores.length + 1 : 0)

        return {
            rank,
            attemptedCount: attemptedTestCount,
            totalTests: totalTestsCount,
            accuracy: averageAccuracy
        }
    }
}

module.exports = new PreviousYearPaperService()
