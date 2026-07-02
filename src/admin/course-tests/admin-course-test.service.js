const BaseService = require('../../core/BaseService')
const courseTestRepository = require('../../modules/course-test/course-test.repository')
const AppError = require('../../core/AppError')

class AdminCourseTestService extends BaseService {
  constructor() {
    super(courseTestRepository, 'admin:course-test')
  }

  async listAll({ page, limit, status, course, topic, search } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ]
    }

    return this.getAll(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'topic', select: 'topicName' },
      ],
    })
  }

  async getOne(id) {
    const courseTest = await courseTestRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'topic', select: 'topicName chapters' },
        ],
      }
    )
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')
    return courseTest
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    if (payload.topicId && !payload.topic) payload.topic = payload.topicId
    delete payload.courseId
    delete payload.topicId
    if (payload.image === '') delete payload.image
    return payload
  }

  async createCourseTest(data) {
    return courseTestRepository.create(this.buildPayload(data))
  }

  async updateCourseTest(id, data) {
    const courseTest = await courseTestRepository.findOne({ _id: id, isDeleted: false })
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')
    return courseTestRepository.updateById(id, this.buildPayload(data))
  }

  async softDelete(id) {
    const courseTest = await courseTestRepository.findOne({ _id: id, isDeleted: false })
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')
    await courseTestRepository.updateById(id, { isDeleted: true })
    this.logger.info({ courseTestId: id }, 'Course test soft deleted')
  }
}

module.exports = new AdminCourseTestService()
