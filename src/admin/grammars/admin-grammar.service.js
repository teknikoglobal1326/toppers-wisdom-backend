const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const grammarRepository = require('../../modules/grammar/grammar.repository')

class AdminGrammarService extends BaseService {
  constructor() {
    super(grammarRepository, 'admin:grammar')
  }

  buildFilter({ status, title, topicName, search } = {}) {
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (title) filter.title = { $regex: title, $options: 'i' }
    if (topicName) filter.topicName = { $regex: topicName, $options: 'i' }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { topicName: { $regex: search, $options: 'i' } },
      ]
    }

    return filter
  }

  buildPayload(data = {}) {
    const payload = { ...data }

    if (typeof payload.chapters === 'string') {
      try {
        payload.chapters = JSON.parse(payload.chapters)
      } catch (_) {
        // Leave as-is; validation layer handles invalid shapes.
      }
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    if (Array.isArray(payload.chapters)) {
      payload.chapters = payload.chapters.map((chapter) => {
        if (typeof chapter === 'string') {
          return { chapterName: chapter, pdf: null, image: null, sortOrder: 0 }
        }

        const chapterPayload = { ...chapter }
        if (chapterPayload.title && !chapterPayload.chapterName) {
          chapterPayload.chapterName = chapterPayload.title
          delete chapterPayload.title
        }

        if (chapterPayload.pdf === '') chapterPayload.pdf = null
        if (chapterPayload.image === '') chapterPayload.image = null

        if (chapterPayload.sortOrder !== undefined && chapterPayload.sortOrder !== null && chapterPayload.sortOrder !== '') {
          const parsedChapterSortOrder = Number(chapterPayload.sortOrder)
          if (!Number.isNaN(parsedChapterSortOrder)) chapterPayload.sortOrder = parsedChapterSortOrder
        }

        return chapterPayload
      })
    }

    return payload
  }

  sortTopics(chapters = [], topicSortOrder = 'asc') {
    const direction = topicSortOrder === 'desc' ? -1 : 1
    return [...chapters].sort((a, b) => {
      const aSortOrder = Number.isFinite(a?.sortOrder) ? a.sortOrder : 0
      const bSortOrder = Number.isFinite(b?.sortOrder) ? b.sortOrder : 0
      return (aSortOrder - bSortOrder) * direction
    })
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
    })

    if (!query.topicSortOrder) {
      return result
    }

    const data = result.data.map((item) => ({
      ...item,
      chapters: this.sortTopics(item.chapters, query.topicSortOrder),
    }))

    return { ...result, data }
  }

  async getOne(id, topicSortOrder) {
    const grammar = await grammarRepository.findOne({ _id: id, isDeleted: false })
    if (!grammar) throw new AppError('Grammar not found', 404, 'NOT_FOUND')

    if (!topicSortOrder) return grammar

    return {
      ...grammar,
      chapters: this.sortTopics(grammar.chapters, topicSortOrder),
    }
  }

  async createGrammar(data) {
    return this.create(this.buildPayload(data))
  }

  async updateGrammar(id, data) {
    const existing = await grammarRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Grammar not found', 404, 'NOT_FOUND')
    return grammarRepository.updateById(id, this.buildPayload(data))
  }

  async softDelete(id) {
    const existing = await grammarRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Grammar not found', 404, 'NOT_FOUND')

    await grammarRepository.updateById(id, { isDeleted: true, status: 'inactive' })
    this.logger.info({ grammarId: id }, 'Grammar soft deleted')
  }
}

module.exports = new AdminGrammarService()
