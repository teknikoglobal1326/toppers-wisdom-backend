const BaseRepository = require('../../core/BaseRepository')
const CourseTest = require('../../models/CourseTest.model')

class CourseTestRepository extends BaseRepository {
  constructor() {
    super(CourseTest, 'course-test')
  }
}

module.exports = new CourseTestRepository()
