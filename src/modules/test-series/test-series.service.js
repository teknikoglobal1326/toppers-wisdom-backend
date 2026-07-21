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

    async listSeries(userId, query = {}) {
        const user = await User.findById(userId).select('subExams language').lean()
        const subExamIds = (user?.subExams || []).map((item) => item._id)

        const filter = { isDeleted: false, status: query.status || 'active' }
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

        if (!query.subExamId && subExamIds.length) {
            clauses.push({
                $or: [
                    { subExams: { $exists: false } },
                    { subExams: { $size: 0 } },
                    { subExams: { $in: subExamIds } },
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
        const [testCounts, attemptCounts] = await Promise.all([
            this.repository.getTestCountsBySeries(seriesIds),
            this.repository.getAttemptCountsBySeries(userId, seriesIds),
        ])

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = !item.isPaid
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

        const hasAccess = !series.isPaid
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
        const [questionCounts, latestAttempts] = await Promise.all([
            this.repository.getQuestionCountsByTestIds(testIds),
            this.repository.getLatestAttemptsByTestIds(userId, testIds),
        ])

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = !item.isPaid
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

    async getTestInstructions(testId, userId) {
        const test = await require('../../models/TestSeriesTest.model').findOne({ _id: testId, isDeleted: false })
            .select('testSeries title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks instructions localizedContent')
            .lean()

        if (!test) {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        return {
            test: {
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
                localizedContent: test.localizedContent
            },
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

        const hasAccess = !test.isPaid
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const groupedQuestions = groupQuestionsBySubject(questions)

        this.logger.info({ userId, testId, count: questions.length }, 'Starting test-series test')

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

        const hasAccess = !test.isPaid
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

        try {
            await rewardsService.logActivity(userId, 'mock_test');
        } catch (err) {
            this.logger.error({ err, userId, testId }, 'Error auto-logging streak activity in submitTest');
        }

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
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.testSeries)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Test series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = !test.isPaid
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const sessionId = crypto.randomUUID()

        // Ensure totalMarks is calculated
        const totalQuestions = new Set(questions.map(q => q.order)).size
        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))

        const attempt = await this.repository.createAttempt({
            user: userId,
            testSeries: series._id,
            test: test._id,
            sessionId,
            totalTime: test.duration * 60, // Assuming duration is in minutes
            totalMarks,
            status: 'started',
            answers: []
        })

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

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const { rank, totalParticipants } = await this.repository.getAttemptRank(testId, attempt.score || 0, attempt.timeTaken || 0)

        const questions = await this.repository.findQuestionsForTest(testId)
        const userAnswers = attempt.answers || []

        const sectionWise = new Map()

        // Initialize question mapping
        const marksPerQuestion = Number(test.marksPerQuestion || 1)
        const negativeMarks = Number(test.negativeMarks || 0)

        // Only process unique logical questions (by order)
        const processedOrders = new Set()

        for (const q of questions) {
            if (processedOrders.has(q.order)) continue
            processedOrders.add(q.order)

            const subjectId = q.subjectId?._id ? String(q.subjectId._id) : (q.subjectId ? String(q.subjectId) : 'uncategorized')
            const subjectName = q.subjectId?.name || 'Uncategorized'
            const chapterId = q.chapterId?._id ? String(q.chapterId._id) : (q.chapterId ? String(q.chapterId) : 'uncategorized')
            const chapterName = q.chapterId?.name || 'Uncategorized'
            const topicId = q.topicId?._id ? String(q.topicId._id) : (q.topicId ? String(q.topicId) : 'uncategorized')
            const topicName = q.topicId?.name || 'Uncategorized'

            if (!sectionWise.has(subjectId)) {
                sectionWise.set(subjectId, {
                    subject: { _id: subjectId === 'uncategorized' ? null : subjectId, name: subjectName },
                    score: 0,
                    totalMarks: 0,
                    attempted: 0,
                    totalQuestions: 0,
                    correct: 0,
                    chapters: new Map()
                })
            }
            const sec = sectionWise.get(subjectId)
            sec.totalQuestions++
            sec.totalMarks += marksPerQuestion

            if (!sec.chapters.has(chapterId)) {
                sec.chapters.set(chapterId, {
                    chapter: { _id: chapterId === 'uncategorized' ? null : chapterId, name: chapterName },
                    score: 0,
                    totalMarks: 0,
                    topics: new Map()
                })
            }
            const chap = sec.chapters.get(chapterId)
            chap.totalMarks += marksPerQuestion

            if (!chap.topics.has(topicId)) {
                chap.topics.set(topicId, {
                    topic: { _id: topicId === 'uncategorized' ? null : topicId, name: topicName },
                    score: 0,
                    totalMarks: 0,
                })
            }
            const top = chap.topics.get(topicId)
            top.totalMarks += marksPerQuestion

            // Find user's answer for this logical question
            // The user answer could be against the 'en' or 'hi' question ID. We must find the answer 
            // that matches any question ID of this order.
            const siblingQuestionIds = questions.filter(sq => sq.order === q.order).map(sq => String(sq._id))
            const ans = userAnswers.find(a => siblingQuestionIds.includes(String(a.questionId)))
            
            if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
                sec.attempted++
                
                // Which specific question ID was answered?
                const answeredQ = questions.find(sq => String(sq._id) === String(ans.questionId))
                const correctIndex = answeredQ ? (answeredQ.options || []).findIndex(opt => opt.isCorrect) : -1
                
                let marksObtained = 0
                if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
                    sec.correct++
                    marksObtained = marksPerQuestion
                } else {
                    marksObtained = -negativeMarks
                }

                sec.score += marksObtained
                chap.score += marksObtained
                top.score += marksObtained
            }
        }

        const sectionWisePerformance = Array.from(sectionWise.values()).map(sec => ({
            subject: sec.subject,
            score: sec.score,
            totalMarks: sec.totalMarks,
            attempted: sec.attempted,
            totalQuestions: sec.totalQuestions,
            accuracy: sec.attempted > 0 ? parseFloat(((sec.correct / sec.attempted) * 100).toFixed(2)) : 0,
            chapters: Array.from(sec.chapters.values()).map(chap => ({
                chapter: chap.chapter,
                percentage: chap.totalMarks > 0 ? parseFloat(((Math.max(0, chap.score) / chap.totalMarks) * 100).toFixed(2)) : 0,
                topics: Array.from(chap.topics.values()).map(top => ({
                    topic: top.topic,
                    percentage: top.totalMarks > 0 ? parseFloat(((Math.max(0, top.score) / top.totalMarks) * 100).toFixed(2)) : 0,
                    score: top.score
                }))
            }))
        }))

        const percentile = totalParticipants > 1 
            ? parseFloat((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(2)) 
            : 100.0;

        let expertComment = "Keep practicing!";
        if (percentile >= 90) expertComment = "Excellent Work! You have high chances of getting selected.";
        else if (percentile >= 75) expertComment = "Well Done! Good performance.";

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
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        // Pre-calculate user answers mapped by question order
        const answersByOrder = {}
        for (const ans of (attempt.answers || [])) {
            const q = questions.find(question => question._id.toString() === ans.questionId.toString())
            if (q) {
                const correctIndex = q.options.findIndex(opt => opt.isCorrect)
                const isCorrect = ans.selectedOption === correctIndex
                answersByOrder[q.order] = {
                    ...ans,
                    isCorrect
                }
            }
        }

        // We use the same grouping but now they include isCorrect and explanation natively.
        const groupedQuestions = {}
        for (const q of questions) {
            const orderKey = String(q.order)
            if (!groupedQuestions[orderKey]) groupedQuestions[orderKey] = { en: {}, hi: {} }
            const langs = q.language === 'both' ? ['en', 'hi'] : [q.language]

            for (const lang of langs) {
                if (lang !== 'en' && lang !== 'hi') continue
                groupedQuestions[orderKey][lang] = {
                    _id: q._id,
                    question: { text: htmlToPlainText(q.question?.text), image: q.question?.image },
                    // Includes isCorrect here! Editor HTML converted to plain text.
                    options: (q.options || []).map((opt) => ({
                        text: htmlToPlainText(opt.text),
                        image: opt.image,
                        isCorrect: opt.isCorrect,
                    })),
                    explanation: { text: htmlToPlainText(q.explanation?.text), image: q.explanation?.image },
                    order: q.order,
                    sortOrder: q.sortOrder,
                    perQuestionTime: q.perQuestionTime,
                    status,
                    timeTaken,
                    isCorrect
                }
            }
        }

        // Return just the list of questions to simplify the response
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
