const BaseRepository = require('../../core/BaseRepository')
const Faculty = require('../../models/Faculty.model')

class FacultyRepository extends BaseRepository {
  constructor() {
    super(Faculty, 'faculty')
  }
}

module.exports = new FacultyRepository()
