const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const repository = require('./student-analytics.repository')

const round2 = (value) => Math.round(value * 100) / 100

const computeAccuracy = (correct, wrong) => {
    const attempted = correct + wrong
    if (!attempted) return 0
    return round2((correct / attempted) * 100)
}

class StudentAnalyticsService {
    constructor() {
        this.logger = createLogger('student-analytics:service')
    }

    assertType(type) {
        const registry = repository.getRegistry(type)
        if (!registry) throw new AppError('Invalid analytics type. Use test-series or pyq', 400, 'VALIDATION_ERROR')
        return registry
    }

    /**
     * API 1 — GET /student/analytics/:type
     * All collections of a type + the logged-in user's overall analytics.
     */
    async getCollectionsAnalytics(type, userId, query = {}) {
        this.assertType(type)

        const filter = { isDeleted: false, status: 'active' }
        if (query.examId) filter.exam = query.examId
        if (query.subExamId) filter.subExams = query.subExamId
        if (query.subjectId) filter.subjectIds = query.subjectId
        if (query.q) {
            filter.$or = [
                { title: { $regex: query.q, $options: 'i' } },
                { description: { $regex: query.q, $options: 'i' } },
            ]
        }

        const result = await repository.listCollections(type, filter, {
            page: query.page,
            limit: query.limit,
        })

        const collectionIds = result.data.map((item) => item._id)

        // User-level stats are type-wide (same for every row) — computed once.
        const [testCounts, attemptedTestCounts, stats] = await Promise.all([
            repository.getTestCountsByCollections(type, collectionIds),
            repository.getAttemptedTestCountsByCollections(type, userId, collectionIds),
            repository.getUserTypeStats(type, userId),
        ])

        let rank = 0
        let totalParticipants = 0
        if (stats.attemptCount > 0) {
            const rankInfo = await repository.getUserRank(type, stats.totalScore, stats.totalTimeSpent)
            rank = rankInfo.rank
            totalParticipants = rankInfo.totalParticipants
        }

        const accuracy = computeAccuracy(stats.totalCorrect, stats.totalWrong)

        const data = {
            summary: {
                type,
                rank,
                totalParticipants,
                attemptedCollections: stats.attemptedCollections,
                accuracy,
                totalTimeSpent: stats.totalTimeSpent,
            },
            collections: result.data.map((item) => ({
                id: item._id,
                title: item.title,
                thumbnail: item.thumbnail || null,
                totalTests: testCounts[item._id.toString()] || 0,
                attemptedTests: attemptedTestCounts[item._id.toString()] || 0,
                rank,
                attemptedCollections: stats.attemptedCollections,
                accuracy,
                totalTimeSpent: stats.totalTimeSpent,
            })),
        }

        return { data, pagination: result.pagination }
    }

    /**
     * API 2 — GET /student/analytics/:type/:collectionId
     * Analytics for one particular collection.
     */
    async getCollectionAnalytics(type, collectionId, userId) {
        this.assertType(type)

        const collection = await repository.getCollectionById(type, collectionId)
        if (!collection) {
            throw new AppError(
                type === 'pyq' ? 'PYQ collection not found' : 'Test series not found',
                404,
                'NOT_FOUND'
            )
        }

        const [stats, testCounts] = await Promise.all([
            repository.getUserTypeStats(type, userId, collectionId),
            repository.getTestCountsByCollections(type, [collectionId]),
        ])

        let rank = 0
        let totalParticipants = 0
        let bestTestCount = 0
        if (stats.attemptCount > 0) {
            const [rankInfo, bestCount] = await Promise.all([
                repository.getUserRank(type, stats.totalScore, stats.totalTimeSpent, collectionId),
                repository.getBestTestCount(type, userId, collectionId, 70),
            ])
            rank = rankInfo.rank
            totalParticipants = rankInfo.totalParticipants
            bestTestCount = bestCount
        }

        return {
            id: collection._id,
            title: collection.title,
            totalTests: testCounts[collection._id.toString()] || 0,
            rank,
            totalParticipants,
            attemptedTests: stats.attemptedTests,
            bestTestCount,
            accuracy: computeAccuracy(stats.totalCorrect, stats.totalWrong),
            totalTimeSpent: stats.totalTimeSpent,
        }
    }

    /**
     * API 3 — GET /student/analytics/test/:testId
     * Analytics for one particular test (works for both families —
     * the test id is resolved to its family automatically).
     */
    async getTestAnalytics(testId, userId) {
        const resolved = await repository.resolveTest(testId)
        if (!resolved) throw new AppError('Test not found', 404, 'NOT_FOUND')

        const { type, test } = resolved

        const stats = await repository.getUserTestStats(type, userId, testId)

        let rank = 0
        let totalParticipants = 0
        if (stats.attemptCount > 0) {
            const rankInfo = await repository.getTestRank(type, userId, testId)
            rank = rankInfo.rank
            totalParticipants = rankInfo.totalParticipants
        }

        return {
            testId: test._id,
            title: test.title,
            type,
            rank,
            totalParticipants,
            attemptCount: stats.attemptCount,
            accuracy: computeAccuracy(stats.totalCorrect, stats.totalWrong),
            totalTimeSpent: stats.totalTimeSpent,
        }
    }

    /**
     * API 4 — GET /student/analytics/question/:questionId
     * Aggregated across ALL students. Dual-language variants of the same
     * logical question (shared groupId) are merged so the numbers cover
     * students answering in either language.
     */
    async getQuestionAnalytics(questionId) {
        const question = await repository.getQuestionById(questionId)
        if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

        const [variants, AttemptModel] = await Promise.all([
            repository.getQuestionVariants(question),
            repository.resolveAttemptModelForQuestion(question.test),
        ])

        const { attemptedStudents, solvedStudents, totalTimeSpent } =
            await repository.getQuestionAggregates(AttemptModel, variants)

        const accuracy = attemptedStudents > 0
            ? round2((solvedStudents / attemptedStudents) * 100)
            : 0

        return {
            questionId: question._id,
            attemptedStudents,
            solvedStudents,
            accuracy,
            totalTimeSpent,
        }
    }
}

module.exports = new StudentAnalyticsService()