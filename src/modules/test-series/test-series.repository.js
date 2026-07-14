const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const TestSeries = require('../../models/TestSeries.model')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const TestSeriesAttempt = require('../../models/TestSeriesAttempt.model')
const Question = require('../../models/Question.model')

class TestSeriesRepository extends BaseRepository {
    constructor() {
        super(TestSeries, 'test-series')
    }

    async listSeries(filter, options = {}) {
        return this.findMany(filter, options)
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

        const rows = await TestSeriesAttempt.aggregate([
            { $match: { user: userId, testSeries: { $in: seriesIds } } },
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

        const rows = await TestSeriesAttempt.aggregate([
            { $match: { user: userId, test: { $in: testIds } } },
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
}

module.exports = new TestSeriesRepository()
