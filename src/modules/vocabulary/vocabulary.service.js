const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const vocabularyRepository = require('./vocabulary.repository')
const { VALID_TYPES } = require('./vocabulary.schema')

class VocabularyService extends BaseService {
    constructor() {
        super(vocabularyRepository, 'vocabulary')
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
        else filter.status = 'active'

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
            select: 'title type word pronunciation audio thumbnail bannerImage shortDescription longDescription usages synonyms antonyms publishDate sortOrder status createdAt updatedAt',
        })
    }

    async getOne(id) {
        const vocabulary = await vocabularyRepository.findOne({ _id: id, isDeleted: false, status: 'active' })
        if (!vocabulary) throw new AppError('Vocabulary not found', 404, 'NOT_FOUND')
        return vocabulary
    }
}

module.exports = new VocabularyService()