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
}

module.exports = new DailyQuizRepository()
