const mongoose = require('mongoose')
const BaseRepository = require('../../core/BaseRepository')
const DailyQuiz = require('../../models/DailyQuiz.model')
const DailyQuizAttempt = require('../../models/DailyQuizAttempt.model')
const Question = require('../../models/Question.model')

class DailyQuizRepository extends BaseRepository {
    constructor() {
        super(DailyQuiz, 'daily-quiz')
    }

    async getQuizById(quizId) {
        return DailyQuiz.findOne({ _id: quizId, isDeleted: false }).lean()
    }

    async getAttemptBySession(sessionId, userId) {
        return DailyQuizAttempt.findOne({ sessionId, user: userId })
    }

    async createAttempt(payload) {
        return DailyQuizAttempt.create(payload)
    }

    async findQuestionsForQuiz(quizId) {
        return Question.find({
            test: quizId,
            isDeleted: false,
            status: 'active',
        })
            .select('en hi order sortOrder perQuestionTime subjectId chapterId topicId exam subExams')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        const { paginate } = require('../../core/paginate')
        return paginate(
            DailyQuizAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'quiz', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }

    async getUserOverallStats(userId) {
        const userObjectId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId
        const stats = await DailyQuizAttempt.aggregate([
            { $match: { user: userObjectId, status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalScore: { $sum: '$score' },
                    bestScore: { $max: '$score' },
                    timeSpent: { $sum: '$timeTaken' },
                    totalCorrect: { $sum: '$correct' },
                    totalWrong: { $sum: '$wrong' },
                    totalSkipped: { $sum: '$skipped' },
                    totalUnattempted: { $sum: '$unattempted' },
                    totalAttempts: { $sum: 1 },
                    attemptedQuizIds: { $addToSet: '$quiz' }
                }
            }
        ])

        if (!stats.length) {
            return {
                totalScore: 0,
                bestScore: 0,
                timeSpent: 0,
                totalCorrect: 0,
                totalWrong: 0,
                totalSkipped: 0,
                totalUnattempted: 0,
                totalAttempts: 0,
                uniqueAttemptedTests: 0
            }
        }

        return {
            totalScore: stats[0].totalScore || 0,
            bestScore: stats[0].bestScore || 0,
            timeSpent: stats[0].timeSpent || 0,
            totalCorrect: stats[0].totalCorrect || 0,
            totalWrong: stats[0].totalWrong || 0,
            totalSkipped: stats[0].totalSkipped || 0,
            totalUnattempted: stats[0].totalUnattempted || 0,
            totalAttempts: stats[0].totalAttempts || 0,
            uniqueAttemptedTests: (stats[0].attemptedQuizIds || []).length
        }
    }

    async getOverallPlatformRank(userTotalScore, userTotalTime) {
        const higherRankCount = await DailyQuizAttempt.aggregate([
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
            { $count: 'count' }
        ])

        return (higherRankCount[0]?.count || 0) + 1
    }

    async getTotalPlatformParticipants() {
        const participants = await DailyQuizAttempt.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$user' } },
            { $count: 'count' }
        ])
        return participants[0]?.count || 0
    }
}

module.exports = new DailyQuizRepository()
