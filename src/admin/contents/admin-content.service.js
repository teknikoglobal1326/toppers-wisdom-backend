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
    const filter = { isDeleted: false, isLive: { $ne: true } }
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

    const result = await this.getAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: 'course', select: 'title slug' },
      ],
    })

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
      this.repository.count({ isDeleted: false, isLive: { $ne: true } }),
      this.repository.count({ isDeleted: false, isLive: { $ne: true }, status: 'active' }),
      this.repository.count({ isDeleted: false, isLive: { $ne: true }, status: 'inactive' }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalActive = globalActive
    result.pagination.globalInactive = globalInactive

    return result
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

    const result = await this.getAll(filter, {
      page,
      limit,
      sort,
      populate: [
        { path: 'course', select: 'title slug' },
      ],
    })

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
      this.repository.count({ isDeleted: false, isLive: true }),
      this.repository.count({ isDeleted: false, isLive: true, status: 'active' }),
      this.repository.count({ isDeleted: false, isLive: true, status: 'inactive' }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalActive = globalActive
    result.pagination.globalInactive = globalInactive

    return result
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

  async bulkUpload(file, common = {}, adminId) {
    if (!file) throw new AppError('Excel or Word metadata file is required', 400, 'VALIDATION_ERROR')

    const extension = path.extname(file.originalname).toLowerCase()
    let rawRows = []

    if (extension === '.xlsx' || extension === '.xls') {
      const XLSX = require('xlsx')
      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    } else if (extension === '.docx' || extension === '.doc') {
      const mammoth = require('mammoth')
      const cheerio = require('cheerio')
      const { value: html } = await mammoth.convertToHtml({ buffer: file.buffer })
      const $ = cheerio.load(html)
      
      $("table").each((_, tableDom) => {
        const tableRows = $(tableDom).find("tr")
        if (tableRows.length < 2) return
        
        const headers = []
        $(tableRows[0]).find("td, th").each((_, cell) => {
          headers.push($(cell).text().trim().toLowerCase().replace(/[\s_-]+/g, ""))
        })
        
        for (let i = 1; i < tableRows.length; i++) {
          const cells = $(tableRows[i]).find("td")
          const rowData = {}
          cells.each((cIdx, cell) => {
            const header = headers[cIdx]
            if (header) {
              rowData[header] = $(cell).text().trim()
            }
          })
          if (Object.keys(rowData).length > 0) {
            rawRows.push(rowData)
          }
        }
      })
    } else {
      throw new AppError('Unsupported file type. Use Excel (.xlsx, .xls) or Word (.docx, .doc) files.', 400, 'VALIDATION_ERROR')
    }

    const payloadArray = []
    const Subject = require('../../models/Subject.model')

    for (const rawRow of rawRows) {
      // Normalize row keys
      const normalizedRow = {}
      for (const [key, value] of Object.entries(rawRow)) {
        const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, "")
        if (cleanKey === "title") normalizedRow.title = value
        else if (cleanKey === "description" || cleanKey === "desc") normalizedRow.description = value
        else if (cleanKey === "sortorder" || cleanKey === "order" || cleanKey === "sort") {
          normalizedRow.sortOrder = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "subjects" || cleanKey === "subject") normalizedRow.subjects = value
        else if (cleanKey === "chapters" || cleanKey === "chapter") normalizedRow.chapters = value
        else if (cleanKey === "topics" || cleanKey === "topic") normalizedRow.topics = value
        else if (cleanKey === "status") normalizedRow.status = value
        else if (cleanKey === "islive" || cleanKey === "live") {
          normalizedRow.isLive = String(value).trim().toLowerCase() === "true" || String(value).trim() === "1"
        }
        else if (cleanKey === "scheduledstarttime" || cleanKey === "starttime") normalizedRow.scheduledStartTime = value
        else if (cleanKey === "scheduledendtime" || cleanKey === "endtime") normalizedRow.scheduledEndTime = value
        else if (cleanKey === "scheduleat" || cleanKey === "scheduledat") normalizedRow.scheduleAt = value
      }

      if (!normalizedRow.title) continue // skip empty rows with no title

      // Resolve subject name/ID
      const subjectInput = normalizedRow.subjects || normalizedRow.subject || common.subjects || common.subject
      let subjectIds = []
      let subjectDoc = null
      if (subjectInput) {
        const inputs = Array.isArray(subjectInput) ? subjectInput : String(subjectInput).split(',').map(s => s.trim())
        for (let input of inputs) {
          if (input.match(/^[0-9a-fA-F]{24}$/)) {
            subjectIds.push(input)
            subjectDoc = await Subject.findOne({ _id: input, isDeleted: false })
          } else if (input) {
            subjectDoc = await Subject.findOne({
              name: { $regex: new RegExp("^" + input + "$", "i") },
              isDeleted: false
            })
            if (subjectDoc) subjectIds.push(subjectDoc._id.toString())
          }
        }
      }

      // Resolve chapter name/ID
      const chapterInput = normalizedRow.chapters || normalizedRow.chapter || common.chapters || common.chapter
      let chapterIds = []
      if (chapterInput && subjectIds.length > 0) {
        const inputs = Array.isArray(chapterInput) ? chapterInput : String(chapterInput).split(',').map(c => c.trim())
        const subDoc = subjectDoc || await Subject.findOne({ _id: subjectIds[0], isDeleted: false })
        if (subDoc) {
          for (let input of inputs) {
            if (input.match(/^[0-9a-fA-F]{24}$/)) {
              chapterIds.push(input)
            } else if (input) {
              const ch = subDoc.chapters.find(c => c.name.trim().toLowerCase() === input.toLowerCase())
              if (ch) chapterIds.push(ch._id.toString())
            }
          }
        }
      }

      // Resolve topic name/ID
      const topicInput = normalizedRow.topics || normalizedRow.topic || common.topics || common.topic
      let topicIds = []
      if (topicInput && subjectIds.length > 0 && chapterIds.length > 0) {
        const inputs = Array.isArray(topicInput) ? topicInput : String(topicInput).split(',').map(t => t.trim())
        const subDoc = subjectDoc || await Subject.findOne({ _id: subjectIds[0], isDeleted: false })
        if (subDoc) {
          const ch = subDoc.chapters.find(c => c._id.toString() === chapterIds[0])
          if (ch) {
            for (let input of inputs) {
              if (input.match(/^[0-9a-fA-F]{24}$/)) {
                topicIds.push(input)
              } else if (input) {
                const tp = ch.topics.find(t => t.name.trim().toLowerCase() === input.toLowerCase())
                if (tp) topicIds.push(tp._id.toString())
              }
            }
          }
        }
      }

      // Build record data
      const dataRow = {
        course: common.course || common.courseId,
        subject: subjectIds,
        chapter: chapterIds,
        topic: topicIds,
        title: normalizedRow.title,
        description: normalizedRow.description || "",
        video: "pending",
        image: "",
        sortOrder: normalizedRow.sortOrder !== undefined ? normalizedRow.sortOrder : 0,
        status: normalizedRow.status || common.status || "active",
        isLive: normalizedRow.isLive || false,
        scheduledStartTime: normalizedRow.scheduledStartTime || null,
        scheduledEndTime: normalizedRow.scheduledEndTime || null,
        scheduleAt: normalizedRow.scheduleAt || null,
        createdBy: adminId
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreateContentSchema } = require('./admin-content.schema')
    const { error, value } = bulkCreateContentSchema.validate(payloadArray, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })
    if (error) {
      const details = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join('; ')
      throw new AppError(`Validation failed for bulk data: ${details}`, 400, 'VALIDATION_ERROR')
    }

    return contentRepository.create(value)
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
