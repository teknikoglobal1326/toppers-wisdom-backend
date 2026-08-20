const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialQuestionRepository = require('../../modules/editorial-question/editorial-question.repository')

class AdminEditorialQuestionService extends BaseService {
  constructor() {
    super(editorialQuestionRepository, 'admin:editorial-question')
  }

  buildFilter({ test, testId, subject, subjectId, chapter, chapterId, topic, topicId, status, search } = {}) {
    const filter = { isDeleted: false }
    const targetTest = test || testId
    if (targetTest) filter.$or = [{ test: targetTest }, { testId: targetTest }]

    const targetSubject = subject || subjectId
    if (targetSubject) filter.$or = [{ subject: targetSubject }, { subjectId: targetSubject }]

    const targetChapter = chapter || chapterId
    if (targetChapter) filter.$or = [{ chapter: targetChapter }, { chapterId: targetChapter }]

    const targetTopic = topic || topicId
    if (targetTopic) filter.$or = [{ topic: targetTopic }, { topicId: targetTopic }]

    if (status) filter.status = status
    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { 'question.en.text': rx },
        { 'question.hi.text': rx },
        { 'explanation.en.text': rx },
        { 'explanation.hi.text': rx },
      ]
    }
    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'
    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
      populate: [
        { path: 'test', select: 'title status' },
        { path: 'subject', select: 'name' },
        { path: 'subjectId', select: 'name' },
      ],
    })

    if (!query.lang) return result

    return {
      ...result,
      data: result.data.map((item) => this.mapByLang(item, query.lang)),
    }
  }

  mapByLang(item, lang) {
    if (!lang) return item

    const mapped = { ...item }
    mapped.question = mapped.question?.[lang] || { text: '', image: '' }
    mapped.explanation = mapped.explanation?.[lang] || { text: '', image: '' }
    mapped.options = Array.isArray(mapped.options)
      ? mapped.options.map((option) => option?.[lang] || { text: '', image: '' })
      : []

    return mapped
  }

  normalizePayload(data = {}, adminId) {
    const payload = { ...data, updatedBy: adminId }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    // Standardize test / testId
    const tId = payload.test || payload.testId || null
    payload.test = tId === '' ? null : tId
    payload.testId = tId === '' ? null : tId

    // Standardize subject / subjectId
    const sId = payload.subject || payload.subjectId || null
    payload.subject = sId === '' ? null : sId
    payload.subjectId = sId === '' ? null : sId

    // Standardize chapter / chapterId
    const cId = payload.chapter || payload.chapterId || null
    payload.chapter = cId === '' ? null : cId
    payload.chapterId = cId === '' ? null : cId

    // Standardize topic / topicId
    const tpId = payload.topic || payload.topicId || null
    payload.topic = tpId === '' ? null : tpId
    payload.topicId = tpId === '' ? null : tpId

    return payload
  }

  async getOne(id, lang) {
    const question = await editorialQuestionRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'test', select: 'title status' },
          { path: 'subject', select: 'name' },
          { path: 'subjectId', select: 'name' },
        ],
      }
    )
    if (!question) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    return this.mapByLang(question, lang)
  }

  async createEditorialQuestion(data, adminId) {
    const payload = this.normalizePayload(data, adminId)
    payload.createdBy = adminId
    return this.create(payload)
  }

  async updateEditorialQuestion(id, data, adminId) {
    const existing = await editorialQuestionRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    return editorialQuestionRepository.updateById(id, this.normalizePayload(data, adminId))
  }

  async softDelete(id, adminId) {
    const existing = await editorialQuestionRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    return editorialQuestionRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
  }
}

module.exports = new AdminEditorialQuestionService()