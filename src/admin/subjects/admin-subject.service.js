const BaseService        = require('../../core/BaseService')
const subjectRepository  = require('../../modules/subject/subject.repository')
const subExamRepository  = require('../../modules/subexam/subexam.repository')
const AppError           = require('../../core/AppError')

const SUB_EXAM_POPULATE = { path: 'subExamId', select: 'name shortDescription language status examId' }

class AdminSubjectService extends BaseService {
  constructor() {
    super(subjectRepository, 'admin:subject')
  }

  async assertSubExamExists(subExamId) {
    if (!subExamId) return
    const subExam = await subExamRepository.findOne({ _id: subExamId, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')
  }

  normalizeSortOrder(obj) {
    if (obj.sortOrder !== undefined && obj.sortOrder !== null && obj.sortOrder !== '') {
      const parsed = Number(obj.sortOrder)
      if (Number.isNaN(parsed)) delete obj.sortOrder
      else obj.sortOrder = parsed
    }
    return obj
  }

  buildTopicsPayload(topics) {
    if (!Array.isArray(topics)) return undefined
    return topics.map((topic) => {
      const topicPayload = this.normalizeSortOrder({ ...topic })
      if (Array.isArray(topicPayload.chapters)) {
        topicPayload.chapters = topicPayload.chapters.map((chapter) => {
          if (typeof chapter === 'string') return { name: chapter, sortOrder: 0 }
          return this.normalizeSortOrder({ ...chapter })
        })
      }
      return topicPayload
    })
  }

  buildPayload(data = {}) {
    const payload = this.normalizeSortOrder({ ...data })
    // language na diya ho to default 'en'
    if (!payload.language) payload.language = 'en'
    if (payload.topics !== undefined) {
      const topics = this.buildTopicsPayload(payload.topics)
      if (topics !== undefined) payload.topics = topics
    }
    return payload
  }

  async listAll({ status, subExamId, sortOrder, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (subExamId) filter.subExamId = subExamId
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: SUB_EXAM_POPULATE,
    })
  }

  async getOne(id) {
    const subject = await subjectRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: SUB_EXAM_POPULATE }
    )
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    return subject
  }

  async createSubject(data) {
    await this.assertSubExamExists(data.subExamId)
    return this.create(this.buildPayload(data))
  }

  // ---- Dual (hi + en together) creation is disabled for now ----
  // async createSubjectDual({ hi, en }) {
  //   await Promise.all([
  //     this.assertSubExamExists(hi.subExamId),
  //     this.assertSubExamExists(en.subExamId),
  //   ])
  //   const [hiResult, enResult] = await Promise.all([
  //     this.create({ ...this.buildPayload(hi), language: 'hi' }),
  //     this.create({ ...this.buildPayload(en), language: 'en' }),
  //   ])
  //   return [hiResult, enResult]
  // }

  async updateSubject(id, data) {
    const subject = await subjectRepository.findOne({ _id: id, isDeleted: false })
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND')
    if (data.subExamId) await this.assertSubExamExists(data.subExamId)
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