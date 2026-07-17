const BaseRepository = require('../../core/BaseRepository')
const { paginate } = require('../../core/paginate')
const CourseTest = require('../../models/CourseTest.model')
const CourseTestAttempt = require('../../models/CourseTestAttempt.model')
const Question = require('../../models/Question.model')
const mongoose = require('mongoose')

class CourseTestRepository extends BaseRepository {
    constructor() {
        super(CourseTest, 'course-test')
    }

    async getCourseTestById(testId) {
        return CourseTest.findOne({ _id: testId, isDeleted: false })
            .select('course topic chapter title slug description instruction localizedContent image duration isPerQuestionTime totalQuestions totalMappedQuestions totalMarks passingMarks marksPerQuestion negativeMarks maxAttempts difficulty language status isDeleted')
            .lean()
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
        return CourseTestAttempt.create(payload)
    }

    async getAttemptBySession(sessionId, userId) {
        return CourseTestAttempt.findOne({ sessionId, user: userId })
    }

    async updateAttemptBySession(sessionId, userId, updateData) {
        return CourseTestAttempt.findOneAndUpdate(
            { sessionId, user: userId },
            { $set: updateData },
            { new: true }
        )
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        return paginate(
            CourseTestAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'course', select: 'title thumbnail' },
                    { path: 'courseTest', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }

    async getAttemptRank(courseTestId, score, timeTaken) {
        const higherRankCount = await CourseTestAttempt.countDocuments({
            courseTest: courseTestId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await CourseTestAttempt.countDocuments({
            courseTest: courseTestId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }

    async getLatestAttemptsByTestIds(userId, testIds = []) {
        if (!testIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId

        const rows = await CourseTestAttempt.aggregate([
            { $match: { user: userObjectId, courseTest: { $in: testIds } } },
            { $sort: { attemptedAt: -1 } },
            {
                $group: {
                    _id: '$courseTest',
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

    async getAttemptCountsByTest(userId, testIds = []) {
        if (!testIds.length) return {}
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId

        const rows = await CourseTestAttempt.aggregate([
            { $match: { user: userObjectId, courseTest: { $in: testIds } } },
            { $group: { _id: '$courseTest', count: { $sum: 1 } } },
        ])

        return rows.reduce((acc, row) => {
            acc[row._id.toString()] = row.count
            return acc
        }, {})
    }
}

module.exports = new CourseTestRepository()
