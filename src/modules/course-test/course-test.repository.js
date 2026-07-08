const BaseRepository = require('../../core/BaseRepository')
const CourseTest = require('../../models/CourseTest.model')

class CourseTestRepository extends BaseRepository {
  constructor() {
    super(CourseTest, 'course-test')
  }

  async findById(id, { select, populate } = {}) {
    try {
      let query = this.model.findById(id)
      if (select) query = query.select(select)
      if (populate) query = query.populate(populate)

      const result = await query.lean().exec()
      if (!result) throw new AppError(`Record not found!`, 404)
      return result
    } catch (err) {
      if (err instanceof AppError) throw err
      throw new AppError(err.message, 500)
    }
  }
}

module.exports = new CourseTestRepository()
