const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialVocabularyRepository = require('../../modules/editorial-vocabulary/editorial-vocabulary.repository')

class AdminEditorialVocabularyService extends BaseService {
  constructor() {
    super(editorialVocabularyRepository, 'admin:editorial-vocabulary')
  }

  buildFilter({ editorailTest, editorialTest, status, search } = {}) {
    const filter = { isDeleted: false }

    const targetTest = editorailTest || editorialTest
    if (targetTest) filter.editorailTest = targetTest
    if (status) filter.status = status

    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { title: rx },
        { word: rx },
        { shortDescription: rx }
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
      populate: [
        { path: 'editorailTest', select: 'title status' }
      ]
    })
  }

  async getOne(id) {
    const vocab = await editorialVocabularyRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [
        { path: 'editorailTest', select: 'title status' }
      ] }
    )
    if (!vocab) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return vocab
  }

  normalizePayload(data = {}, adminId) {
    const payload = { ...data, updatedBy: adminId }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    if (Array.isArray(payload.usages)) {
      payload.usages = payload.usages.filter(Boolean)
    }
    if (Array.isArray(payload.synonyms)) {
      payload.synonyms = payload.synonyms.filter(Boolean)
    }
    if (Array.isArray(payload.antonyms)) {
      payload.antonyms = payload.antonyms.filter(Boolean)
    }

    return payload
  }

  async createVocab(data, adminId) {
    const payload = this.normalizePayload(data, adminId)
    payload.createdBy = adminId
    return this.create(payload)
  }

  async updateVocab(id, data, adminId) {
    const existing = await editorialVocabularyRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return editorialVocabularyRepository.updateById(id, this.normalizePayload(data, adminId))
  }

  async softDelete(id, adminId) {
    const existing = await editorialVocabularyRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return editorialVocabularyRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
  }
}

module.exports = new AdminEditorialVocabularyService()
