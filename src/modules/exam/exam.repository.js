const BaseRepository = require('../../core/BaseRepository')
const Exam = require('../../models/Exam.model')

class ExamRepository extends BaseRepository {
  constructor() {
    super(Exam, 'exam')
  }
}

module.exports = new ExamRepository()
