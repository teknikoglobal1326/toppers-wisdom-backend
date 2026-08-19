const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const crypto = require('crypto')
const { groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const mathRepository = require('./math.repository')

class MathService extends BaseService {
    constructor() {
        super(mathRepository, 'math')
        this.logger = createLogger('math:service')
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
                    itemType: 'math',
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
                        moduleType: 'Math',
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
        })

        const seriesIds = result.data.map(item => item._id.toString())
        const [testCounts, attemptCounts] = await Promise.all([
            this.repository.getTestCountsBySeries(seriesIds),
            this.repository.getAttemptCountsBySeries(userId, seriesIds)
        ])

        result.data = result.data.map(item => {
            const itemObj = item.toObject ? item.toObject() : item
            const idStr = itemObj._id.toString()
            return {
                ...itemObj,
                totalTests: testCounts[idStr] || 0,
                attemptedCount: attemptCounts[idStr] || 0,
            }
        })

        return result
    }

    async getSeries(id, userId) {
        const series = await this.repository.getSeriesById(id)
        if (!series) throw new AppError('Math series not found', 404, 'NOT_FOUND')

        const hasAccess = await this.checkUserAccess(series, null, userId)
        return {
            ...series.toObject(),
            hasAccess
        }
    }

    async listSeriesTests(seriesId, userId, query = {}) {
        const series = await this.repository.getSeriesById(seriesId)
        if (!series) throw new AppError('Math series not found', 404, 'NOT_FOUND')

        const hasAccess = await this.checkUserAccess(series, null, userId)

        const filter = { math: seriesId, isDeleted: false, status: query.status || 'active' }
        if (query.subjectId) filter.subjectIds = query.subjectId
        if (query.chapterId) filter.chapterIds = query.chapterId
        if (query.topicId) filter.topicIds = query.topicId

        if (query.q) {
            filter.title = { $regex: query.q, $options: 'i' }
        }

        const direction = query.order === 'asc' ? 1 : -1
        const sort = query.sortBy === 'title'
            ? { title: direction, createdAt: -1 }
            : query.sortBy === 'duration'
            ? { duration: direction, createdAt: -1 }
            : query.sortBy === 'totalQuestions'
            ? { totalQuestions: direction, createdAt: -1 }
            : { createdAt: direction }

        const paginatedTests = await this.repository.listSeriesTests(filter, {
            page: query.page,
            limit: query.limit,
            sort,
        })

        const testIds = paginatedTests.data.map(t => t._id)
        const [questionCounts, latestAttempts] = await Promise.all([
            this.repository.getQuestionCountsByTestIds(testIds),
            this.repository.getLatestAttemptsByTestIds(userId, testIds),
        ])

        paginatedTests.data = paginatedTests.data.map(testDoc => {
            const test = testDoc.toObject ? testDoc.toObject() : testDoc
            const testIdStr = test._id.toString()
            const attemptsInfo = latestAttempts[testIdStr] || null
            const hasTestAccess = hasAccess || !test.isPaid

            return {
                ...test,
                hasAccess: hasTestAccess,
                totalQuestions: questionCounts[testIdStr] || test.totalQuestions || 0,
                attemptsCount: attemptsInfo?.attemptsCount || 0,
                latestAttempt: attemptsInfo ? {
                    attemptedAt: attemptsInfo.latestAttemptedAt,
                    score: attemptsInfo.latestScore,
                    bestScore: attemptsInfo.bestScore,
                    sessionId: attemptsInfo.sessionId
                } : null,
            }
        })

        return paginatedTests
    }

    async getTestInstructions(testId, userId, language = 'hi') {
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const series = await this.repository.getSeriesById(test.math)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Math series not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await this.checkUserAccess(series, test, userId)

        const title = test.localizedContent?.[language]?.title || test.title
        const rawDesc = test.localizedContent?.[language]?.description || test.description || ''
        const descText = htmlToPlainText(rawDesc)

        const rawInstructions = test.localizedContent?.[language]?.instructions || test.instructionsNew || test.instructions || ''
        const instructionBlocks = htmlToPlainText(rawInstructions)
            .split('\n')
            .map(str => str.trim())
            .filter(Boolean)

        return {
            hasAccess,
            instructions: instructionBlocks,
            test: {
                _id: test._id,
                title,
                description: descText,
                duration: test.duration,
                totalQuestions: test.totalQuestions,
                totalMarks: test.totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
                languages: test.languages || ['en'],
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

        const series = await this.repository.getSeriesById(test.math)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Math series not found', 404, 'NOT_FOUND')
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

        const series = await this.repository.getSeriesById(test.math)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Math series not found', 404, 'NOT_FOUND')
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
            math: series._id,
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

        this.logger.info({ userId, testId, score, accuracy }, 'Submitted math test')

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

        const series = await this.repository.getSeriesById(test.math)
        if (!series || series.isDeleted || series.status !== 'active') {
            throw new AppError('Math series not found', 404, 'NOT_FOUND')
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
            const MathAttempt = require('../../models/MathAttempt.model')
            attempt = await MathAttempt.findOne({
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
                math: series._id,
                test: test._id,
                sessionId,
                totalTime: test.duration * 60,
                totalMarks,
                status: 'started',
                answers: []
            })
        }

        const groupedQuestions = groupQuestionsBySubject(questions)

        return {
            sessionId,
            totalTime: attempt.totalTime,
            timeTaken: attempt.timeTaken || 0,
            answers: attempt.answers || [],
            status: attempt.status,
            questionsBySubject: groupedQuestions,
            test: {
                _id: test._id,
                title: test.title,
                duration: test.duration,
                isPerQuestionTime: test.isPerQuestionTime !== false,
                totalQuestions,
                totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
            }
        }
    }

    async updateSession(testId, sessionId, userId, payload = {}) {
        const test = await this.repository.getSeriesTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) throw new AppError('Attempt session not found', 404)
        if (attempt.status === 'completed') throw new AppError('Test already completed', 400)

        const questions = await this.repository.findQuestionsForTest(testId)

        const updateData = {}
        if (payload.answers) updateData.answers = payload.answers
        if (payload.timeTaken !== undefined) updateData.timeTaken = payload.timeTaken
        if (payload.status) updateData.status = payload.status

        if (payload.status === 'completed') {
            const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, payload.answers || attempt.answers, test)
            updateData.score = score
            updateData.correct = correct
            updateData.wrong = wrong
            updateData.skipped = skipped
            updateData.unattempted = unattempted
            updateData.accuracy = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 100).toFixed(2)) : 0
        }

        const updated = await this.repository.updateAttemptBySession(sessionId, userId, updateData)

        return {
            sessionId: updated.sessionId,
            status: updated.status,
            timeTaken: updated.timeTaken,
            score: updated.score,
            accuracy: updated.accuracy,
            correct: updated.correct,
            wrong: updated.wrong,
            skipped: updated.skipped,
            unattempted: updated.unattempted,
        }
    }

    async getSessionAnalytics(testId, sessionId, userId) {
        const test = await this.repository.getSeriesTestById(testId)
        if (!test) throw new AppError('Test not found', 404, 'NOT_FOUND')

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) throw new AppError('Attempt session not found', 404)

        const { rank, totalParticipants } = await this.repository.getAttemptRank(testId, attempt.score, attempt.timeTaken)

        const rightMarks = Number(test.marksPerQuestion || 1) * (attempt.correct || 0)
        const wrongMarks = Number(test.negativeMarks || 0) * (attempt.wrong || 0)

        const totalQuestions = attempt.correct + attempt.wrong + attempt.skipped + attempt.unattempted

        return {
            rank: rank || 1,
            totalParticipants: totalParticipants || 1,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            accuracy: attempt.accuracy || 0,
            timeTaken: attempt.timeTaken || 0,
            totalTime: attempt.totalTime || 0,
            correct: attempt.correct || 0,
            wrong: attempt.wrong || 0,
            skipped: attempt.skipped || 0,
            unattempted: attempt.unattempted || 0,
            rightMarks,
            wrongMarks,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: attempt.score >= Number(test.passingMarks || 0),
            totalQuestions
        }
    }

    async getSessionSolution(testId, sessionId, userId) {
        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) throw new AppError('Attempt session not found', 404)

        const questions = await Question.find({ test: testId, isDeleted: false, status: 'active' })
            .select('en hi order sortOrder perQuestionTime subjectId chapterId topicId')
            .populate('subjectId', 'name chapters')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        const userAnswersMap = new Map(attempt.answers.map(ans => [ans.questionId.toString(), ans]))

        const solvedQuestions = questions.map(q => {
            const userAns = userAnswersMap.get(q._id.toString())
            return {
                ...q,
                userSelectedOption: userAns ? userAns.selectedOption : null,
                userStatus: userAns ? userAns.status : 'unattempted',
                timeTaken: userAns ? userAns.timeTaken : 0,
            }
        })

        return {
            questions: groupQuestionsBySubject(solvedQuestions)
        }
    }

    async listMyAttempts(userId, query = {}) {
        const filter = {}
        if (query.mathId) filter.math = query.mathId
        if (query.testId) filter.test = query.testId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }
}

module.exports = new MathService()
