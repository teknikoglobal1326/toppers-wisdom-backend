const BaseService = require('../../core/BaseService')
const EditorialTopic = require('../../models/EditorialTopic.model')
const AppError = require('../../core/AppError')

class AdminEditorialTopicService extends BaseService {
  constructor() {
    super(EditorialTopic, 'admin:editorial-topic')
  }

  async listTopics({ page, limit, search } = {}) {
    const filter = { isDeleted: false }

    if (search) {
      filter.name = { $regex: search, $options: 'i' }
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 20)
    const skip = (pageNum - 1) * limitNum

    const [total, data] = await Promise.all([
      EditorialTopic.countDocuments(filter),
      EditorialTopic.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ])

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  }

  async getTopic(id) {
    const topic = await EditorialTopic.findOne({ _id: id, isDeleted: false })
    if (!topic) throw new AppError('Editorial topic not found', 404, 'NOT_FOUND')
    return topic
  }

  async createTopic(data) {
    const topic = await EditorialTopic.create(data)
    return topic
  }

  async updateTopic(id, data) {
    const topic = await EditorialTopic.findOne({ _id: id, isDeleted: false })
    if (!topic) throw new AppError('Editorial topic not found', 404, 'NOT_FOUND')

    Object.assign(topic, data)
    await topic.save()
    return topic
  }

  async deleteTopic(id) {
    const topic = await EditorialTopic.findOne({ _id: id, isDeleted: false })
    if (!topic) throw new AppError('Editorial topic not found', 404, 'NOT_FOUND')

    topic.isDeleted = true
    await topic.save()
    return topic
  }
}

module.exports = new AdminEditorialTopicService()
