const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const DailyQuiz = require('../../models/DailyQuiz.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'examId')) {
        payload.exam = payload.examId || null
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subExamIds')) {
        if (Array.isArray(payload.subExamIds)) {
            payload.subExams = payload.subExamIds
        } else if (typeof payload.subExamIds === 'string' && payload.subExamIds) {
            payload.subExams = payload.subExamIds.includes(',') 
                ? payload.subExamIds.split(',').map(s => s.trim()) 
                : [payload.subExamIds.trim()]
        } else {
            payload.subExams = []
        }
    }

    delete payload.examId
    delete payload.subExamIds

    for (const key of ['subjectIds', 'chapterIds', 'topicIds']) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            const val = payload[key];
            if (Array.isArray(val)) {
                payload[key] = val;
            } else if (typeof val === 'string' && val) {
                payload[key] = val.includes(',')
                    ? val.split(',').map(s => s.trim())
                    : [val.trim()];
            } else {
                payload[key] = [];
            }
        }
    }

    const title = payload.title || ''
    const description = payload.description || null
    const instructions = payload.instructions || null

    if (!payload.localizedContent) payload.localizedContent = {}
    if (!payload.localizedContent.en) payload.localizedContent.en = {}

    payload.localizedContent.en.title = title
    payload.localizedContent.en.description = description
    payload.localizedContent.en.instructions = instructions

    const titleHi = payload.titleHi || null
    const descriptionHi = payload.descriptionHi || null
    const instructionsHi = payload.instructionsHi || null
    const hasHi = [titleHi, descriptionHi, instructionsHi].some((val) => val !== null && val !== '')

    if (hasHi) {
        if (!payload.localizedContent.hi) payload.localizedContent.hi = {}
        payload.localizedContent.hi.title = titleHi
        payload.localizedContent.hi.description = descriptionHi
        payload.localizedContent.hi.instructions = instructionsHi
    } else {
        payload.localizedContent.hi = null
    }

    delete payload.titleHi
    delete payload.descriptionHi
    delete payload.instructionsHi

    return payload
}

// chapterIds/topicIds are embedded ids from Subject.chapters[].topics[]; there is no
// collection to populate against. Resolve their names from the (populated) mapped
// subjects so the admin UI can display names instead of raw ids.
const withResolvedSyllabus = (doc) => {
    if (!doc) return doc
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const chapterNameById = new Map()
    const topicNameById = new Map()

    const subjectList = Array.isArray(obj.subjectIds) ? obj.subjectIds : []
    for (const subject of subjectList) {
        if (subject && Array.isArray(subject.chapters)) {
            for (const chapter of subject.chapters) {
                if (chapter && chapter._id) {
                    chapterNameById.set(String(chapter._id), chapter.name)
                }
                if (chapter && Array.isArray(chapter.topics)) {
                    for (const topic of chapter.topics) {
                        if (topic && topic._id) {
                            topicNameById.set(String(topic._id), topic.name)
                        }
                    }
                }
            }
        }
    }

    obj.chapterIds = (Array.isArray(obj.chapterIds) ? obj.chapterIds : []).map((id) => {
        const name = chapterNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            chapterName: name,
        }
    })

    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => {
        const name = topicNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            topicName: name,
        }
    })

    obj.subjectIds = subjectList.map((subject) => {
        if (subject && typeof subject === 'object' && subject._id) {
            return {
                _id: subject._id,
                name: subject.name || null,
            }
        }
        return { _id: subject, name: null }
    })

    return obj
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, todayOnly, examId, subExamId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (examId) filter.exam = examId
    if (subExamId) filter.subExams = subExamId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    if (todayOnly === 'true') {
        const now = new Date()
        const dayStart = new Date(now)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(now)
        dayEnd.setHours(23, 59, 59, 999)

        filter.startDateTime = { $gte: dayStart, $lte: dayEnd }
    }

    const skip = (page - 1) * limit
    const docs = await DailyQuiz.find(filter)
        .populate('exam', 'name')
        .populate('subExams', 'name')
        .populate('subjectIds', 'name chapters')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await DailyQuiz.countDocuments(filter)

    sendPaginated(res, docs.map(withResolvedSyllabus), { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await DailyQuiz.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam', 'name')
        .populate('subExams', 'name')
        .populate('subjectIds', 'name chapters')
        .lean()

    if (!doc) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

    const Question = require('../../models/Question.model')
    const questions = await Question.find({ test: req.params.id, isDeleted: false })
        .sort({ sortOrder: 1, order: 1, createdAt: 1 })
        .lean()

    const resolvedDoc = withResolvedSyllabus(doc)
    resolvedDoc.questions = questions
    sendSuccess(res, resolvedDoc)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    const createdDoc = await DailyQuiz.create(payload)
    const populated = await DailyQuiz.findById(createdDoc._id)
        .populate('exam', 'name')
        .populate('subExams', 'name')
        .populate('subjectIds', 'name chapters')
    sendCreated(res, withResolvedSyllabus(populated))
})

const update = catchAsync(async (req, res) => {
    const doc = await DailyQuiz.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body))
    await doc.save()

    const populated = await DailyQuiz.findById(doc._id)
        .populate('exam', 'name')
        .populate('subExams', 'name')
        .populate('subjectIds', 'name chapters')
    sendSuccess(res, withResolvedSyllabus(populated))
})

const remove = catchAsync(async (req, res) => {
    const doc = await DailyQuiz.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Daily quiz deleted')
})

const bulkCreate = catchAsync(async (req, res) => {
    const file = req.files && req.files.file ? req.files.file[0] : (req.file || null)
    if (!file) throw new AppError('Excel or Word metadata file is required', 400, 'VALIDATION_ERROR')
    
    const common = req.body || {}
    const adminId = req.admin?._id || req.user?._id || req.user?.id
    const path = require('path')
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

    for (const rawRow of rawRows) {
      const normalizedRow = {}
      for (const [key, value] of Object.entries(rawRow)) {
        const cleanKey = key.toLowerCase().replace(/[\s_-]+/g, "")
        if (cleanKey === "title") normalizedRow.title = value
        else if (cleanKey === "description" || cleanKey === "desc") normalizedRow.description = value
        else if (cleanKey === "instructions" || cleanKey === "inst") normalizedRow.instructions = value
        else if (cleanKey === "instructionsnew") normalizedRow.instructionsNew = value
        else if (cleanKey === "duration" || cleanKey === "time") {
          normalizedRow.duration = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "totalquestions" || cleanKey === "questions") {
          normalizedRow.totalQuestions = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "totalmarks" || cleanKey === "marks") {
          normalizedRow.totalMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "marksperquestion") {
          normalizedRow.marksPerQuestion = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "negativemarks") {
          normalizedRow.negativeMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "passingmarks") {
          normalizedRow.passingMarks = value !== "" ? Number(value) : undefined
        }
        else if (cleanKey === "startdatetime" || cleanKey === "start") normalizedRow.startDateTime = value
        else if (cleanKey === "enddatetime" || cleanKey === "end") normalizedRow.endDateTime = value
        else if (cleanKey === "ispaid" || cleanKey === "paid") {
          normalizedRow.isPaid = String(value).trim().toLowerCase() === "true" || String(value).trim() === "1"
        }
        else if (cleanKey === "status") normalizedRow.status = value
        else if (cleanKey === "scheduleat" || cleanKey === "scheduledat") normalizedRow.scheduleAt = value
        else if (cleanKey === "language") normalizedRow.language = value
        else if (cleanKey === "exam" || cleanKey === "examid") normalizedRow.exam = value
        else if (cleanKey === "subexams" || cleanKey === "subexamids") {
          normalizedRow.subExams = value ? String(value).split(',').map(s => s.trim()) : undefined
        }
      }

      if (!normalizedRow.title) continue

      const rawSubExams = normalizedRow.subExams || (common.subExams ? (Array.isArray(common.subExams) ? common.subExams : String(common.subExams).split(',').map(s => s.trim())) : [])

      const dataRow = {
        title: normalizedRow.title,
        description: normalizedRow.description || "",
        instructions: normalizedRow.instructions || "",
        instructionsNew: normalizedRow.instructionsNew || null,
        thumbnail: "",
        duration: normalizedRow.duration !== undefined ? normalizedRow.duration : (common.duration || 60),
        totalQuestions: normalizedRow.totalQuestions !== undefined ? normalizedRow.totalQuestions : 10,
        totalMarks: normalizedRow.totalMarks !== undefined ? normalizedRow.totalMarks : 10,
        marksPerQuestion: normalizedRow.marksPerQuestion !== undefined ? normalizedRow.marksPerQuestion : 1,
        negativeMarks: normalizedRow.negativeMarks !== undefined ? normalizedRow.negativeMarks : 0,
        passingMarks: normalizedRow.passingMarks !== undefined ? normalizedRow.passingMarks : 4,
        startDateTime: normalizedRow.startDateTime || common.startDateTime,
        endDateTime: normalizedRow.endDateTime || common.endDateTime,
        isPaid: normalizedRow.isPaid !== undefined ? normalizedRow.isPaid : false,
        status: normalizedRow.status || common.status || "active",
        language: normalizedRow.language || common.language || "en",
        scheduleAt: normalizedRow.scheduleAt || null,
        exam: normalizedRow.exam || common.exam || common.examId,
        subExams: rawSubExams,
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreateDailyQuizSchema } = require('./admin-daily-quiz.schema')
    const { error, value } = bulkCreateDailyQuizSchema.validate(payloadArray, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    })
    if (error) {
      const details = error.details.map(d => `${d.path.join('.')}: ${d.message}`).join('; ')
      throw new AppError(`Validation failed for bulk data: ${details}`, 400, 'VALIDATION_ERROR')
    }

    const finalDocs = value.map(row => {
      const parsed = normalizePayload(row)
      parsed.createdBy = adminId
      return parsed
    })

    const created = await DailyQuiz.create(finalDocs)
    sendCreated(res, created)
})

const metadata = catchAsync(async (req, res) => {
    const Subject = require('../../models/Subject.model')
    const rawExamIds = req.query.examId ?? req.query.examIds
    const selectedExamIds = (Array.isArray(rawExamIds)
        ? rawExamIds
        : typeof rawExamIds === 'string'
            ? rawExamIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    if (selectedExamIds.length === 0) {
        return sendSuccess(res, { subjects: [], chapters: [] })
    }

    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    const subjects = await Subject.find({
        examIds: { $in: selectedExamIds },
        isDeleted: false,
        status: 'active',
    })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

    const selectedSet = new Set(selectedSubjectIds)
    const chapterOptions = []
    for (const subject of subjects) {
        if (selectedSet.size && !selectedSet.has(String(subject._id))) continue
        const embeddedChapters = Array.isArray(subject.chapters) ? subject.chapters : []
        for (const chapter of embeddedChapters) {
            chapterOptions.push({
                _id: chapter._id,
                chapterName: chapter.name,
                subjectId: subject._id,
                topics: Array.isArray(chapter.topics)
                    ? chapter.topics.map((topic) => ({ _id: topic._id, name: topic.name }))
                    : [],
            })
        }
    }

    sendSuccess(res, {
        subjects,
        chapters: chapterOptions,
    })
})

module.exports = { list, getOne, create, update, remove, bulkCreate, metadata }
