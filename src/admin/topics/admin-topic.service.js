const BaseService = require('../../core/BaseService')
const topicRepository = require('../../modules/topic/topic.repository')
const AppError = require('../../core/AppError')

class AdminTopicService extends BaseService {
  constructor() {
    super(topicRepository, 'admin:topic')
  }

  async listAll({ page, limit, search, status, course, subject, chapter, topic, sortOrder } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (subject) filter.subjects = subject
    if (chapter) filter.chapters = chapter
    if (topic) filter.topics = topic

    if (search) {
      // search fallback if needed, but since chapters and topics are now ObjectIds,
      // we can only easily regex search other string fields if they existed on this schema.
      // Currently, no string fields are left to perform meaningful regex search, so we skip.
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'subjects', select: 'name' }
      ],
    })
  }

  async getOne(id) {
    const topic = await topicRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [
        { path: 'course', select: 'title slug' },
        { path: 'subjects', select: 'name' }
      ] }
    )
    if (!topic) throw new AppError('Topic not found', 404, 'NOT_FOUND')
    return topic
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) {
      payload.course = payload.courseId
    }
    delete payload.courseId

    if (payload.chapters && !Array.isArray(payload.chapters)) {
      payload.chapters = [payload.chapters]
    }

    if (payload.topics && !Array.isArray(payload.topics)) {
      payload.topics = [payload.topics]
    }

    if (payload.subjects && !Array.isArray(payload.subjects)) {
      payload.subjects = [payload.subjects]
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      payload.sortOrder = Number(payload.sortOrder)
      if (Number.isNaN(payload.sortOrder)) delete payload.sortOrder
    }

    return payload
  }

  async createTopic(data) {
    return this.create(this.buildPayload(data))
  }

  async updateTopic(id, data) {
    const topic = await topicRepository.findOne({ _id: id, isDeleted: false })
    if (!topic) throw new AppError('Topic not found', 404, 'NOT_FOUND')
    return topicRepository.updateById(id, this.buildPayload(data))
  }

  async softDelete(id) {
    const topic = await topicRepository.findOne({ _id: id, isDeleted: false })
    if (!topic) throw new AppError('Topic not found', 404, 'NOT_FOUND')
    await topicRepository.updateById(id, { isDeleted: true })
    this.logger.info({ topicId: id }, 'Topic soft deleted')
  }
}

module.exports = new AdminTopicService()
