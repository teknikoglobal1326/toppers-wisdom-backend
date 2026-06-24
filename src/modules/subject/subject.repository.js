const BaseRepository = require('../../core/BaseRepository')
const Subject = require('../../models/Subject.model')

class SubjectRepository extends BaseRepository {
  constructor() {
    super(Subject, 'subject')
  }
}

module.exports = new SubjectRepository()
