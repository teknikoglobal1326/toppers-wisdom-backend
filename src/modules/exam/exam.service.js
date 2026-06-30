const BaseService       = require('../../core/BaseService')
const examRepository    = require('./exam.repository')
const subExamRepository = require('../subexam/subexam.repository')

class ExamService extends BaseService {
  constructor() {
    super(examRepository, 'exam')
  }

  async listByQualification(qualificationId) {
    const exams = await examRepository.findAll(
      { qualification: qualificationId, status: 'active', is_deleted: false },
      { sort: { createdAt: -1 }, select: '_id name image' },
    )

    const examIds = exams.map((exam) => exam._id)
    const subExams = await subExamRepository.findAll(
      { examId: { $in: examIds }, status: 'active', is_deleted: false },
      { sort: { createdAt: -1 }, select: '_id name examId' },
    )

    return exams.map((exam) => ({
      ...exam,
      subExams: subExams
        .filter((subExam) => String(subExam.examId) === String(exam._id))
        .map(({ examId, ...rest }) => rest),
    }))
  }
}

module.exports = new ExamService()
