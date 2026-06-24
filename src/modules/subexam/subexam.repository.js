const BaseRepository = require('../../core/BaseRepository')
const SubExam = require('../../models/SubExam.model')

class SubExamRepository extends BaseRepository {
  constructor() {
    super(SubExam, 'subexam')
  }
}

module.exports = new SubExamRepository()
