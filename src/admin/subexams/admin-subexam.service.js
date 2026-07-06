const BaseService      = require('../../core/BaseService')
const subExamRepository = require('../../modules/subexam/subexam.repository')
const examRepository   = require('../../modules/exam/exam.repository')
const AppError         = require('../../core/AppError')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminSubExamService extends BaseService {
  constructor() {
    super(subExamRepository, 'admin:subexam')
  }

  async listAll({ examId, status, page, limit } = {}) {
    const filter = { is_deleted: false }
    if (examId) filter.examId = examId
    if (status) filter.status = status
    return this.getAll(filter, { page, limit, sort: { createdAt: -1 } })
  }

  async getOne(id) {
    const subExam = await subExamRepository.findOne({ _id: id, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')
    return subExam
  }

  async createSubExam(data) {
    const exam = await examRepository.findOne({ _id: data.examId, is_deleted: false })
    if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')

    const subExam = await createWithLanguage((d) => subExamRepository.create(d), data)
    await examRepository.increment(data.examId, { subexamCount: Array.isArray(subExam) ? 2 : 1 })
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

    if (data.examId && String(data.examId) !== String(subExam.examId)) {
      const exam = await examRepository.findOne({ _id: data.examId, is_deleted: false })
      if (!exam) throw new AppError('Exam not found', 404, 'NOT_FOUND')
    }

    return subExamRepository.updateById(id, data)
  }

  async softDelete(id) {
    const subExam = await subExamRepository.findOne({ _id: id, is_deleted: false })
    if (!subExam) throw new AppError('SubExam not found', 404, 'NOT_FOUND')

    await subExamRepository.updateById(id, { is_deleted: true })
    await examRepository.updateOne(
      { _id: subExam.examId },
      { $inc: { subexamCount: -1 }, $max: { subexamCount: 0 } }
    )
    this.logger.info({ subExamId: id, examId: subExam.examId }, 'SubExam soft deleted')
  }
}

module.exports = new AdminSubExamService()
