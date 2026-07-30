const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const LiveTest = require('../../models/LiveTest.model')
const Subject = require('../../models/Subject.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    for (const key of ['subExamIds', 'subjectIds', 'chapterIds', 'topicIds']) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            if (Array.isArray(payload[key])) {
                payload[key] = payload[key].filter(Boolean)
            } else if (typeof payload[key] === 'string' && payload[key]) {
                payload[key] = [payload[key]]
            } else {
                payload[key] = []
            }
        }
    }
    if (payload.examId === '') payload.examId = null

    const title = payload.title || ''
    const description = payload.description || null
    const instructions = payload.instructions || null

    if (!payload.localizedContent) payload.localizedContent = {}
    if (!payload.localizedContent.en) payload.localizedContent.en = {}

    payload.localizedContent.en.title = title
    payload.localizedContent.en.description = description
    payload.localizedContent.en.instructions = instructions

    return payload
}

// chapterIds/topicIds are embedded ids from Subject.chapters[].topics[]; resolve
// their names from the (populated) mapped subjects for display.
const withResolvedSyllabus = (doc) => {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const chapterNameById = new Map()
    const topicNameById = new Map()
    for (const subject of Array.isArray(obj.subjectIds) ? obj.subjectIds : []) {
        for (const chapter of (subject && Array.isArray(subject.chapters)) ? subject.chapters : []) {
            if (chapter && chapter._id) chapterNameById.set(String(chapter._id), chapter.name)
            for (const topic of (chapter && Array.isArray(chapter.topics)) ? chapter.topics : []) {
                if (topic && topic._id) topicNameById.set(String(topic._id), topic.name)
            }
        }
    }
    obj.chapterIds = (Array.isArray(obj.chapterIds) ? obj.chapterIds : []).map((id) => ({
        _id: id,
        chapterName: chapterNameById.get(String(id)) || null,
    }))
    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => ({
        _id: id,
        topicName: topicNameById.get(String(id)) || null,
    }))
    return obj
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, liveNow } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (liveNow === 'true') {
        const now = new Date()
        filter.startDateTime = { $lte: now }
        filter.endDateTime = { $gte: now }
    }
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await LiveTest.find(filter)
        .populate('examId', 'name')
        .populate('subExamIds', 'name')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await LiveTest.countDocuments(filter)

    sendPaginated(res, docs.map(withResolvedSyllabus), { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('examId', 'name')
        .populate('subExamIds', 'name')
        .populate('subjectIds')

    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')
    sendSuccess(res, withResolvedSyllabus(doc))
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await LiveTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body))
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Live test deleted')
})

// Options for the live-test create/update form. Flow: exam -> subjects mapped to
// that exam (Subject.examIds) -> each subject's embedded chapters -> each chapter's
// embedded topics.
const metadata = catchAsync(async (req, res) => {
    const { examId } = req.query
    if (!examId) throw new AppError('examId is required', 400, 'VALIDATION_ERROR')

    // Selected subjects to expand chapters for. Accept repeated `subjectIds`, a CSV
    // string, or a single `subjectId`.
    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    const subjects = await Subject.find({
        examIds: examId,
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
    const Subject = require('../../models/Subject.model')

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
        else if (cleanKey === "subjects" || cleanKey === "subject") normalizedRow.subjects = value
        else if (cleanKey === "chapters" || cleanKey === "chapter") normalizedRow.chapters = value
        else if (cleanKey === "topics" || cleanKey === "topic") normalizedRow.topics = value
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

      const dataRow = {
        examId: common.examId || common.exam,
        subExamIds: common.subExamIds || (common.subExamId ? [common.subExamId] : []),
        subjectIds: subjectIds,
        chapterIds: chapterIds,
        topicIds: topicIds,
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
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreateLiveTestSchema } = require('./admin-live-test.schema')
    const { error, value } = bulkCreateLiveTestSchema.validate(payloadArray, {
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

    const created = await LiveTest.create(finalDocs)
    sendCreated(res, created)
})

module.exports = { list, getOne, create, update, remove, metadata, bulkCreate }
