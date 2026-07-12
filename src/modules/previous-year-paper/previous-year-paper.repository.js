const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaperAttempt = require('../../models/PreviousYearPaperAttempt.model')
const Question = require('../../models/Question.model')

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
            select: 'previousYearPaper subjectId topicIds chapterTitles title description thumbnail duration totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status language createdAt',
            populate: [{ path: 'subjectId', select: 'name' }, { path: 'topicIds', select: 'topicName' }],
        })
    }

    async getPreviousYearPaperTestById(testId) {
        return PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false })
            .select('previousYearPaper title duration totalQuestions totalMarks marksPerQuestion negativeMarks passingMarks isPaid status isDeleted')
            .lean()
    }

    async getTestCountsByPreviousYearPaper(previousYearPaperIds = []) {
        if (!previousYearPaperIds.length) return {}

        const rows = await PreviousYearPaperTest.aggregate([
            { $match: { isDeleted: false, status: 'active', previousYearPaper: { $in: previousYearPaperIds } } },
            { $group: { _id: '$previousYearPaper', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }

    async getAttemptCountsByPreviousYearPaper(userId, previousYearPaperIds = []) {
        if (!previousYearPaperIds.length) return {}

        const rows = await PreviousYearPaperAttempt.aggregate([
            { $match: { user: userId, previousYearPaper: { $in: previousYearPaperIds } } },
            { $group: { _id: '$previousYearPaper', count: { $sum: 1 } } },
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

        const rows = await PreviousYearPaperAttempt.aggregate([
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
            .select('language question options.text options.image options.isCorrect order sortOrder')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()
    }

    async createAttempt(payload) {
        return PreviousYearPaperAttempt.create(payload)
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
