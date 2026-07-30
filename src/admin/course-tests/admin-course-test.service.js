const path = require('path')
const BaseService = require('../../core/BaseService')
const courseTestRepository = require('../../modules/course-test/course-test.repository')
const questionRepository = require('../../modules/question/question.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Date.now().toString(36)
  return base ? `${base}-${suffix}` : suffix
}

class AdminCourseTestService extends BaseService {
  constructor() {
    super(courseTestRepository, 'admin:course-test')
  }

  async attachMappedQuestionCounts(result) {
    if (!result || !Array.isArray(result.data) || result.data.length === 0) return result

    const counts = await Promise.all(result.data.map((courseTest) =>
      questionRepository.count({ test: courseTest._id, isDeleted: false })
    ))

    result.data.forEach((courseTest, index) => {
      courseTest.totalMappedQuestions = counts[index]
    })

    return result
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
        { slug: { $regex: search, $options: 'i' } },
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

    const [globalTotal, globalActive, globalInactive, globalDraft] = await Promise.all([
      this.repository.count({ isDeleted: false }),
      this.repository.count({ isDeleted: false, status: 'active' }),
      this.repository.count({ isDeleted: false, status: 'inactive' }),
      this.repository.count({ isDeleted: false, status: 'draft' }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalActive = globalActive
    result.pagination.globalInactive = globalInactive
    result.pagination.globalDraft = globalDraft

    return this.attachMappedQuestionCounts(result)
  }

  async getOne(id) {
    const courseTest = await courseTestRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'subjects' },
        ],
      }
    )
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')
    return courseTest
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    delete payload.courseId
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (payload.image === '') delete payload.image
    return payload
  }

  async createCourseTest(data) {
    const payload = this.buildPayload(data)
    if (!payload.slug && payload.title) {
      payload.slug = generateSlug(payload.title)
    }
    return courseTestRepository.create(payload)
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
      const normalizedRow = {}
      for (const [key, value] of Object.entries(rawRow)) {
        const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, "")
        if (cleanKey === "title") normalizedRow.title = value
        else if (cleanKey === "description" || cleanKey === "desc") normalizedRow.description = value
        else if (cleanKey === "instruction" || cleanKey === "inst") normalizedRow.instruction = value
        else if (cleanKey === "instructionsnew") normalizedRow.instructionsNew = value
        else if (cleanKey === "sortorder" || cleanKey === "order" || cleanKey === "sort") {
          normalizedRow.sortOrder = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "subjects" || cleanKey === "subject") normalizedRow.subjects = value
        else if (cleanKey === "chapters" || cleanKey === "chapter") normalizedRow.chapters = value
        else if (cleanKey === "topics" || cleanKey === "topic") normalizedRow.topics = value
        else if (cleanKey === "duration" || cleanKey === "time") {
          normalizedRow.duration = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "totalquestions" || cleanKey === "questions") {
          normalizedRow.totalQuestions = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "totalmarks" || cleanKey === "marks") {
          normalizedRow.totalMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "passingmarks") {
          normalizedRow.passingMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "marksperquestion") {
          normalizedRow.marksPerQuestion = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "negativemarks") {
          normalizedRow.negativeMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "maxattempts" || cleanKey === "attempts") {
          normalizedRow.maxAttempts = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "difficulty") normalizedRow.difficulty = value
        else if (cleanKey === "testtype" || cleanKey === "type") normalizedRow.testType = value
        else if (cleanKey === "startdate") normalizedRow.startDate = value
        else if (cleanKey === "enddate") normalizedRow.endDate = value
        else if (cleanKey === "scheduleat" || cleanKey === "scheduledat") normalizedRow.scheduleAt = value
        else if (cleanKey === "language") normalizedRow.language = value
        else if (cleanKey === "status") normalizedRow.status = value
      }

      if (!normalizedRow.title) continue

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

      // Build payload
      const dataRow = {
        course: common.course || common.courseId,
        subjects: subjectIds,
        chapters: chapterIds,
        topics: topicIds,
        title: normalizedRow.title,
        slug: generateSlug(normalizedRow.title),
        description: normalizedRow.description || "",
        instruction: normalizedRow.instruction || "",
        instructionsNew: normalizedRow.instructionsNew || null,
        image: "",
        duration: normalizedRow.duration !== undefined ? normalizedRow.duration : (common.duration || 60),
        sortOrder: normalizedRow.sortOrder !== undefined ? normalizedRow.sortOrder : 0,
        totalQuestions: normalizedRow.totalQuestions !== undefined ? normalizedRow.totalQuestions : 0,
        totalMarks: normalizedRow.totalMarks !== undefined ? normalizedRow.totalMarks : 0,
        passingMarks: normalizedRow.passingMarks !== undefined ? normalizedRow.passingMarks : 0,
        marksPerQuestion: normalizedRow.marksPerQuestion !== undefined ? normalizedRow.marksPerQuestion : 1,
        negativeMarks: normalizedRow.negativeMarks !== undefined ? normalizedRow.negativeMarks : 0,
        maxAttempts: normalizedRow.maxAttempts !== undefined ? normalizedRow.maxAttempts : 1,
        difficulty: normalizedRow.difficulty || "medium",
        testType: normalizedRow.testType || "practice",
        startDate: normalizedRow.startDate || null,
        endDate: normalizedRow.endDate || null,
        scheduleAt: normalizedRow.scheduleAt || null,
        language: normalizedRow.language || "hi",
        status: normalizedRow.status || common.status || "draft",
        createdBy: adminId
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreateCourseTestSchema } = require('./admin-course-test.schema')
    const { error, value } = bulkCreateCourseTestSchema.validate(payloadArray, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })
    if (error) {
      const details = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join('; ')
      throw new AppError(`Validation failed for bulk data: ${details}`, 400, 'VALIDATION_ERROR')
    }

    return courseTestRepository.create(value)
  }
}

const adminCourseTestService = new AdminCourseTestService()

adminCourseTestService.attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `course-tests/${req.params.id ?? `new-${Date.now()}`}`

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

module.exports = adminCourseTestService
