const path = require('path')
const BaseService = require('../../core/BaseService')
const contentRepository = require('../../modules/content/content.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')
const { generatePublisherToken } = require('../../lib/agora')

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

  async listLiveClasses({ page, limit, status, course, topic, search, sortOrder } = {}) {
    const filter = { isDeleted: false, isLive: true }
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
    if (payload.subjectId && !payload.subject) payload.subject = payload.subjectId
    if (payload.topicId && !payload.topic) payload.topic = payload.topicId
    if (payload.chapterId && !payload.chapter) payload.chapter = payload.chapterId
    
    if (payload.subject && !Array.isArray(payload.subject)) payload.subject = [payload.subject]
    if (payload.topic && !Array.isArray(payload.topic)) payload.topic = [payload.topic]
    if (payload.chapter !== undefined) {
      if (payload.chapter === '' || payload.chapter === null) payload.chapter = []
      else if (!Array.isArray(payload.chapter)) payload.chapter = [payload.chapter]
    }

    delete payload.courseId
    delete payload.subjectId
    delete payload.topicId
    delete payload.chapterId
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

  async goLive(id) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    if (!content.isLive) throw new AppError('Content is not a live class', 400)
    
    if (!content.agoraChannel) {
      content.agoraChannel = `channel_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    }
    
    await contentRepository.updateById(id, { liveStatus: 'ongoing', agoraChannel: content.agoraChannel })
    
    const token = generatePublisherToken(content.agoraChannel)
    return { token, channel: content.agoraChannel }
  }

  async endLive(id) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    if (!content.isLive) throw new AppError('Content is not a live class', 400)
    
    await contentRepository.updateById(id, { liveStatus: 'completed' })
    return { message: 'Live class ended successfully' }
  }
}

const adminContentService = new AdminContentService()

adminContentService.attachUploadedFiles = async (req, _res, next) => {
  try {
    ['subject', 'topic', 'chapter', 'subjectId', 'topicId', 'chapterId'].forEach(field => {
      if (typeof req.body[field] === 'string' && req.body[field].startsWith('[')) {
        try { req.body[field] = JSON.parse(req.body[field]) } catch (e) {}
      }
    })
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
