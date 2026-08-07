const BaseRepository = require('../../core/BaseRepository')
const LiveTest = require('../../models/LiveTest.model')
const LiveTestAttempt = require('../../models/LiveTestAttempt.model')
const Question = require('../../models/Question.model')

class LiveTestRepository extends BaseRepository {
    constructor() {
        super(LiveTest, 'live-test')
    }

    async getLiveTestById(liveTestId) {
        return LiveTest.findOne({ _id: liveTestId, isDeleted: false }).lean()
    }

    async getAttemptBySession(sessionId, userId) {
        return LiveTestAttempt.findOne({ sessionId, user: userId })
    }

    async createAttempt(payload) {
        return LiveTestAttempt.create(payload)
    }

    async findQuestionsForLiveTest(liveTestId) {
        return Question.find({
            test: liveTestId,
            isDeleted: false,
            status: 'active',
        })
            .select('en hi order sortOrder perQuestionTime subjectId chapterId topicId exam subExams')
            .populate('subjectId', 'name chapters')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()
    }

    async listAttemptsByUser(userId, filter = {}, options = {}) {
        const { paginate } = require('../../core/paginate')
        return paginate(
            LiveTestAttempt,
            { user: userId, ...filter },
            {
                ...options,
                sort: options.sort || { attemptedAt: -1 },
                populate: [
                    { path: 'liveTest', select: 'title duration totalQuestions totalMarks passingMarks' },
                ],
            }
        )
    }

    async getAttemptRank(liveTestId, score, timeTaken) {
        const higherRankCount = await LiveTestAttempt.countDocuments({
            liveTest: liveTestId,
            status: { $in: ['completed', 'abandoned'] },
            $or: [
                { score: { $gt: score } },
                { score: score, timeTaken: { $lt: timeTaken } }
            ]
        })
        const totalParticipants = await LiveTestAttempt.countDocuments({
            liveTest: liveTestId,
            status: { $in: ['completed', 'abandoned'] }
        })
        return {
            rank: higherRankCount + 1,
            totalParticipants
        }
    }
}

module.exports = new LiveTestRepository()
