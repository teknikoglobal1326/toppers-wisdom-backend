const BaseService = require('../../core/BaseService')
const topicRepository = require('../../modules/topic/topic.repository')
const AppError = require('../../core/AppError')

class AdminTopicService extends BaseService {
  constructor() {
    super(topicRepository, 'admin:topic')
  }

  async listAll({ page, limit, search, status, course, chapter, sortOrder } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (chapter) filter['chapters.title'] = { $regex: chapter, $options: 'i' }

    if (search) {
      filter.$or = [
        { topicName: { $regex: search, $options: 'i' } },
        { 'chapters.title': { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: { path: 'course', select: 'title slug' },
    })
  }

  async getOne(id) {
    const topic = await topicRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: { path: 'course', select: 'title slug' } }
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

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      payload.sortOrder = Number(payload.sortOrder)
      if (Number.isNaN(payload.sortOrder)) delete payload.sortOrder
    }

    if (Array.isArray(payload.chapters)) {
      payload.chapters = payload.chapters.map((chapter) => {
        if (typeof chapter === 'string') {
          return { title: chapter, sortOrder: 0 }
        }

        const chapterPayload = { ...chapter }
        if (chapterPayload.sortOrder !== undefined && chapterPayload.sortOrder !== null && chapterPayload.sortOrder !== '') {
          chapterPayload.sortOrder = Number(chapterPayload.sortOrder)
          if (Number.isNaN(chapterPayload.sortOrder)) delete chapterPayload.sortOrder
        }
        return chapterPayload
      })
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
