const BaseRepository = require('../../core/BaseRepository')
const Qualification  = require('../../models/Qualification.model')
const ExamType       = require('../../models/ExamType.model')
const SubExam        = require('../../models/SubExam.model')

class QualificationRepository extends BaseRepository {
  constructor() { super(Qualification, 'qualification') }

  async getActiveExamTypes(qualificationId) {
    return ExamType.find({ qualification: qualificationId, isActive: true }).sort({ sortOrder: 1 }).lean()
  }

  async getActiveSubExams(examTypeId) {
    return SubExam.find({ examType: examTypeId, isActive: true }).sort({ sortOrder: 1 }).lean()
  }
}

module.exports = new QualificationRepository()
