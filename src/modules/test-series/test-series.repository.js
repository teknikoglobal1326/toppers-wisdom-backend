const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const TestSeries = require('../../models/TestSeries.model')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
const Question = require('../../models/Question.model')
const mongoose = require('mongoose')

class TestSeriesRepository extends BaseRepository {
    constructor() {
        super(TestSeries, 'test-series')
    }

    async listSeries(filter, options = {}) {
        return this.findMany(filter, options)
    }

    async getUserOverallStats(userId) {
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        const stats = await TestSeriesAttempt.aggregate([
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
        const higherRankCount = await TestSeriesAttempt.aggregate([
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
        const participants = await TestSeriesAttempt.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$user' } },
            { $count: "count" }
        ])
        return participants[0]?.count || 0
    }

    async getAccessibleTotalTests(userId) {
        const CourseOrder = require('../../models/CourseOrder.model')
        const orders = await CourseOrder.find({ user: userId, status: 'paid', 'items.itemType': 'test-series' }).select('items')
        
        const testSeriesIds = new Set()
        for (const order of orders) {
            for (const item of order.items) {
                if (item.itemType === 'test-series') testSeriesIds.add(item.itemId.toString())
            }
        }
        
        const testCount = await TestSeriesTest.countDocuments({
            isDeleted: false,
            status: 'active',
            $or: [
                { testSeries: { $in: Array.from(testSeriesIds) } },
                { isPaid: false }
            ]
        })
        
        return testCount
    }

    async getOngoingSessions(userId) {
        return TestSeriesAttempt.find({ user: userId, status: { $in: ['started', 'ongoing'] } })
            .select('sessionId testSeries test status score totalMarks timeTaken createdAt')
            .populate('testSeries', 'title thumbnail')
            .populate('test', 'title totalQuestions duration')
            .sort({ createdAt: -1 })
            .lean()
    }

    async getCompletedSessions(userId) {
        return TestSeriesAttempt.find({ user: userId, status: 'completed' })
            .select('sessionId testSeries test status score totalMarks timeTaken accuracy correct wrong skipped unattempted attemptedAt')
            .populate('testSeries', 'title thumbnail')
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
        return paginate(TestSeriesTest, filter, {
            ...options,
            select: 'testSeries subjectId topicIds chapterTitles title description thumbnail duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status languages createdAt',
            populate: [{ path: 'subjectId', select: 'name' }, { path: 'topicIds', select: 'topicName' }],
        })
    }

    async getSeriesTestById(testId) {
        return TestSeriesTest.findOne({ _id: testId, isDeleted: false })
            .select('testSeries title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status isDeleted')
            .lean()
    }

    async getTestCountsBySeries(seriesIds = []) {
        if (!seriesIds.length) return {}

        const rows = await TestSeriesTest.aggregate([
            { $match: { isDeleted: false, status: 'active', testSeries: { $in: seriesIds } } },
            { $group: { _id: '$testSeries', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    async getAttemptCountsBySeries(userId, seriesIds = []) {
        if (!seriesIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

        const rows = await TestSeriesAttempt.aggregate([
            { $match: { user: userObjectId, testSeries: { $in: seriesIds } } },
            { $group: { _id: '$testSeries', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
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

        const rows = await TestSeriesAttempt.aggregate([
            { $match: { user: userObjectId, test: { $in: testIds } } },
            { $sort: { attemptedAt: -1 } },
            {
                $group: {
                    _id: '$test',
                    latestAttemptedAt: { $first: '$attemptedAt' },
                    latestScore: { $first: '$score' },
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
            }
            return acc
        }, {})
    }

    async findQuestionsForTest(testId) {
        return Question.find({
            test: testId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect order sortOrder perQuestionTime')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()
    }

    async createAttempt(payload) {
        return TestSeriesAttempt.create(payload)
    }

    async getAttemptBySession(sessionId, userId) {
        return TestSeriesAttempt.findOne({ sessionId, user: userId })
    }

    async updateAttemptBySession(sessionId, userId, updateData) {
        return TestSeriesAttempt.findOneAndUpdate(
            { sessionId, user: userId },
            { $set: updateData },
            { new: true }
        )
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        return paginate(
            TestSeriesAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'testSeries', select: 'title thumbnail' },
                    { path: 'test', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }
    async getAttemptRank(testId, score, timeTaken) {
        const higherRankCount = await TestSeriesAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await TestSeriesAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }
}

module.exports = new TestSeriesRepository()
