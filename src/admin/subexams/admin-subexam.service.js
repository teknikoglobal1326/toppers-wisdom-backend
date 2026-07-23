const BaseService      = require('../../core/BaseService')
const subExamRepository = require('../../modules/subexam/subexam.repository')
const examRepository   = require('../../modules/exam/exam.repository')
const AppError         = require('../../core/AppError')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminSubExamService extends BaseService {
  constructor() {
    super(subExamRepository, 'admin:subexam')
  }

  async listAll({ examId, status, sortOrder, page, limit, search } = {}) {
    const filter = { is_deleted: false }
    if (examId) filter.examId = examId
    if (status) filter.status = status
    if (search) filter.name = new RegExp(search, 'i')
    const direction = sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page, limit, sort: { sortOrder: direction, createdAt: -1 }, populate: { path: "examId", select: "name" } })
  }

  async getOne(id) {
    const subExam = await subExamRepository.findOne({ _id: id, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')
    return subExam
  }

  async createSubExam(data) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    const exam = await examRepository.findOne({ _id: payload.examId, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')

    const subExam = await createWithLanguage((d) => subExamRepository.create(d), payload)
    await examRepository.increment(payload.examId, { subexamCount: Array.isArray(subExam) ? 2 : 1 })
    return subExam
  }

  async createSubExamDual({ hi, en }) {
    const examId = hi.examId
    const exam = await examRepository.findOne({ _id: examId, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')

    const [hiResult, enResult] = await Promise.all([
      subExamRepository.create({ ...hi, language: 'hi' }),
      subExamRepository.create({ ...en, language: 'en' }),
    ])
    await examRepository.increment(examId, { subexamCount: 2 })
    return [hiResult, enResult]
  }

  async updateSubExam(id, data) {
    const subExam = await subExamRepository.findOne({ _id: id, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')

    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    if (payload.examId && String(payload.examId) !== String(subExam.examId)) {
      const exam = await examRepository.findOne({ _id: payload.examId, is_deleted: false })
      if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    }

    return subExamRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const subExam = await subExamRepository.findOne({ _id: id, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')

    await subExamRepository.updateById(id, { is_deleted: true })
    await examRepository.updateOne({ _id: subExam.examId }, { $inc: { subexamCount: -1 } })
    await examRepository.updateOne({ _id: subExam.examId, subexamCount: { $lt: 0 } }, { subexamCount: 0 })
    this.logger.info({ subExamId: id, examId: subExam.examId }, 'SubExam soft deleted')
  }
}

module.exports = new AdminSubExamService()
