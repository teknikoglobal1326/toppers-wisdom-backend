const path = require('path')
const BaseService = require('../../core/BaseService')
const pdfRepository = require('../../modules/pdf/pdf.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminPdfService extends BaseService {
  constructor() {
    super(pdfRepository, 'admin:pdf')
  }

  async listAll({ page, limit, status, course, subject, topic, chapter, search, sortBy = 'sortOrder', order = 'asc' } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (subject) filter.subjects = subject
    if (topic) filter.topics = topic
    if (chapter) filter.chapters = chapter

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
        { path: 'subjects' },
      ],
    })

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
      this.repository.count({ isDeleted: false }),
      this.repository.count({ isDeleted: false, status: 'active' }),
      this.repository.count({ isDeleted: false, status: 'inactive' }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalActive = globalActive
    result.pagination.globalInactive = globalInactive

    return result
  }

  async getOne(id) {
    const pdf = await pdfRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'subjects' },
        ],
      }
    )
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    return pdf
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    delete payload.courseId
    if (payload.pdfFile === '') delete payload.pdfFile
    if (payload.image === '') delete payload.image
    return payload
  }

  async createPdf(data) {
    const payload = this.buildPayload(data)
    // console.log('Creating PDF with payload:', payload) // Debugging line
    const created = await pdfRepository.create(payload)
    return created
  }

  async bulkCreatePdf(payloadArray) {
    const { bulkCreatePdfSchema } = require('./admin-pdf.schema')
    const { error, value } = bulkCreatePdfSchema.validate(payloadArray, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ')
      throw new AppError(messages, 400, 'VALIDATION_ERROR')
    }
    const builtPayloads = value.map(data => this.buildPayload(data))
    const created = await pdfRepository.insertMany(builtPayloads)
    return created
  }

  async updatePdf(id, data) {
    const pdf = await pdfRepository.findOne({ _id: id, isDeleted: false })
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    const updated = await pdfRepository.updateById(id, this.buildPayload(data))
    return updated
  }

  async softDelete(id) {
    const pdf = await pdfRepository.findOne({ _id: id, isDeleted: false })
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    await pdfRepository.updateById(id, { isDeleted: true })
    this.logger.info({ pdfId: id }, 'Pdf soft deleted')
  }

  async assignPdf(id, { assignments }, adminId) {
    const masterPdf = await pdfRepository.findOne({ _id: id, isDeleted: false })
    if (!masterPdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')

    const results = []
    let updatedMaster = false

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i]
      if (!masterPdf.course && !updatedMaster) {
        const updated = await pdfRepository.updateById(id, {
          course: assignment.course,
          subjects: assignment.subjects || [],
          chapters: assignment.chapters || [],
          topics: assignment.topics || []
        })
        results.push(updated)
        updatedMaster = true
      } else {
        const clonedData = {
          title: masterPdf.title,
          description: masterPdf.description,
          pdfFile: masterPdf.pdfFile,
          image: masterPdf.image,
          sortOrder: masterPdf.sortOrder,
          status: masterPdf.status,
          scheduleAt: masterPdf.scheduleAt,
          createdBy: adminId,
          course: assignment.course,
          subjects: assignment.subjects || [],
          chapters: assignment.chapters || [],
          topics: assignment.topics || []
        }
        const cloned = await pdfRepository.create(clonedData)
        results.push(cloned)
      }
    }
    return results
  }

  async bulkUpload(file, common = {}, adminId, files = {}) {
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
        else if (cleanKey === "scheduleat" || cleanKey === "schedule" || cleanKey === "scheduledtime") {
          normalizedRow.scheduleAt = value !== "" ? value : undefined
        }
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
      let chapterIds = []
      const chapterInput = normalizedRow.chapters || normalizedRow.chapter || common.chapters || common.chapter
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
      let topicIds = []
      const topicInput = normalizedRow.topics || normalizedRow.topic || common.topics || common.topic
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
        subjects: subjectIds,
        chapters: chapterIds,
        topics: topicIds,
        title: normalizedRow.title,
        description: normalizedRow.description || "",
        pdfFile: "pending",
        image: "",
        sortOrder: normalizedRow.sortOrder !== undefined ? normalizedRow.sortOrder : 0,
        status: normalizedRow.status || common.status || "active",
        scheduleAt: normalizedRow.scheduleAt !== undefined ? normalizedRow.scheduleAt : (common.scheduleAt || null),
        createdBy: adminId
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    // Programmatically validate array
    const { bulkCreatePdfSchema } = require('./admin-pdf.schema')
    const { error, value } = bulkCreatePdfSchema.validate(payloadArray, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })

    if (error) {
      const messages = error.details.map((d) => d.message).join(', ')
      throw new AppError(messages, 400, 'VALIDATION_ERROR')
    }

    return this.bulkCreatePdf(value)
  }
}

const adminPdfService = new AdminPdfService()

adminPdfService.attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `pdfs/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.pdfFile?.[0]) {
      const file = req.files.pdfFile[0]
      const ext = path.extname(file.originalname) || '.pdf'
      req.body.pdfFile = await uploadFile(file.buffer, `pdfFile${ext}`, folder, file.mimetype)
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

module.exports = adminPdfService
