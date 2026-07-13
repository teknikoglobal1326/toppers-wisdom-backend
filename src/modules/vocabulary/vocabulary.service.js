const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const vocabularyRepository = require('./vocabulary.repository')
const { VALID_TYPES } = require('./vocabulary.schema')
const VocabularyUserState = require('../../models/VocabularyUserState.model')

class VocabularyService extends BaseService {
    constructor() {
        super(vocabularyRepository, 'vocabulary')
    }

    buildFilter({ type, status, search, word, publishDate } = {}) {
        const filter = { isDeleted: false }

        if (type) {
            if (!VALID_TYPES.includes(type)) {
                throw new AppError('Invalid vocabulary type', 400, 'VALIDATION_ERROR')
            }
            filter.type = type
        }

        filter.status = status || 'active'

        if (word) {
            filter.word = new RegExp(word, 'i')
        }

        if (publishDate) {
            const baseDate = new Date(publishDate)
            if (Number.isNaN(baseDate.getTime())) {
                throw new AppError('Invalid publishDate', 400, 'VALIDATION_ERROR')
            }

            const startDate = new Date(baseDate)
            startDate.setHours(0, 0, 0, 0)

            const endDate = new Date(baseDate)
            endDate.setHours(23, 59, 59, 999)

            filter.publishDate = {
                $gte: startDate,
                $lte: endDate,
            }
        }

        if (search) {
            const rx = new RegExp(search, 'i')
            filter.$or = [
                { title: rx },
                { word: rx },
                { shortDescription: rx },
            ]
        }

        return filter
    }

    buildSort(query = {}) {
        const fallbackDirection = query.sortOrder === 'desc' ? -1 : 1
        const sortOrderDirection = query.sortOrderDirection ? (query.sortOrderDirection === 'desc' ? -1 : 1) : null
        const publishDateDirection = query.publishDateDirection ? (query.publishDateDirection === 'desc' ? -1 : 1) : null

        const sort = {}

        if (sortOrderDirection || publishDateDirection) {
            if (sortOrderDirection) sort.sortOrder = sortOrderDirection
            if (publishDateDirection) sort.publishDate = publishDateDirection

            if (!sortOrderDirection) sort.sortOrder = 1
            if (!publishDateDirection) sort.publishDate = -1
            sort.createdAt = -1
            return sort
        }

        const sortBy = query.sortBy || 'sortOrder'
        sort[sortBy] = fallbackDirection

        if (sortBy !== 'sortOrder') sort.sortOrder = 1
        if (sortBy !== 'publishDate') sort.publishDate = -1
        sort.createdAt = -1

        return sort
    }

    async getStateVocabularyIds(userId, listType) {
        if (!userId || listType === 'all') return []

        const filter = { user: userId }

        if (listType === 'read') {
            filter.isRead = true
        } else if (listType === 'bookmarked') {
            filter.isBookmarked = true
        } else if (listType === 'unread') {
            filter.$or = [{ isRead: true }, { isBookmarked: true }]
        }

        return VocabularyUserState.distinct('vocabulary', filter)
    }

    async buildListFilter(query = {}, userId) {
        const filter = this.buildFilter(query)
        const listType = query.listType || 'unread'

        if (!userId || listType === 'all') {
            return filter
        }

        const stateVocabularyIds = await this.getStateVocabularyIds(userId, listType)

        if (listType === 'read' || listType === 'bookmarked') {
            filter._id = { $in: stateVocabularyIds }
            return filter
        }

        if (stateVocabularyIds.length) {
            filter._id = { $nin: stateVocabularyIds }
        }

        return filter
    }

    async attachUserState(items = [], userId) {
        const vocabIds = items.map((item) => item._id)
        if (!userId || !vocabIds.length) {
            return items.map((item) => ({
                ...item,
                isRead: false,
                isBookmarked: false,
            }))
        }

        const states = await VocabularyUserState.find({ user: userId, vocabulary: { $in: vocabIds } }).lean()
        const stateMap = new Map(states.map((state) => [String(state.vocabulary), state]))

        return items.map((item) => {
            const state = stateMap.get(String(item._id))
            return {
                ...item,
                isRead: !!state?.isRead,
                isBookmarked: !!state?.isBookmarked,
                readAt: state?.readAt || null,
                bookmarkedAt: state?.bookmarkedAt || null,
            }
        })
    }

    async listAll(query = {}, userId) {
        const filter = await this.buildListFilter(query, userId)
        const sort = this.buildSort(query)

        const result = await this.getAll(filter, {
            page: query.page,
            limit: query.limit,
            sort,
            select: 'title type word pronunciation audio thumbnail bannerImage shortDescription longDescription usages synonyms antonyms publishDate sortOrder status createdAt updatedAt',
        })

        const data = await this.attachUserState(result.data, userId)
        return { ...result, data }
    }

    async getOne(id, userId) {
        const vocabulary = await vocabularyRepository.findOne({ _id: id, isDeleted: false, status: 'active' })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        const [withState] = await this.attachUserState([vocabulary], userId)
        return withState
    }

    async markAsRead(vocabularyId, userId) {
        const vocabulary = await vocabularyRepository.findOne({ _id: vocabularyId, isDeleted: false, })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        return VocabularyUserState.findOneAndUpdate(
            { user: userId, vocabulary: vocabularyId },
            {
                $set: { isRead: true, readAt: new Date() },
                $setOnInsert: { isBookmarked: false, bookmarkedAt: null },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean()
    }

    async setBookmark(vocabularyId, userId, isBookmarked = true) {
        const vocabulary = await vocabularyRepository.findOne({ _id: vocabularyId, isDeleted: false, })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        return VocabularyUserState.findOneAndUpdate(
            { user: userId, vocabulary: vocabularyId },
            {
                $set: {
                    isBookmarked,
                    bookmarkedAt: isBookmarked ? new Date() : null,
                },
                $setOnInsert: { isRead: false, readAt: null },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean()
    }
}

module.exports = new VocabularyService()