const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const SectionalTestSeries = require('../../models/SectionalTestSeries.model')
const SectionalTestSeriesTest = require('../../models/SectionalTestSeriesTest.model')
const SectionalTestSeriesAttempt = require('../../models/SectionalTestSeriesAttempt.model')
const Question = require('../../models/Question.model')

const CourseOrder = require('../../models/CourseOrder.model')

const mongoose = require('mongoose')


class SectionalTestSeriesRepository extends BaseRepository {
    constructor() {
        super(SectionalTestSeries, 'sectional-test-series')
    }

    async listSeries(filter, options = {}) {
        return this.findMany(filter, options)
    }

    async getUserOverallStats(userId) {
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        const stats = await SectionalTestSeriesAttempt.aggregate([
            { $match: { user: userObjectId, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: '$score' },
                    timeSpent: { $sum: '$timeTaken' },
                    totalCorrect: { $sum: '$correct' },
                    totalWrong: { $sum: '$wrong' },
                    attemptedTestIds: { $addToSet: '$test' }
                }
            }
        ])

        if (!stats.length) {
            return { totalScore: 0, timeSpent: 0, totalCorrect: 0, totalWrong: 0, totalAttemptedTests: 0 }
        }

        return {
            totalScore: stats[0].totalScore,
            timeSpent: stats[0].timeSpent,
            totalCorrect: stats[0].totalCorrect,
            totalWrong: stats[0].totalWrong,
            totalAttemptedTests: stats[0].attemptedTestIds.length
        }
    }

    async getOverallPlatformRank(userTotalScore, userTotalTime) {
        // Find users with a strictly higher sum of scores, or same score but lower time
        const higherRankCount = await SectionalTestSeriesAttempt.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: '$user',
                    totalScore: { $sum: '$score' },
                    totalTime: { $sum: '$timeTaken' }
                }
            },
            {
                $match: {
                    $or: [
                        { totalScore: { $gt: userTotalScore } },
                        { totalScore: userTotalScore, totalTime: { $lt: userTotalTime } }
                    ]
                }
            },
            { $count: "count" }
        ])

        return (higherRankCount[0]?.count || 0) + 1
    }

    async getTotalPlatformParticipants() {
        const participants = await SectionalTestSeriesAttempt.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$user' } },
            { $count: "count" }
        ])
        return participants[0]?.count || 0
    }

    async getAccessibleTotalTests(userId) {
        const CourseOrder = require('../../models/CourseOrder.model')
        const orders = await CourseOrder.find({ user: userId, status: 'paid', 'items.itemType': 'sectional-test-series' }).select('items')

        const sectionalSectionalTestSeriesIds = new Set()
        for (const order of orders) {
            for (const item of order.items) {
                if (item.itemType === 'sectional-test-series') sectionalSectionalTestSeriesIds.add(item.itemId.toString())
            }
        }

        const testCount = await SectionalTestSeriesTest.countDocuments({
            isDeleted: false,
            status: 'active',
            $or: [
                { sectionalSectionalTestSeries: { $in: Array.from(sectionalSectionalTestSeriesIds) } },
                { isPaid: false }
            ]
        })

        return testCount
    }

    async getOngoingSessions(userId) {
        return SectionalTestSeriesAttempt.find({ user: userId, status: { $in: ['started', 'ongoing'] } })
            .select('sessionId sectionalSectionalTestSeries test status score totalMarks timeTaken createdAt')
            .populate('sectionalSectionalTestSeries', 'title thumbnail')
            .populate('test', 'title totalQuestions duration')
            .sort({ createdAt: -1 })
            .lean()
    }

    async getCompletedSessions(userId) {
        return SectionalTestSeriesAttempt.find({ user: userId, status: 'completed' })
            .select('sessionId sectionalSectionalTestSeries test status score totalMarks timeTaken accuracy correct wrong skipped unattempted attemptedAt')
            .populate('sectionalSectionalTestSeries', 'title thumbnail')
            .populate('test', 'title totalQuestions duration passingMarks')
            .sort({ attemptedAt: -1 })
            .lean()
    }

    async getSeriesById(id) {
        return this.findOne(
            { _id: id, isDeleted: false },
            {
                select: 'title description thumbnail exam subExams subjectIds isPaid status createdAt',
                populate: [
                    { path: 'exam', select: 'name' },
                    { path: 'subExams', select: 'name' },
                    { path: 'subjectIds', select: 'name' },
                ],
            }
        )
    }

    async listSeriesTests(filter, options = {}) {
        return paginate(SectionalTestSeriesTest, filter, {
            ...options,
            select: 'sectionalSectionalTestSeries subjectIds chapterIds topicIds title description thumbnail duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status languages createdAt',
            populate: [{ path: 'subjectIds', select: 'name chapters' }],
        })
    }

    async getSeriesTestById(testId) {
        return SectionalTestSeriesTest.findOne({ _id: testId, isDeleted: false })
            .select('sectionalSectionalTestSeries title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status isDeleted')
            .lean()
    }

    async getTestCountsBySeries(seriesIds = []) {
        if (!seriesIds.length) return {}

        const rows = await SectionalTestSeriesTest.aggregate([
            { $match: { isDeleted: false, status: 'active', sectionalSectionalTestSeries: { $in: seriesIds } } },
            { 
                $group: { 
                    _id: '$sectionalSectionalTestSeries', 
                    totalCount: { $sum: 1 },
                    freeCount: { $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] } }
                } 
            },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = {
                total: row.totalCount,
                free: row.freeCount
            }
            return acc
        }, {})
    }

    async getAttemptStatsBySeries(userId, seriesIds = []) {
        if (!seriesIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

        const rows = await SectionalTestSeriesAttempt.aggregate([
            { $match: { user: userObjectId, sectionalSectionalTestSeries: { $in: seriesIds }, status: 'completed' } },
            { 
                $group: { 
                    _id: '$sectionalSectionalTestSeries', 
                    totalAttempts: { $sum: 1 },
                    uniqueTestsAttempted: { $addToSet: '$test' },
                    avgScore: { $avg: '$score' },
                    avgAccuracy: { $avg: '$accuracy' }
                } 
            },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = {
                totalAttempts: row.totalAttempts,
                attemptedTestsCount: row.uniqueTestsAttempted.length,
                avgScore: row.avgScore || 0,
                avgAccuracy: row.avgAccuracy || 0
            }
            return acc
        }, {})
    }

    async getQuestionCountsByTestIds(testIds = []) {
        if (!testIds.length) return {}

        const rows = await Question.aggregate([
            { $match: { isDeleted: false, status: 'active', test: { $in: testIds } } },
            { $group: { _id: '$test', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    async getLatestAttemptsByTestIds(userId, testIds = []) {
        if (!testIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

        const rows = await SectionalTestSeriesAttempt.aggregate([
            { $match: { user: userObjectId, test: { $in: testIds } } },
            { $sort: { attemptedAt: -1 } },
            {
                $group: {
                    _id: '$test',
                    latestAttemptedAt: { $first: '$attemptedAt' },
                    latestScore: { $first: '$score' },
                    latestSessionId: { $first: '$sessionId' },
                    bestScore: { $max: '$score' },
                    attemptsCount: { $sum: 1 },
                },
            },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = {
                latestAttemptedAt: row.latestAttemptedAt,
                latestScore: row.latestScore,
                bestScore: row.bestScore,
                attemptsCount: row.attemptsCount,
                sessionId: row.latestSessionId,
            }
            return acc
        }, {})
    }

    async getPurchasedTestItemIds(userId) {
        const orders = await CourseOrder.find({
            user: userId,
            status: 'paid',
            'items.itemType': 'test',
        }).select('items.itemId').lean()

        const ids = new Set()
        for (const order of orders) {
            for (const item of order.items || []) {
                if (item?.itemId) ids.add(item.itemId.toString())
            }
        }

        return ids
    }

    async findQuestionsForTest(testId) {
        return Question.find({
            test: testId,
            isDeleted: false,
            status: 'active',
        })
            .select('en hi order sortOrder perQuestionTime subjectId chapterId topicId')
            .populate('subjectId', 'name chapters')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()
    }

    async createAttempt(payload) {
        return SectionalTestSeriesAttempt.create(payload)
    }

    async getAttemptBySession(sessionId, userId) {
        return SectionalTestSeriesAttempt.findOne({ sessionId, user: userId })
    }

    async updateAttemptBySession(sessionId, userId, updateData) {
        return SectionalTestSeriesAttempt.findOneAndUpdate(
            { sessionId, user: userId },
            { $set: updateData },
            { new: true }
        )
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        return paginate(
            SectionalTestSeriesAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'sectionalSectionalTestSeries', select: 'title thumbnail' },
                    { path: 'test', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }
    async getAttemptRank(testId, score, timeTaken) {
        const higherRankCount = await SectionalTestSeriesAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await SectionalTestSeriesAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }
}

module.exports = new SectionalTestSeriesRepository()
