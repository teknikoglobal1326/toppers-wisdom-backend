const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const vocabularyRepository = require('../../modules/vocabulary/vocabulary.repository')
const { VALID_TYPES } = require('./admin-vocabulary.schema')

class AdminVocabularyService extends BaseService {
    constructor() {
        super(vocabularyRepository, 'admin:vocabulary')
    }

    buildFilter({ type, status, search, word } = {}) {
        const filter = { isDeleted: false }

        if (type) {
            if (!VALID_TYPES.includes(type)) {
                throw new AppError('Invalid vocabulary type', 400, 'VALIDATION_ERROR')
            }
            filter.type = type
        }

        if (status) filter.status = status

        if (word) {
            filter.word = new RegExp(word, 'i')
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

    async listAll(query = {}) {
        const filter = this.buildFilter(query)
        const direction = query.sortOrder === 'desc' ? -1 : 1
        const sortBy = query.sortBy || 'sortOrder'

        return this.getAll(filter, {
            page: query.page,
            limit: query.limit,
            sort: { [sortBy]: direction, createdAt: -1 },
        })
    }

    async getOne(id) {
        const vocabulary = await vocabularyRepository.findOne({ _id: id, isDeleted: false })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')
        return vocabulary
    }

    async createVocabulary(data, adminId) {
        const payload = { ...data, createdBy: adminId, updatedBy: adminId }
        if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
            const parsedSortOrder = Number(payload.sortOrder)
            if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
        }
        return this.create(payload)
    }

    async updateVocabulary(id, data, adminId) {
        const existing = await vocabularyRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        const payload = { ...data, updatedBy: adminId }
        if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
            const parsedSortOrder = Number(payload.sortOrder)
            if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
        }

        return vocabularyRepository.updateById(id, payload)
    }

    async softDelete(id, adminId) {
        const existing = await vocabularyRepository.findOne({ _id: id, isDeleted: false })
        if (!existing) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')

        return vocabularyRepository.updateById(id, {
            isDeleted: true,
            status: 'inactive',
            updatedBy: adminId,
        })
    }
}

module.exports = new AdminVocabularyService()