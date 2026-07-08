const path = require('path')
const BaseService = require('../../core/BaseService')
const contentRepository = require('../../modules/content/content.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminContentService extends BaseService {
  constructor() {
    super(contentRepository, 'admin:content')
  }

  async listAll({ page, limit, status, course, topic, search, sortOrder } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'topic', select: 'topicName' },
      ],
    })
  }

  async getOne(id) {
    const content = await contentRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'topic', select: 'topicName chapters' },
        ],
      }
    )
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    return content
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    if (payload.topicId && !payload.topic) payload.topic = payload.topicId
    delete payload.courseId
    delete payload.topicId
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (payload.video === '') delete payload.video
    if (payload.image === '') delete payload.image
    return payload
  }

  async createContent(data) {
    return contentRepository.create(this.buildPayload(data))
  }

  async updateContent(id, data) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    return contentRepository.updateById(id, this.buildPayload(data))
  }

  async softDelete(id) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    await contentRepository.updateById(id, { isDeleted: true })
    this.logger.info({ contentId: id }, 'Content soft deleted')
  }
}

const adminContentService = new AdminContentService()

adminContentService.attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `contents/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.video?.[0]) {
      const file = req.files.video[0]
      const ext = path.extname(file.originalname) || '.mp4'
      req.body.video = await uploadFile(file.buffer, `video${ext}`, folder, file.mimetype)
    }

    if (req.files?.image?.[0]) {
      const file = req.files.image[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.image = await uploadFile(file.buffer, `image${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = adminContentService
