const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const previousYearPaperRepository = require('./previous-year-paper.repository')

class PreviousYearPaperService extends BaseService {
    constructor() {
        super(previousYearPaperRepository, 'previous-year-paper')
        this.logger = createLogger('previous-year-paper:service')
    }

    async listPreviousYearPapers(userId, query = {}) {
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

        const result = await this.repository.listPreviousYearPapers(filter, {
            page: query.page,
            limit: query.limit,
            sort,
            select: 'title description thumbnail exam subExams subjectIds isPaid status createdAt',
            populate: [{ path: 'exam' }, { path: 'subExams' }, { path: 'subjectIds', select: 'name' }],
        })

        const previousYearPaperIds = result.data.map((item) => item._id)
        const [testCounts, attemptCounts, purchasedIds] = await Promise.all([
            this.repository.getTestCountsByPreviousYearPaper(previousYearPaperIds),
            this.repository.getAttemptCountsByPreviousYearPaper(userId, previousYearPaperIds),
            this.repository.getPurchasedTestItemIds(userId),
        ])

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = !item.isPaid || purchasedIds.has(id)
            return {
                ...item,
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
        if (!previousYearPaper || previousYearPaper.isDeleted || previousYearPaper.status !== 'active') {
            throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
        }

        const purchasedIds = await this.repository.getPurchasedTestItemIds(userId)
        const hasAccess = !previousYearPaper.isPaid || purchasedIds.has(previousYearPaperId)
        const testCounts = await this.repository.getTestCountsByPreviousYearPaper([previousYearPaper._id])

        return {
            ...previousYearPaper,
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

        if (query.subjectId) filter.subjectId = query.subjectId
        if (query.topicId) filter.topicIds = query.topicId
        if (query.chapterTitle) filter.chapterTitles = query.chapterTitle

        const direction = query.order === 'asc' ? 1 : -1
        const sortField = query.sortBy || 'createdAt'
        const sort = { [sortField]: direction, createdAt: -1 }

        const result = await this.repository.listPreviousYearPaperTests(filter, {
            page: query.page,
            limit: query.limit,
            sort,
        })

        const testIds = result.data.map((item) => item._id)
        const [questionCounts, latestAttempts, purchasedIds] = await Promise.all([
            this.repository.getQuestionCountsByTestIds(testIds),
            this.repository.getLatestAttemptsByTestIds(userId, testIds),
            this.repository.getPurchasedTestItemIds(userId),
        ])

        const hasPreviousYearPaperAccess = !previousYearPaper.isPaid || purchasedIds.has(previousYearPaper._id.toString())

        result.data = result.data.map((item) => {
            const id = item._id.toString()
            const hasAccess = hasPreviousYearPaperAccess || !item.isPaid || purchasedIds.has(id)
            const attemptStats = latestAttempts[id]

            return {
                ...item,
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

        const purchasedIds = await this.repository.getPurchasedTestItemIds(userId)
        const hasAccess = !previousYearPaper.isPaid || !test.isPaid || purchasedIds.has(previousYearPaper._id.toString()) || purchasedIds.has(test._id.toString())
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId, language)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const sanitizedQuestions = questions.map((question) => ({
            _id: question._id,
            language: question.language,
            question: question.question,
            options: (question.options || []).map((option) => ({ text: option.text, image: option.image })),
            order: question.order,
            sortOrder: question.sortOrder,
        }))

        this.logger.info({ userId, testId, count: sanitizedQuestions.length }, 'Starting previous-year-paper test')

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
                totalQuestions: test.totalQuestions,
                totalMarks: test.totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
            },
            hasAccess,
            questions: sanitizedQuestions,
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

        const purchasedIds = await this.repository.getPurchasedTestItemIds(userId)
        const hasAccess = !previousYearPaper.isPaid || !test.isPaid || purchasedIds.has(previousYearPaper._id.toString()) || purchasedIds.has(test._id.toString())
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId, language)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const answerMap = new Map((payload.answers || []).map((item) => [item.questionId.toString(), item.selectedOption]))

        let score = 0
        let correct = 0
        let wrong = 0
        let unattempted = 0

        for (const question of questions) {
            const selectedOption = answerMap.has(question._id.toString())
                ? answerMap.get(question._id.toString())
                : null

            if (selectedOption === null || selectedOption === undefined) {
                unattempted += 1
                continue
            }

            const correctOptionIndex = (question.options || []).findIndex((option) => option.isCorrect)
            if (selectedOption === correctOptionIndex) {
                correct += 1
                score += Number(test.marksPerQuestion || 1)
            } else {
                wrong += 1
                score -= Number(test.negativeMarks || 0)
            }
        }

        const totalQuestions = questions.length
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
            unattempted,
        }
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
}

module.exports = new PreviousYearPaperService()
