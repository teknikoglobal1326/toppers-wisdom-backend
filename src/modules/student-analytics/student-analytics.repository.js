const mongoose = require('mongoose')

const TestSeries = require('../../models/TestSeries.model')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')
const TestAttempt = require('../../models/TestAttempt.model')
const Question = require('../../models/Question.model')
const { paginate } = require('../../core/paginate')

const toObjectId = (id) => (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id)

/**
 * Everything type-specific lives in this registry so every method below is
 * written once and works for both test-series and pyq.
 *
 * collectionField = the field on the attempt/test document pointing at the
 * parent collection ('testSeries' | 'previousYearPaper').
 */
const TYPE_REGISTRY = {
    'test-series': {
        Collection: TestSeries,
        Test: TestSeriesTest,
        Attempt: TestSeriesAttempt,
        collectionField: 'testSeries',
    },
    pyq: {
        Collection: PreviousYearPaper,
        Test: PreviousYearPaperTest,
        Attempt: PreviousYearPaperAttempt,
        collectionField: 'previousYearPaper',
    },
}

// Only finished attempts count towards analytics.
const COMPLETED = { status: 'completed' }

class StudentAnalyticsRepository {
    getRegistry(type) {
        return TYPE_REGISTRY[type] || null
    }

    // ── Collections listing (API 1) ─────────────────────────────

    async listCollections(type, filter, options = {}) {
        const { Collection } = TYPE_REGISTRY[type]
        return paginate(Collection, filter, {
            ...options,
            sort: options.sort || { createdAt: -1 },
            select: 'title thumbnail',
        })
    }

    async getTestCountsByCollections(type, collectionIds = []) {
        if (!collectionIds.length) return {}
        const { Test, collectionField } = TYPE_REGISTRY[type]

        const rows = await Test.aggregate([
            { $match: { isDeleted: false, status: 'active', [collectionField]: { $in: collectionIds.map(toObjectId) } } },
            { $group: { _id: `$${collectionField}`, count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    /**
     * For each collection (scoped to the given collectionIds — normally the
     * current page), how many DISTINCT tests has this user completed at
     * least one attempt of. Kept as a single aggregation (no N+1) by
     * grouping on {collection, test} first, then counting per collection.
     */
    async getAttemptedTestCountsByCollections(type, userId, collectionIds = []) {
        if (!collectionIds.length) return {}
        const { Attempt, collectionField } = TYPE_REGISTRY[type]

        const rows = await Attempt.aggregate([
            {
                $match: {
                    user: toObjectId(userId),
                    [collectionField]: { $in: collectionIds.map(toObjectId) },
                    ...COMPLETED,
                },
            },
            { $group: { _id: { collection: `$${collectionField}`, test: '$test' } } },
            { $group: { _id: '$_id.collection', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    /**
     * One aggregation returning the user's overall stats for a type:
     * total score, time spent, correct/wrong counts and the distinct
     * collections attempted. Optionally scoped to one collection.
     */
    async getUserTypeStats(type, userId, collectionId = null) {
        const { Attempt, collectionField } = TYPE_REGISTRY[type]

        const match = { user: toObjectId(userId), ...COMPLETED }
        if (collectionId) match[collectionField] = toObjectId(collectionId)

        const rows = await Attempt.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: { $ifNull: ['$score', 0] } },
                    totalTimeSpent: { $sum: { $ifNull: ['$timeTaken', 0] } },
                    totalCorrect: { $sum: { $ifNull: ['$correct', 0] } },
                    totalWrong: { $sum: { $ifNull: ['$wrong', 0] } },
                    attemptedCollectionIds: { $addToSet: `$${collectionField}` },
                    attemptedTestIds: { $addToSet: '$test' },
                    attemptCount: { $sum: 1 },
                },
            },
        ])

        if (!rows.length) {
            return {
                totalScore: 0,
                totalTimeSpent: 0,
                totalCorrect: 0,
                totalWrong: 0,
                attemptedCollections: 0,
                attemptedTests: 0,
                attemptCount: 0,
            }
        }

        const row = rows[0]
        return {
            totalScore: row.totalScore,
            totalTimeSpent: row.totalTimeSpent,
            totalCorrect: row.totalCorrect,
            totalWrong: row.totalWrong,
            attemptedCollections: row.attemptedCollectionIds.length,
            attemptedTests: row.attemptedTestIds.length,
            attemptCount: row.attemptCount,
        }
    }

    /**
     * Rank of the user among all users of a type (or inside one collection).
     * Ranking key: higher total score first, lower total time breaks ties.
     * Mirrors the existing test-series getOverallPlatformRank() convention.
     */
    async getUserRank(type, userTotalScore, userTotalTime, collectionId = null) {
        const { Attempt, collectionField } = TYPE_REGISTRY[type]

        const match = { ...COMPLETED }
        if (collectionId) match[collectionField] = toObjectId(collectionId)

        const rows = await Attempt.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$user',
                    totalScore: { $sum: { $ifNull: ['$score', 0] } },
                    totalTime: { $sum: { $ifNull: ['$timeTaken', 0] } },
                },
            },
            {
                $facet: {
                    better: [
                        {
                            $match: {
                                $or: [
                                    { totalScore: { $gt: userTotalScore } },
                                    { totalScore: userTotalScore, totalTime: { $lt: userTotalTime } },
                                ],
                            },
                        },
                        { $count: 'count' },
                    ],
                    total: [{ $count: 'count' }],
                },
            },
        ])

        return {
            rank: (rows[0]?.better[0]?.count || 0) + 1,
            totalParticipants: rows[0]?.total[0]?.count || 0,
        }
    }

    // ── Collection detail (API 2) ───────────────────────────────

    async getCollectionById(type, collectionId) {
        const { Collection } = TYPE_REGISTRY[type]
        return Collection.findOne({ _id: collectionId, isDeleted: false, status: 'active' })
            .select('title thumbnail')
            .lean()
    }

    /**
     * Count of distinct tests inside a collection where the user's BEST
     * completed attempt scored >= the given marks percentage.
     */
    async getBestTestCount(type, userId, collectionId, minPercentage = 70) {
        const { Attempt, collectionField } = TYPE_REGISTRY[type]

        const rows = await Attempt.aggregate([
            {
                $match: {
                    user: toObjectId(userId),
                    [collectionField]: toObjectId(collectionId),
                    ...COMPLETED,
                },
            },
            {
                $project: {
                    test: 1,
                    percentage: {
                        $cond: [
                            { $gt: [{ $ifNull: ['$totalMarks', 0] }, 0] },
                            { $multiply: [{ $divide: [{ $ifNull: ['$score', 0] }, '$totalMarks'] }, 100] },
                            0,
                        ],
                    },
                },
            },
            { $group: { _id: '$test', bestPercentage: { $max: '$percentage' } } },
            { $match: { bestPercentage: { $gte: minPercentage } } },
            { $count: 'count' },
        ])

        return rows[0]?.count || 0
    }

    // ── Single test (API 3) ─────────────────────────────────────

    /**
     * Resolve a testId that may belong to either family.
     * Returns { type, test } or null.
     */
    async resolveTest(testId) {
        const [seriesTest, pyqTest] = await Promise.all([
            TestSeriesTest.findOne({ _id: testId, isDeleted: false })
                .select('title testSeries totalMarks status').lean(),
            PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false })
                .select('title previousYearPaper totalMarks status').lean(),
        ])

        if (seriesTest) return { type: 'test-series', test: seriesTest }
        if (pyqTest) return { type: 'pyq', test: pyqTest }
        return null
    }

    async getUserTestStats(type, userId, testId) {
        const { Attempt } = TYPE_REGISTRY[type]

        const rows = await Attempt.aggregate([
            { $match: { user: toObjectId(userId), test: toObjectId(testId), ...COMPLETED } },
            {
                $group: {
                    _id: null,
                    attemptCount: { $sum: 1 },
                    totalTimeSpent: { $sum: { $ifNull: ['$timeTaken', 0] } },
                    totalCorrect: { $sum: { $ifNull: ['$correct', 0] } },
                    totalWrong: { $sum: { $ifNull: ['$wrong', 0] } },
                    bestScore: { $max: { $ifNull: ['$score', 0] } },
                },
            },
        ])

        if (!rows.length) {
            return { attemptCount: 0, totalTimeSpent: 0, totalCorrect: 0, totalWrong: 0, bestScore: 0 }
        }
        const { attemptCount, totalTimeSpent, totalCorrect, totalWrong, bestScore } = rows[0]
        return { attemptCount, totalTimeSpent, totalCorrect, totalWrong, bestScore }
    }

    /**
     * Rank inside a single test. Every user is represented by their best
     * completed attempt (highest score, then lowest time). The classic
     * sort + $first-per-group pattern keeps it index-friendly.
     */
    async getTestRank(type, userId, testId) {
        const { Attempt } = TYPE_REGISTRY[type]
        const userObjectId = toObjectId(userId)

        const rows = await Attempt.aggregate([
            { $match: { test: toObjectId(testId), ...COMPLETED } },
            { $sort: { score: -1, timeTaken: 1 } },
            {
                $group: {
                    _id: '$user',
                    bestScore: { $first: { $ifNull: ['$score', 0] } },
                    bestTime: { $first: { $ifNull: ['$timeTaken', 0] } },
                },
            },
            {
                $facet: {
                    mine: [{ $match: { _id: userObjectId } }],
                    all: [{ $sort: { bestScore: -1, bestTime: 1 } }, { $group: { _id: null, users: { $push: '$_id' } } }],
                },
            },
        ])

        const facet = rows[0] || { mine: [], all: [] }
        if (!facet.mine.length) return { rank: 0, totalParticipants: facet.all[0]?.users.length || 0 }

        const users = facet.all[0]?.users || []
        const rank = users.findIndex((id) => id.toString() === userObjectId.toString()) + 1
        return { rank, totalParticipants: users.length }
    }

    // ── Question analytics (API 4) ──────────────────────────────

    async getQuestionById(questionId) {
        return Question.findOne({ _id: questionId, isDeleted: false })
            .select('test groupId options.isCorrect language')
            .lean()
    }

    /**
     * A dual-language question lives as two docs sharing a groupId
     * (see memory: test-language-architecture). Attempts reference the
     * language-specific _id, so analytics must cover all siblings.
     * Returns [{ _id, correctIndex }].
     */
    async getQuestionVariants(question) {
        const docs = question.groupId
            ? await Question.find({ groupId: question.groupId, isDeleted: false }).select('options.isCorrect').lean()
            : [question]

        return docs.map((doc) => ({
            _id: doc._id,
            correctIndex: (doc.options || []).findIndex((opt) => opt.isCorrect),
        }))
    }

    /**
     * Which attempt model holds answers for this question's test?
     * Question.test may point at a TestSeriesTest, PreviousYearPaperTest
     * or CourseTest — probe each family.
     */
    async resolveAttemptModelForQuestion(testId) {
        const [isSeries, isPyq] = await Promise.all([
            TestSeriesTest.exists({ _id: testId }),
            PreviousYearPaperTest.exists({ _id: testId }),
        ])

        if (isSeries) return TestSeriesAttempt
        if (isPyq) return PreviousYearPaperAttempt
        return TestAttempt
    }

    /**
     * Cross-student aggregation for one question (all language variants).
     * A student counts as "attempted" if any completed attempt answered
     * the question, "solved" if any of those answers was correct.
     */
    async getQuestionAggregates(AttemptModel, variants) {
        const variantIds = variants.map((v) => toObjectId(v._id))

        // Per-variant correctness: answers store the language-specific
        // question _id, so the correct option index is matched per variant.
        const correctnessBranches = variants
            .filter((v) => v.correctIndex >= 0)
            .map((v) => ({
                case: { $eq: ['$answers.questionId', toObjectId(v._id)] },
                then: { $cond: [{ $eq: ['$answers.selectedOption', v.correctIndex] }, 1, 0] },
            }))

        const rows = await AttemptModel.aggregate([
            { $match: { 'answers.questionId': { $in: variantIds }, ...COMPLETED } },
            { $unwind: '$answers' },
            {
                $match: {
                    'answers.questionId': { $in: variantIds },
                    'answers.selectedOption': { $ne: null },
                },
            },
            {
                $group: {
                    _id: '$user',
                    solved: {
                        $max: correctnessBranches.length
                            ? { $switch: { branches: correctnessBranches, default: 0 } }
                            : { $literal: 0 },
                    },
                    // PYQ/course answers have no per-answer timeTaken — treated as 0.
                    timeSpent: { $sum: { $ifNull: ['$answers.timeTaken', 0] } },
                },
            },
            {
                $group: {
                    _id: null,
                    attemptedStudents: { $sum: 1 },
                    solvedStudents: { $sum: '$solved' },
                    totalTimeSpent: { $sum: '$timeSpent' },
                },
            },
        ])

        if (!rows.length) return { attemptedStudents: 0, solvedStudents: 0, totalTimeSpent: 0 }
        const { attemptedStudents, solvedStudents, totalTimeSpent } = rows[0]
        return { attemptedStudents, solvedStudents, totalTimeSpent }
    }
}

module.exports = new StudentAnalyticsRepository()