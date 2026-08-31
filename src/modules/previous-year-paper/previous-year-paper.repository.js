const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')
const Question = require('../../models/Question.model')
const CourseOrder = require('../../models/CourseOrder.model')

class PreviousYearPaperRepository extends BaseRepository {
    constructor() {
        super(PreviousYearPaper, 'previous-year-paper')
    }

    async listPreviousYearPapers(filter, options = {}) {
        return this.findMany(filter, options)
    }

    async getPreviousYearPaperById(id) {
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

    async listPreviousYearPaperTests(filter, options = {}) {
        return paginate(PreviousYearPaperTest, filter, {
            ...options,
            select: 'previousYearPaper subjectIds chapterIds topicIds title description thumbnail duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status languages createdAt',
            populate: [{ path: 'subjectIds', select: 'name chapters' }],
        })
    }

    async getPreviousYearPaperTestById(testId) {
        return PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false })
            .select('previousYearPaper title duration isPerQuestionTime totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status isDeleted')
            .lean()
    }

    async getTestCountsByPreviousYearPaper(previousYearPaperIds = []) {
        if (!previousYearPaperIds.length) return {}

        const rows = await PreviousYearPaperTest.aggregate([
            { $match: { isDeleted: false, status: 'active', previousYearPaper: { $in: previousYearPaperIds } } },
            { 
                $group: { 
                    _id: '$previousYearPaper', 
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

    async getAttemptStatsByPreviousYearPaper(userId, previousYearPaperIds = []) {
        if (!previousYearPaperIds.length) return {}
        const mongoose = require('mongoose')

        const rows = await PreviousYearPaperAttempt.aggregate([
            { $match: { 
                user: new mongoose.Types.ObjectId(userId), 
                previousYearPaper: { $in: previousYearPaperIds.map(id => new mongoose.Types.ObjectId(id)) }, 
                status: 'completed' 
            } },
            { 
                $group: { 
                    _id: '$previousYearPaper', 
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
        const mongoose = require('mongoose')

        const rows = await PreviousYearPaperAttempt.aggregate([
            { $match: { 
                user: new mongoose.Types.ObjectId(userId), 
                test: { $in: testIds.map(id => new mongoose.Types.ObjectId(id)) } 
            } },
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
        return PreviousYearPaperAttempt.create(payload)
    }

    async getAttemptBySession(sessionId, userId) {
        return PreviousYearPaperAttempt.findOne({ sessionId, user: userId })
    }

    async updateAttemptBySession(sessionId, userId, updateData) {
        return PreviousYearPaperAttempt.findOneAndUpdate(
            { sessionId, user: userId },
            { $set: updateData },
            { new: true }
        )
    }

    async getAttemptRank(testId, score, timeTaken) {
        const higherRankCount = await PreviousYearPaperAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await PreviousYearPaperAttempt.countDocuments({
            test: testId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        return paginate(
            PreviousYearPaperAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'previousYearPaper', select: 'title thumbnail' },
                    { path: 'test', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }
}

module.exports = new PreviousYearPaperRepository()
