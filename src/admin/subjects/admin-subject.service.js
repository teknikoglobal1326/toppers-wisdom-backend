const BaseService        = require('../../core/BaseService')
const subjectRepository  = require('../../modules/subject/subject.repository')
const AppError           = require('../../core/AppError')

const EXAM_POPULATE = { path: 'examIds', select: 'name status qualification' }

class AdminSubjectService extends BaseService {
  constructor() {
    super(subjectRepository, 'admin:subject')
  }

  normalizeSortOrder(obj) {
    if (obj.sortOrder !== undefined && obj.sortOrder !== null && obj.sortOrder !== '') {
      const parsed = Number(obj.sortOrder)
      if (Number.isNaN(parsed)) delete obj.sortOrder
      else obj.sortOrder = parsed
    }
    return obj
  }

  buildChaptersPayload(chapters) {
    if (!Array.isArray(chapters)) return undefined
    return chapters.map((chapter) => {
      const chapterPayload = this.normalizeSortOrder({ ...chapter })
      if (Array.isArray(chapterPayload.topics)) {
        chapterPayload.topics = chapterPayload.topics.map((topic) => {
          if (typeof topic === 'string') return { name: topic, sortOrder: 0 }
          return this.normalizeSortOrder({ ...topic })
        })
      }
      return chapterPayload
    })
  }

  buildPayload(data = {}) {
    const payload = this.normalizeSortOrder({ ...data })
    for (const key of ['examIds', 'subExamIds']) {
      if (payload[key] !== undefined) {
        if (typeof payload[key] === 'string') {
          try {
            payload[key] = JSON.parse(payload[key])
          } catch (e) {
            payload[key] = payload[key].split(',').map(id => id.trim()).filter(Boolean)
          }
        }
        if (Array.isArray(payload[key])) {
          payload[key] = payload[key].filter(id => id && id !== 'null' && id !== 'undefined')
        }
      }
    }
    // language na diya ho to default 'en'
    if (!payload.language) payload.language = 'en'
    if (payload.chapters !== undefined) {
      const chapters = this.buildChaptersPayload(payload.chapters)
      if (chapters !== undefined) payload.chapters = chapters
    }
    return payload
  }

  async listAll({ status, examId, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (examId) filter.examIds = examId
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: EXAM_POPULATE,
    })
  }

  async getOne(id) {
    const subject = await subjectRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: EXAM_POPULATE }
    )
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    return subject
  }

  async createSubject(data) {
    return this.create(this.buildPayload(data))
  }

  async updateSubject(id, data) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    await subjectRepository.updateById(id, this.buildPayload(data))
    return this.getOne(id)
  }

  async softDelete(id) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')

    await subjectRepository.updateById(id, { isDeleted: true })
    this.logger.info({ subjectId: id }, 'Subject soft deleted (with nested topics & chapters)')
  }
}

module.exports = new AdminSubjectService()