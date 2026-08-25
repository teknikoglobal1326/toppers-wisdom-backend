/**
 * UserService extends BaseService.
 * getById, update, count are inherited for FREE.
 * Only user-specific logic added here.
 */
const mongoose = require('mongoose')
const BaseService = require('../../core/BaseService')
const userRepository = require('./user.repository')
const Qualification = require('../../models/Qualification.model')
const ExamType = require('../../models/ExamType.model')
const SubExam = require('../../models/SubExam.model')
const CourseOrder = require('../../models/CourseOrder.model')
const Notification = require('../../models/Notification.model')
const TestAttempt = require('../../models/TestAttempt.model')
const Enrollment = require('../../models/Enrollment.model')
const Vocabulary = require('../../models/Vocabulary.model')
const VocabularyUserState = require('../../models/VocabularyUserState.model')
const Editorial = require('../../models/Editorial.model')
const UserEditorialLike = require('../../models/EditorialLike.model')
const UserReport = require('../../models/UserReport.model')
const Grammar = require('../../models/Grammar.model')
const UserGrammarChapterLike = require('../../models/GrammarChapterLike.model')
const AppError = require('../../core/AppError')
const { paginate } = require('../../core/paginate')
const { createLogger } = require('../../config/logger')
// const McqReport = require('../../models/UserMcqReport.model')
const McqReport = require("../../models/UserMcqReport")
const Subscription = require('../../models/Subscription.model')
const User = require('../../models/User.model')
const calendarExamRepository = require('../calendar-exam/calendar-exam.repository')


class UserService extends BaseService {
    constructor() {
        super(userRepository, 'user')
        this.logger = createLogger('user:service')
    }

    async getMe(userId) {
        this.logger.info({ userId }, 'Fetching profile')
        // inherited: this.getById() calls findByIdOrFail -> throws 404 automatically
        return this.getById(userId)
    }

    async getPremiumPlan(user) {
        const examId = user?.examId
        console.log("🚀 ~ examId:", examId)
        if (!examId) {
            return null
        }

        return Subscription.findOne({
            isPremium: true,
            isActive: true,
            isDeleted: false,
            $or: [
                { examId: examId },
                { examIds: examId }
            ]
        }).select('name price durationDays').lean()
    }

    async updateProfile(userId, data) {
        this.logger.info({ userId, fields: Object.keys(data) }, 'Updating profile')

        const User = require('../../models/User.model')
        const user = await User.findById(userId)
        if (!user) throw new AppError('User not found', 404)

        if (data.referralCode) {
            if (user.referredBy) {
                throw new AppError('Referral code already applied', 400, 'VALIDATION_ERROR')
            }

            const referrer = await User.findOne({ referralCode: data.referralCode, isDeleted: false })
            if (!referrer) {
                throw new AppError('Invalid referral code', 400, 'VALIDATION_ERROR')
            }
            if (referrer._id.toString() === userId.toString()) {
                throw new AppError('You cannot refer yourself', 400, 'VALIDATION_ERROR')
            }

            user.referredBy = referrer._id
            
            const rewardsService = require('../rewards/rewards.service')
            const ReferralHistory = require('../../models/ReferralHistory.model')
            try {
                // Add 25 coins to the referrer
                await rewardsService.addCoins(referrer._id, 25, 'referral', `Referral Bonus for inviting user`);
                // Add 25 coins to the referred user (customer)
                await rewardsService.addCoins(userId, 25, 'referral', `Referral Bonus for using referral code`);

                // Create referral history record
                await ReferralHistory.create({
                    referrer: referrer._id,
                    referredUser: userId,
                    referralCode: data.referralCode,
                    referrerCoinsAwarded: 25,
                    referredCoinsAwarded: 25,
                })
            } catch (err) {
                this.logger.error({ err }, 'Failed to award referral coins')
            }
        }

        if (data.name !== undefined) user.name = data.name
        if (data.email !== undefined) user.email = data.email
        if (data.language !== undefined) user.language = data.language
        if (data.avatar !== undefined) user.avatar = data.avatar

        await user.save()
        return user
    }

    async setupProfile(userId, data) {
        this.logger.info({ userId }, 'Profile setup')

        const [qualification, examType, subExam] = await Promise.all([
            Qualification.findById(data.qualificationId).lean(),
            ExamType.findById(data.examTypeId).lean(),
            SubExam.findById(data.subExamId).lean(),
        ])

        if (!qualification) throw new AppError('Qualification not found', 404)
        if (!examType) throw new AppError('Exam type not found', 404)
        if (!subExam) throw new AppError('Sub-exam not found', 404)

        const user = await userRepository.updateSubExam(userId, qualification, examType, subExam)
        this.logger.info({ userId, subExam: subExam.name }, 'Profile setup complete')
        return user
    }

    async getStats(userId) {
        this.logger.info({ userId }, 'Fetching stats')
        const [user, testAttempts, enrollments] = await Promise.all([
            userRepository.findById(userId, { select: 'watchDuration savedItems' }),
            TestAttempt.countDocuments({ user: userId }),
            Enrollment.countDocuments({ user: userId }),
        ])
        return { watchDuration: user?.watchDuration || 0, savedCount: user?.savedItems?.length || 0, testAttempts, enrollments }
    }

    async getCommonStudyStats(userId) {
        const normalizedUserId = mongoose.Types.ObjectId.isValid(userId)
            ? new mongoose.Types.ObjectId(userId)
            : userId

        const vocabularyTypes = ['pyp_dictionary', 'daily_vocab']
        const editorialTypes = ['daily_editorial', 'ncert_based']

        const [
            vocabularyTotals,
            vocabularyStates,
            editorialTotals,
            editorialStates,
            grammarChapters,
            grammarBookmarks,
            grammarReads,
        ] = await Promise.all([
            Vocabulary.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$type', totalWords: { $sum: 1 } } },
            ]),
            VocabularyUserState.aggregate([
                { $match: { user: normalizedUserId } },
                {
                    $lookup: {
                        from: 'vocabularies',
                        localField: 'vocabulary',
                        foreignField: '_id',
                        as: 'vocabulary',
                    },
                },
                { $unwind: '$vocabulary' },
                { $match: { 'vocabulary.isDeleted': false, 'vocabulary.status': 'active' } },
                {
                    $group: {
                        _id: { type: '$vocabulary.type', vocabulary: '$vocabulary._id' },
                        isRead: { $max: { $cond: ['$isRead', 1, 0] } },
                        isBookmarked: { $max: { $cond: ['$isBookmarked', 1, 0] } },
                    },
                },
                {
                    $group: {
                        _id: '$_id.type',
                        totalRead: { $sum: '$isRead' },
                        totalBookmarked: { $sum: '$isBookmarked' },
                    },
                },
            ]),
            Editorial.aggregate([
                { $match: { isDeleted: false } },
                { $group: { _id: '$type', totalWords: { $sum: 1 } } },
            ]),
            UserEditorialLike.aggregate([
                { $match: { userId: normalizedUserId } },
                {
                    $lookup: {
                        from: 'editorials',
                        localField: 'editorialId',
                        foreignField: '_id',
                        as: 'editorial',
                    },
                },
                { $unwind: '$editorial' },
                { $match: { 'editorial.isDeleted': false } },
                {
                    $group: {
                        _id: { type: '$editorial.type', editorial: '$editorial._id' },
                        isRead: { $max: { $cond: ['$isRead', 1, 0] } },
                        isBookmarked: { $max: { $cond: ['$isBookmarked', 1, 0] } },
                    },
                },
                {
                    $group: {
                        _id: '$_id.type',
                        totalRead: { $sum: '$isRead' },
                        totalBookmarked: { $sum: '$isBookmarked' },
                    },
                },
            ]),
            Grammar.aggregate([
                { $match: { isDeleted: false } },
                {
                    $group: {
                        _id: null,
                        totalChapters: { $sum: { $size: { $ifNull: ['$chapters', []] } } },
                    },
                },
            ]),
            UserGrammarChapterLike.aggregate([
                { $match: { userId: normalizedUserId, isBookmarked: true } },
                {
                    $lookup: {
                        from: 'grammars',
                        localField: 'grammarId',
                        foreignField: '_id',
                        as: 'grammar',
                    },
                },
                { $unwind: '$grammar' },
                { $match: { 'grammar.isDeleted': false } },
                {
                    $group: {
                        _id: { grammarId: '$grammarId', chapterId: '$chapterId' },
                    },
                },
                { $count: 'totalBookmarked' },
            ]),
            UserGrammarChapterLike.aggregate([
                { $match: { userId: normalizedUserId, isRead: true } },
                {
                    $lookup: {
                        from: 'grammars',
                        localField: 'grammarId',
                        foreignField: '_id',
                        as: 'grammar',
                    },
                },
                { $unwind: '$grammar' },
                { $match: { 'grammar.isDeleted': false } },
                {
                    $group: {
                        _id: { grammarId: '$grammarId', chapterId: '$chapterId' },
                    },
                },
                { $count: 'totalRead' },
            ]),
        ])

        const vocabularyTotalMap = new Map(vocabularyTotals.map((row) => [row._id, row.totalWords]))
        const vocabularyStateMap = new Map(vocabularyStates.map((row) => [row._id, row]))

        const vocabulary = vocabularyTypes.map((type) => {
            const state = vocabularyStateMap.get(type)
            return {
                type,
                totalWords: vocabularyTotalMap.get(type) || 0,
                totalRead: state?.totalRead || 0,
                totalBookmarked: state?.totalBookmarked || 0,
            }
        })

        const editorialTotalMap = new Map(editorialTotals.map((row) => [row._id, row.totalWords]))
        const editorialStateMap = new Map(editorialStates.map((row) => [row._id, row]))

        const editorial = editorialTypes.map((type) => {
            const state = editorialStateMap.get(type)
            return {
                type,
                totalWords: editorialTotalMap.get(type) || 0,
                totalRead: state?.totalRead || 0,
                totalBookmarked: state?.totalBookmarked || 0,
            }
        })

        return {
            vocabulary,
            editorial,
            grammar: {
                totalChapters: grammarChapters?.[0]?.totalChapters || 0,
                inProgress: 10,
                completed: grammarReads?.[0]?.totalRead || 0,
                totalBookmarked: grammarBookmarks?.[0]?.totalBookmarked || 0,
            },
        }
    }

    async getSaved(userId, opts) {
        const items = await userRepository.getSavedItems(userId)
        const page = Math.max(1, parseInt(opts.page) || 1)
        const limit = Math.min(50, parseInt(opts.limit) || 10)
        const data = items.slice((page - 1) * limit, page * limit)
        return { data, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) } }
    }

    async removeSaved(userId, itemId) {
        this.logger.info({ userId, itemId }, 'Removing saved item')
        return userRepository.removeSavedItem(userId, itemId)
    }

    async getOrders(userId, opts) {
        return paginate(CourseOrder, { user: userId }, { ...opts, sort: { createdAt: -1 } })
    }

    async getNotifications(userId, opts) {
        return paginate(Notification, { user: userId, isDeleted: { $ne: true } }, { ...opts, sort: { createdAt: -1 } })
    }

    async getUnreadNotificationCount(userId) {
        return Notification.countDocuments({ user: userId, isRead: false, isDeleted: { $ne: true } })
    }

    async markNotificationRead(userId, notifId) {
        return Notification.findOneAndUpdate({ _id: notifId, user: userId }, { isRead: true })
    }

    async deleteNotification(userId, notifId) {
        return Notification.findOneAndUpdate({ _id: notifId, user: userId }, { isDeleted: true })
    }

    async updateFcmToken(userId, data) {
        const { fcmToken, deviceId, deviceName, deviceType, modelName, versionCode } = data
        const updated = await userRepository.updateById(userId, { fcmToken, deviceId, deviceName, deviceType, modelName, versionCode })
        return {
            fcmToken: updated.fcmToken,
            deviceId: updated.deviceId,
            deviceName: updated.deviceName,
            deviceType: updated.deviceType,
            modelName: updated.modelName,
            versionCode: updated.versionCode
        }
    }

    async createMcqReport(userId, data) {
        const existing = await McqReport.findOne({ user: userId, type: data.type, typeId: data.typeId, reason: data.reason }).lean()
        if (existing) {
            throw new AppError('You have already submitted a report for this item with the same reason.', 400, 'ALREADY_REPORTED')
        }

        const report = await McqReport.create({
            user: userId,
            type: data.type,
            typeId: data.typeId,
            reason: data.reason,
            description: data.description,
        })

        return report.toObject()
    }

    async getMyMcqReportByItemId(userId, itemId) {
        const report = await McqReport.findOne({
            user: userId,
            typeId: itemId,
        })
            .sort({ createdAt: -1 })
            .lean()

        if (!report) {
            throw new AppError('Report not found', 404, 'NOT_FOUND')
        }

        return report
    }

    async getMyMcqReports(userId, opts = {}) {
        const result = await paginate(
            McqReport,
            { user: userId },
            {
                ...opts,
                sort: { createdAt: -1 }
            }
        )

        const typeGroups = {}
        result.data.forEach(item => {
            const modelName = 'Question'
            if (item.typeId) {
                if (!typeGroups[modelName]) typeGroups[modelName] = []
                typeGroups[modelName].push(item.typeId)
            }
        })

        const fetchedItems = {}
        await Promise.all(
            Object.keys(typeGroups).map(async modelName => {
                const Model = mongoose.model(modelName)
                const selectFields = 'en hi test status'
                const docs = await Model.find({ _id: { $in: typeGroups[modelName] } }).select(selectFields).lean()
                docs.forEach(doc => {
                    fetchedItems[doc._id.toString()] = doc
                })
            })
        )

        const plainData = result.data.map(item => typeof item.toObject === 'function' ? item.toObject() : item)

        result.data = plainData.map(item => {
            const doc = fetchedItems[item.typeId?.toString()] || null
            return {
                ...item,
                typeId: doc || item.typeId
            }
        })

        console.log("result=====>", result);
        return result
    }

    async createReport(userId, data) {
        const itemModel = data.itemType === 'vocabulary' ? Vocabulary : Editorial
        const item = await itemModel.findOne({ _id: data.itemId, isDeleted: false }).lean()

        if (!item) {
            throw new AppError(`${data.itemType} not found`, 404, 'NOT_FOUND')
        }

        const report = await UserReport.create({
            user: userId,
            itemType: data.itemType,
            itemId: item._id,
            contentType: item.type || data.itemType,
            itemTitle: item.title || item.word || '',
            description: data.description,
        })

        return report.toObject()
    }

    async getMyReports(userId, opts = {}) {
        return paginate(
            UserReport,
            { user: userId, isDeleted: false },
            {
                ...opts,
                sort: { reportedAt: -1, createdAt: -1 },
            }
        )
    }

    async getMyReportByItemId(userId, itemId) {
        const report = await UserReport.findOne({
            user: userId,
            itemId,
            isDeleted: false,
        }).sort({ reportedAt: -1, createdAt: -1 }).lean()

        if (!report) {
            throw new AppError('Report not found', 404, 'NOT_FOUND')
        }

        return report
    }

    async saveQuestion(userId, data) {
        const Question = require('../../models/Question.model')
        const SavedQuestion = require('../../models/SavedQuestion.model')

        const question = await Question.findOne({ _id: data.questionId, isDeleted: false }).lean()
        if (!question) {
            throw new AppError('Question not found', 404, 'NOT_FOUND')
        }

        const existing = await SavedQuestion.findOne({ user: userId, question: data.questionId }).lean()
        if (existing) {
            return existing
        }

        const saved = await SavedQuestion.create({
            user: userId,
            question: data.questionId,
            testType: data.testType,
            testId: data.testId,
        })

        return saved.toObject()
    }

    async unsaveQuestion(userId, questionId) {
        const SavedQuestion = require('../../models/SavedQuestion.model')
        const result = await SavedQuestion.deleteOne({ user: userId, question: questionId })
        if (result.deletedCount === 0) {
            throw new AppError('Saved question not found', 404, 'NOT_FOUND')
        }
        return { success: true }
    }

    async getSavedQuestions(userId, opts = {}) {
        const SavedQuestion = require('../../models/SavedQuestion.model')
        return paginate(
            SavedQuestion,
            { user: userId },
            {
                ...opts,
                populate: {
                    path: 'question',
                    // select: 'en.question.text hi.question.text'
                },
                sort: { createdAt: -1 }
            }
        )
    }

    async getExamCalendar(userId) {
        this.logger.info({ userId }, 'Fetching exam calendar')
        const user = await User.findById(userId).select('exam subExam subExams').lean()
        if (!user) throw new AppError('User not found', 404)

        const filter = { isDeleted: false, status: 'active' }
        const orConditions = []

        if (user.exam && user.exam._id) {
            orConditions.push({ exams: user.exam._id })
        }
        if (user.subExam && user.subExam._id) {
            orConditions.push({ subExams: user.subExam._id })
        }
        if (user.subExams && user.subExams.length > 0) {
            const subExamIds = user.subExams.map(se => se._id)
            orConditions.push({ subExams: { $in: subExamIds } })
        }

        if (orConditions.length > 0) {
            filter.$or = orConditions
        } else {
            return []
        }

        return calendarExamRepository.findAll(filter, {
            select: 'title image publishDate exams subExams',
            sort: { sortOrder: 1, publishDate: -1 },
            populate: [
                { path: 'exams', select: 'name' },
                { path: 'subExams', select: 'name' }
            ]
        })
    }

    async sendTestNotification(userId, data = {}) {
        const { notificationQueue } = require('../../jobs/queue')
        const title = data.title || 'Test Notification'
        const body = data.body || 'This is a test notification from the backend.'
        await notificationQueue.add('broadcast', {
            userId,
            title,
            body,
            data: { type: 'test' }
        })
        return { success: true, message: 'Test notification queued successfully' }
    }
}

module.exports = new UserService()
