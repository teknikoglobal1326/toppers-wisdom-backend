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

  async listAll({ page, limit, status, course, chapter, topic, search, sortBy = 'sortOrder', order = 'asc' } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (chapter) filter.chapter = chapter
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const direction = order === 'desc' ? -1 : 1
    const sort = sortBy === 'createdAt'
      ? { createdAt: direction, sortOrder: 1 }
      : { sortOrder: direction, createdAt: -1 }

    return this.getAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: 'course', select: 'title slug' },
      ],
    })
  }

  async listLiveClasses({ page, limit, status, course, chapter, topic, search, sortBy = 'sortOrder', order = 'asc' } = {}) {
    const filter = { isDeleted: false, isLive: true }
    if (status) filter.status = status
    if (course) filter.course = course
    if (chapter) filter.chapter = chapter
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const direction = order === 'desc' ? -1 : 1
    const sort = sortBy === 'createdAt'
      ? { createdAt: direction, sortOrder: 1 }
      : { sortOrder: direction, createdAt: -1 }

    return this.getAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: 'course', select: 'title slug' },
      ],
    })
  }

  async getOne(id) {
    const content = await contentRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
        ],
      }
    )
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')

    if (content.isLive && content.liveStatus === 'ongoing') {
      const contentObj = content.toObject()
      
      // Fallback if not stored yet in database
      if (!contentObj.rtmpServer && contentObj.agoraChannel) {
        const rtmpUid = 666666
        const token = generatePublisherToken(contentObj.agoraChannel, rtmpUid)
        const rtmpServer = "rtmp://rtls-ingress-prod-ap.agoramdn.com/live/"
        const rtmpStreamKey = `${contentObj.agoraChannel}?token=${token}&uid=${rtmpUid}`

        contentObj.token = token
        contentObj.rtmpServer = rtmpServer
        contentObj.rtmpStreamKey = rtmpStreamKey
        contentObj.rtmpUrl = `${rtmpServer}${rtmpStreamKey}`
      } else {
        contentObj.token = contentObj.agoraToken
      }
      return contentObj
    }

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
    if (payload.restreamUrls !== undefined) {
      if (Array.isArray(payload.restreamUrls)) {
        payload.restreamUrls = payload.restreamUrls.filter(Boolean)
      } else if (typeof payload.restreamUrls === 'string') {
        payload.restreamUrls = payload.restreamUrls.split(',').map(url => url.trim()).filter(Boolean)
      } else {
        payload.restreamUrls = []
      }
    }
    if (payload.agoraConverters !== undefined) {
      if (Array.isArray(payload.agoraConverters)) {
        payload.agoraConverters = payload.agoraConverters.filter(Boolean)
      } else if (typeof payload.agoraConverters === 'string') {
        payload.agoraConverters = payload.agoraConverters.split(',').map(item => item.trim()).filter(Boolean)
      } else {
        payload.agoraConverters = []
      }
    }
    if (payload.video === '') delete payload.video
    if (payload.image === '') delete payload.image

    console.log("payload==========================.>", payload);
    return payload
  }

  async createContent(data) {
    return contentRepository.create(this.buildPayload(data))
  }

  async updateContent(id, data) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')

    const payload = this.buildPayload(data)
    if (content.isLive) {
      if (payload.restreamUrls === undefined && !content.restreamUrls) {
        payload.restreamUrls = []
      }
      if (payload.agoraConverters === undefined && !content.agoraConverters) {
        payload.agoraConverters = []
      }
    }

    return contentRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    await contentRepository.updateById(id, { isDeleted: true })
    this.logger.info({ contentId: id }, 'Content soft deleted')
  }

  async goLive(id, body = {}) {
    const axios = require('axios')
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    if (!content.isLive) throw new AppError('Content is not a live class', 400)

    if (!content.agoraChannel) {
      content.agoraChannel = `channel_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    }

    const appId = process.env.AGORA_APP_ID
    const customerId = process.env.AGORA_CUSTOMER_ID
    const customerCert = process.env.AGORA_CUSTOMER_CERTIFICATE

    const rtmpUid = 666666
    const token = generatePublisherToken(content.agoraChannel, rtmpUid)
    const rtmpServer = "rtmp://rtls-ingress-prod-ap.agoramdn.com/live/"
    let rtmpStreamKey = `${content.agoraChannel}?token=${token}&uid=${rtmpUid}`

    if (appId && customerId && customerCert) {
      const url = `https://api.agora.io/ap/v1/projects/${appId}/rtls/ingress/streamkeys`
      try {
        const auth = Buffer.from(`${customerId}:${customerCert}`).toString('base64')
        const res = await axios.post(url, {
          cname: content.agoraChannel,
          uid: rtmpUid
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        })
        if (res.data && res.data.data && res.data.data.streamKey) {
          rtmpStreamKey = res.data.data.streamKey
          this.logger.info({ streamKey: rtmpStreamKey }, 'Agora Media Ingress streamkey generated successfully via REST API')
        }
      } catch (err) {
        const errorDetail = {
          message: err.message,
          status: err.response?.status,
          data: err.response?.data,
          requestBody: {
            cname: content?.agoraChannel,
            uid: rtmpUid
          },
          url,
          stack: err.stack
        }
        require('fs').writeFileSync('agora-api-error.log', JSON.stringify(errorDetail, null, 2))
        this.logger.error({ err: err.response?.data || err.message }, 'Failed to generate Agora Media Ingress streamkey via REST API')
      }
    }

    // Parse restream URLs from body
    let restreamUrls = []
    if (Array.isArray(body.restreamUrls)) {
      restreamUrls = body.restreamUrls.filter(Boolean)
    } else if (typeof body.restreamUrls === 'string' && body.restreamUrls) {
      restreamUrls = body.restreamUrls.split(',').map(url => url.trim()).filter(Boolean)
    }

    const agoraConverters = []

    // If restream URLs are provided, start the Agora RTMP Converter for each
    if (restreamUrls.length > 0) {
      const appId = process.env.AGORA_APP_ID
      const customerId = process.env.AGORA_CUSTOMER_ID
      const customerCert = process.env.AGORA_CUSTOMER_CERTIFICATE

      if (!appId || !customerId || !customerCert) {
        this.logger.warn({ appId, hasCustomerId: !!customerId, hasCustomerCert: !!customerCert }, 'Cannot start restreaming: Agora App ID, Customer ID, or Customer Certificate is missing')
      } else {
        const auth = Buffer.from(`${customerId}:${customerCert}`).toString('base64')

        for (let i = 0; i < restreamUrls.length; i++) {
          const publishUrl = restreamUrls[i]
          const converterId = `${id}_restream_${i}_${Date.now()}`

          try {
            const url = `https://api.agora.io/v1/projects/${appId}/rtmp-converters`
            await axios.post(url, {
              converterId,
              channelName: content.agoraChannel,
              publishUrl,
              transcodingEnabled: false
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
              }
            })
            agoraConverters.push(converterId)
            this.logger.info({ converterId, publishUrl }, 'Agora RTMP converter started successfully')
          } catch (err) {
            this.logger.error({ err: err.response?.data || err.message, publishUrl }, 'Failed to start Agora RTMP converter')
          }
        }
      }
    }

    await contentRepository.updateById(id, {
      liveStatus: 'ongoing',
      agoraChannel: content.agoraChannel,
      restreamUrls,
      agoraConverters,
      rtmpServer,
      rtmpStreamKey,
      rtmpUrl: `${rtmpServer}${rtmpStreamKey}`,
      agoraToken: token
    })

    return {
      token,
      channel: content.agoraChannel,
      rtmpServer,
      rtmpStreamKey,
      rtmpUrl: `${rtmpServer}${rtmpStreamKey}`,
      agoraConverters
    }
  }

  async endLive(id) {
    const axios = require('axios')
    const content = await contentRepository.findOne({ _id: id, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    if (!content.isLive) throw new AppError('Content is not a live class', 400)

    // Stop all active Agora converters
    const converters = content.agoraConverters || []
    if (converters.length > 0) {
      const appId = process.env.AGORA_APP_ID
      const customerId = process.env.AGORA_CUSTOMER_ID
      const customerCert = process.env.AGORA_CUSTOMER_CERTIFICATE

      if (appId && customerId && customerCert) {
        const auth = Buffer.from(`${customerId}:${customerCert}`).toString('base64')
        for (const converterId of converters) {
          try {
            const url = `https://api.agora.io/v1/projects/${appId}/rtmp-converters/${converterId}`
            await axios.delete(url, {
              headers: {
                'Authorization': `Basic ${auth}`
              }
            })
            this.logger.info({ converterId }, 'Agora RTMP converter stopped successfully')
          } catch (err) {
            this.logger.error({ err: err.response?.data || err.message, converterId }, 'Failed to stop Agora RTMP converter')
          }
        }
      }
    }

    await contentRepository.updateById(id, {
      liveStatus: 'completed',
      restreamUrls: [],
      agoraConverters: [],
      rtmpServer: '',
      rtmpStreamKey: '',
      rtmpUrl: '',
      agoraToken: ''
    })

    return { message: 'Live class ended successfully' }
  }
}

const adminContentService = new AdminContentService()

adminContentService.attachUploadedFiles = async (req, _res, next) => {
  try {
    ['subject', 'topic', 'chapter', 'subjectId', 'topicId', 'chapterId', 'restreamUrls', 'agoraConverters'].forEach(field => {
      if (typeof req.body[field] === 'string' && req.body[field].startsWith('[')) {
        try { req.body[field] = JSON.parse(req.body[field]) } catch (e) { }
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
