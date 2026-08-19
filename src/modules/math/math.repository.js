const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const MathModel = require('../../models/Math.model')
const MathTest = require('../../models/MathTest.model')
const MathAttempt = require('../../models/MathAttempt.model')
const Question = require('../../models/Question.model')
const CourseOrder = require('../../models/CourseOrder.model')
const mongoose = require('mongoose')

class MathRepository extends BaseRepository {
    constructor() {
        super(MathModel, 'math')
    }

    async listSeries(filter, options = {}) {
        return this.findMany(filter, options)
    }

    async getUserOverallStats(userId) {
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
        const stats = await MathAttempt.aggregate([
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
        const higherRankCount = await MathAttempt.aggregate([
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
        const participants = await MathAttempt.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$user' } },
            { $count: "count" }
        ])
        return participants[0]?.count || 0
    }

    async getAccessibleTotalTests(userId) {
        const orders = await CourseOrder.find({ user: userId, status: 'paid', 'items.itemType': 'math' }).select('items')

        const mathIds = new Set()
        for (const order of orders) {
            for (const item of order.items) {
                if (item.itemType === 'math') mathIds.add(item.itemId.toString())
            }
        }

        const testCount = await MathTest.countDocuments({
            isDeleted: false,
            status: 'active',
            $or: [
                { math: { $in: Array.from(mathIds) } },
                { isPaid: false }
            ]
        })

        return testCount
    }

    async getOngoingSessions(userId) {
        return MathAttempt.find({ user: userId, status: { $in: ['started', 'ongoing'] } })
            .select('sessionId math test status score totalMarks timeTaken createdAt')
            .populate('math', 'title thumbnail')
            .populate('test', 'title totalQuestions duration')
            .sort({ createdAt: -1 })
            .lean()
    }

    async getCompletedSessions(userId) {
        return MathAttempt.find({ user: userId, status: 'completed' })
            .select('sessionId math test status score totalMarks timeTaken accuracy correct wrong skipped unattempted attemptedAt')
            .populate('math', 'title thumbnail')
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
        return paginate(MathTest, filter, {
            ...options,
            select: 'math subjectIds chapterIds topicIds title description thumbnail duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status languages createdAt',
            populate: [{ path: 'subjectIds', select: 'name chapters' }],
        })
    }

    async getSeriesTestById(testId) {
        return MathTest.findOne({ _id: testId, isDeleted: false })
            .select('math title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status isDeleted')
            .lean()
    }

    async getTestCountsBySeries(seriesIds = []) {
        if (!seriesIds.length) return {}

        const rows = await MathTest.aggregate([
            { $match: { isDeleted: false, status: 'active', math: { $in: seriesIds } } },
            { $group: { _id: '$math', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    async getAttemptCountsBySeries(userId, seriesIds = []) {
        if (!seriesIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

        const rows = await MathAttempt.aggregate([
            { $match: { user: userObjectId, math: { $in: seriesIds } } },
            { $group: { _id: '$math', count: { $sum: 1 } } },
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

        const rows = await MathAttempt.aggregate([
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
        return MathAttempt.create(payload)
    }

    async getAttemptBySession(sessionId, userId) {
        return MathAttempt.findOne({ sessionId, user: userId })
    }

    async updateAttemptBySession(sessionId, userId, updateData) {
        return MathAttempt.findOneAndUpdate(
            { sessionId, user: userId },
            { $set: updateData },
            { new: true }
        )
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        return paginate(
            MathAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'math', select: 'title thumbnail' },
                    { path: 'test', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }

    async getAttemptRank(testId, score, timeTaken) {
        const higherRankCount = await MathAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await MathAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }
}

module.exports = new MathRepository()
