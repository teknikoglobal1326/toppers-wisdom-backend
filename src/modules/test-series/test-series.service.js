const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const crypto = require('crypto')
const { groupQuestionsByLanguage, groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const testSeriesRepository = require('./test-series.repository')
const rewardsService = require('../rewards/rewards.service')


class TestSeriesService extends BaseService {
    constructor() {
        super(testSeriesRepository, 'test-series')
        this.logger = createLogger('test-series:service')
    }

    async checkUserAccess(series, test, userId) {
        if (test && !test.isPaid) return true
        if (series && !series.isPaid) return true

        const CourseOrder = require('../../models/CourseOrder.model')
        const directPurchase = await CourseOrder.findOne({
            user: userId,
            status: 'paid',
            items: {
                $elemMatch: {
                    itemType: 'test',
                    itemId: series._id
                }
            }
        }).lean()

        if (directPurchase) return true

        const UserSubscription = require('../../models/UserSubscription.model')
        const Subscription = require('../../models/Subscription.model')

        const activeUserSubs = await UserSubscription.find({
            user: userId,
            isActive: true,
            endDate: { $gte: new Date() }
        }).select('subscription').lean()

        const activeSubIds = activeUserSubs.map(us => us.subscription.toString())

        if (activeSubIds.length > 0) {
            const count = await Subscription.countDocuments({
                _id: { $in: activeSubIds },
                isActive: true,
                isDeleted: false,
                'tests': {
                    $elemMatch: {
                        moduleType: 'TestSeries',
                        moduleId: series._id
                    }
                }
            })
            if (count > 0) return true
        }

        return false
    }

    async listSeries(userId, query = {}) {
        const user = await User.findById(userId).select('exam subExams language').lean()
        const subExamIds = (user?.subExams || []).map((item) => item._id)
        const examId = user?.exam?._id || (typeof user?.exam === 'object' ? user?.exam?._id : user?.exam)

        const filter = { isDeleted: false, status: query.status || 'active' }
        if (query.examId) {
            filter.exam = query.examId
        } else if (examId) {
            filter.exam = examId
        }
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

        const result = await this.repository.listSeries(filter, {
            page: query.page,
            limit: query.limit,
            sort,
            select: 'title description thumbnail exam subExams subjectIds isPaid status createdAt',
            populate: [{ path: 'exam' }, { path: 'subExams' }, { path: 'subjectIds', select: 'name' }],
        })

        const seriesIds = result.data.map((item) => item._id)

        const UserSubscription = require('../../models/UserSubscription.model')
        const Subscription = require('../../models/Subscription.model')
        const CourseOrder = require('../../models/CourseOrder.model')

        const [directOrders, activeUserSubs] = await Promise.all([
            CourseOrder.find({
                user: userId,
                status: 'paid',
                'items.itemType': 'test'
            }).select('items.itemId').lean(),
            UserSubscription.find({
                user: userId,
                isActive: true,
                endDate: { $gte: new Date() }
            }).select('subscription').lean()
        ])

        const accessedSeriesIds = new Set()
        for (const order of directOrders) {
            for (const item of order.items || []) {
                if (item.itemType === 'test' && item.itemId) {
                    accessedSeriesIds.add(item.itemId.toString())
                }
            }
        }

        const activeSubIds = activeUserSubs.map(us => us.subscription.toString())

        if (activeSubIds.length > 0) {
            const subscriptions = await Subscription.find({
                _id: { $in: activeSubIds },
                isActive: true,
                isDeleted: false
            }).select('tests').lean()

            for (const sub of subscriptions) {
                for (const testItem of sub.tests || []) {
                    if (testItem.moduleType === 'TestSeries') {
                        for (const mid of testItem.moduleId || []) {
                            accessedSeriesIds.add(mid.toString())
                        }
                    }
                }
            }
        }

        const [testCounts, attemptCounts] = await Promise.all([
            this.repository.getTestCountsBySeries(seriesIds),
            this.repository.getAttemptCountsBySeries(userId, seriesIds),
        ])

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = !item.isPaid || accessedSeriesIds.has(id)
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

    async getSeries(seriesId, userId) {
        const series = await this.repository.getSeriesById(seriesId)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserAccess(series, null, userId)
        const testCounts = await this.repository.getTestCountsBySeries([series._id])

        return {
            ...series,
            description: htmlToPlainText(series.description),
            totalTests: testCounts[series._id.toString()] || 0,
            hasAccess,
            isLocked: !hasAccess,
        }
    }

    async listSeriesTests(seriesId, userId, query = {}) {
        const series = await this.repository.getSeriesById(seriesId)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const seriesHasAccess = await this.checkUserAccess(series, null, userId)

        const filter = {
            testSeries: seriesId,
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

        const result = await this.repository.listSeriesTests(filter, {
            page: query.page,
            limit: query.limit,
            sort,
        })

        const testIds = result.data.map((item) => item._id)
        const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
        const [questionCounts, latestAttempts, ongoingAttempts] = await Promise.all([
            this.repository.getQuestionCountsByTestIds(testIds),
            this.repository.getLatestAttemptsByTestIds(userId, testIds),
            TestSeriesAttempt.find({
                user: userId,
                test: { $in: testIds },
                status: { $in: ['started', 'ongoing'] }
            }).lean()
        ])

        const ongoingMap = new Map()
        ongoingAttempts.forEach(att => {
            ongoingMap.set(att.test.toString(), att)
        })

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = seriesHasAccess || !item.isPaid
            const attemptStats = latestAttempts[id]
            const ongoingSession = ongoingMap.get(id)

            return {
                ...item,
                description: htmlToPlainText(item.description),
                mappedQuestions: questionCounts[id] || 0,
                hasAccess,
                isLocked: !hasAccess,
                attemptStatus: ongoingSession ? 'paused' : (attemptStats ? 'attempted' : 'not_attempted'),
                latestAttempt: attemptStats || null,
                attemptCount: attemptStats ? attemptStats.attemptsCount : 0,
                pausedSession: ongoingSession ? {
                    sessionId: ongoingSession.sessionId,
                    status: ongoingSession.status,
                    timeTaken: ongoingSession.timeTaken,
                    createdAt: ongoingSession.createdAt,
                } : null
            }
        })
        console.log("result============>", result);
        return result
    }

    async getTestInstructions(testId, userId) {
        const test = await require('../../models/TestSeriesTest.model').findOne({ _id: testId, isDeleted: false })
            .select('testSeries title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks instructions instructionsNew localizedContent')
            .lean()

        if (!test) {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        return {
           
                _id: test._id,
                title: test.title,
                duration: test.duration,
                totalQuestions: test.totalQuestions,
                totalMarks: test.totalMarks,
                marksPerQuestion: test.marksPerQuestion,
                negativeMarks: test.negativeMarks,
                passingMarks: test.passingMarks,
                isPerQuestionTime: test.isPerQuestionTime,
                instructions: test.instructions,
                instructionsNew: test.instructionsNew,
                localizedContent: test.localizedContent,
            series: {
                _id: series._id,
                title: series.title,
                thumbnail: series.thumbnail,
            }
        }
    }

    async startTest(testId, userId, language = 'hi') {
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserAccess(series, test, userId)
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const groupedQuestions = groupQuestionsBySubject(questions)

        return {
            series: {
                _id: series._id,
                title: series.title,
                thumbnail: series.thumbnail,
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
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserAccess(series, test, userId)
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
            testSeries: series._id,
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

        this.logger.info({ userId, testId, score, accuracy }, 'Submitted test-series test')

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

    async startSession(testId, userId, language = 'hi', existingSessionId = null) {
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserAccess(series, test, userId)
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        let attempt = null
        let sessionId = existingSessionId

        if (sessionId) {
            attempt = await this.repository.getAttemptBySession(sessionId, userId)
        } else {
            // Check if user has an existing ongoing session for this test
            const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
            attempt = await TestSeriesAttempt.findOne({
                user: userId,
                test: testId,
                status: { $in: ['started', 'ongoing'] }
            })
            if (attempt) {
                sessionId = attempt.sessionId
            }
        }

        const totalQuestions = new Set(questions.map(q => q.order)).size
        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))

        if (!attempt) {
            sessionId = sessionId || crypto.randomUUID()
            attempt = await this.repository.createAttempt({
                user: userId,
                testSeries: series._id,
                test: test._id,
                sessionId,
                totalTime: test.duration * 60, // Assuming duration is in minutes
                totalMarks,
                status: 'started',
                answers: []
            })
        }

        const groupedQuestions = groupQuestionsBySubject(questions)
        return {
            sessionId,
            series: {
                _id: series._id,
                title: series.title,
                thumbnail: series.thumbnail,
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
            answers: attempt.answers || []
        }
    }


    async updateSession(testId, sessionId, userId, payload = {}) {
        const test = await this.repository.getSeriesTestById(testId)
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

        // Calculate total time taken from answers array
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
                await rewardsService.logActivity(userId, 'mock_test');
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
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        // Fetch the absolute latest attempt for this test and user
        const attempt = await require('../../models/TestSeriesAttempt.model').findOne({ test: testId, user: userId }).sort({ attemptedAt: -1 })
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
        const test = await this.repository.getSeriesTestById(testId)
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
        if (query.seriesId) filter.testSeries = query.seriesId
        if (query.testId) filter.test = query.testId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }

    async getUserDashboardStats(userId) {
        const stats = await this.repository.getUserOverallStats(userId)
        const totalAccessibleTests = await this.repository.getAccessibleTotalTests(userId)

        let overallRank = 0
        let totalAspirants = 0
        let topPercentile = 0

        if (stats.totalAttemptedTests > 0) {
            overallRank = await this.repository.getOverallPlatformRank(stats.totalScore, stats.timeSpent)
            totalAspirants = await this.repository.getTotalPlatformParticipants()

            if (totalAspirants > 0) {
                // If you are rank 1 out of 100, you are top 1%
                topPercentile = (overallRank / totalAspirants) * 100
                topPercentile = Math.round(topPercentile * 10) / 10 // Round to 1 decimal place
            }
        }

        const totalAttemptedQs = stats.totalCorrect + stats.totalWrong
        let accuracy = 0
        if (totalAttemptedQs > 0) {
            accuracy = (stats.totalCorrect / totalAttemptedQs) * 100
            accuracy = Math.round(accuracy * 10) / 10
        }

        const ongoingSessions = await this.repository.getOngoingSessions(userId)
        const completedSessions = await this.repository.getCompletedSessions(userId)

        return {
            totalAccessibleTests,
            totalAttemptedTests: stats.totalAttemptedTests,
            questionsSolved: totalAttemptedQs,
            timeSpent: stats.timeSpent,
            accuracy,
            overallRank,
            totalAspirants,
            topPercentile,
            ongoingSessions,
            completedSessions
        }
    }
}

module.exports = new TestSeriesService()
