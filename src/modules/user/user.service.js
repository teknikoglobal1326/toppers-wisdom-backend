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

    async updateProfile(userId, data) {
        this.logger.info({ userId, fields: Object.keys(data) }, 'Updating profile')
        // inherited: this.update() checks existence then calls updateById
        return this.update(userId, data)
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
        return paginate(Notification, { user: userId }, { ...opts, sort: { createdAt: -1 } })
    }

    async markNotificationRead(userId, notifId) {
        return Notification.findOneAndUpdate({ _id: notifId, user: userId }, { isRead: true })
    }

    async updateFcmToken(userId, fcmToken) {
        return userRepository.updateById(userId, { fcmToken })
    }

    async createMcqReport(userId, data) {
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
}

module.exports = new UserService()
