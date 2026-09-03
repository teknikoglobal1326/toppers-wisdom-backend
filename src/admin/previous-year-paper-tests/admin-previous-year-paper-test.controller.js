const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const Subject = require('../../models/Subject.model')

// Turn a nested { en: {...}, hi: {...} } dual-language body into the stored shape:
// `localizedContent.en/hi` (only for the selected languages) plus top-level
// title/description/instructions mirrored from the primary language (English when
// present, otherwise Hindi) for list/search and legacy reads.
// `existing` is the current doc on update, so unsent languages are preserved.
const normalizePayload = (data = {}, existing = null) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'previousYearPaperId')) {
        payload.previousYearPaper = payload.previousYearPaperId || null
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subjectIds')) {
        if (Array.isArray(payload.subjectIds)) {
            payload.subjectIds = payload.subjectIds.filter(Boolean)
        } else if (typeof payload.subjectIds === 'string' && payload.subjectIds) {
            payload.subjectIds = [payload.subjectIds]
        } else {
            payload.subjectIds = []
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'chapterIds')) {
        if (Array.isArray(payload.chapterIds)) {
            payload.chapterIds = payload.chapterIds.filter(Boolean)
        } else if (typeof payload.chapterIds === 'string' && payload.chapterIds) {
            payload.chapterIds = [payload.chapterIds]
        } else {
            payload.chapterIds = []
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'topicIds')) {
        if (Array.isArray(payload.topicIds)) {
            payload.topicIds = payload.topicIds.filter(Boolean)
        } else if (typeof payload.topicIds === 'string' && payload.topicIds) {
            payload.topicIds = [payload.topicIds]
        } else {
            payload.topicIds = []
        }
    }

    // Resolve languages leniently: explicit `languages`, else legacy scalar
    // `language`, else the existing doc's, else default English. Never blocks.
    let languages = Array.isArray(payload.languages) && payload.languages.length
        ? payload.languages
        : (payload.language ? [payload.language] : null)
    if (!languages) {
        languages = (existing && Array.isArray(existing.languages) && existing.languages.length)
            ? existing.languages
            : ['en']
    }
    payload.languages = languages

    const buildBlock = (block) => ({
        title: block?.title || null,
        description: block?.description || null,
        instructions: block?.instructions || null,
    })

    // Flat title/description/instructions = the primary language's content (what the
    // current UI sends). Primary is English when selected, else the first language.
    const flatBlock = {
        title: payload.title || null,
        description: payload.description || null,
        instructions: payload.instructions || null,
    }
    const primaryLang = languages.includes('en') ? 'en' : languages[0]

    // Start from existing content (update) so unsent languages survive.
    const localizedContent = {
        en: (existing && existing.localizedContent && existing.localizedContent.en) || null,
        hi: (existing && existing.localizedContent && existing.localizedContent.hi) || null,
    }

    for (const lang of ['en', 'hi']) {
        if (payload[lang]) {
            localizedContent[lang] = buildBlock(payload[lang])
        } else if (lang === primaryLang && (flatBlock.title || flatBlock.description || flatBlock.instructions)) {
            localizedContent[lang] = buildBlock(flatBlock)
        }
        // Drop content for a language not selected.
        if (!languages.includes(lang)) localizedContent[lang] = null
    }

    payload.localizedContent = localizedContent

    // Mirror the primary language onto the flat fields for list/search/legacy reads.
    const primary = localizedContent[primaryLang] || localizedContent.en || localizedContent.hi
    if (primary) {
        payload.title = primary.title || ''
        payload.description = primary.description || null
        payload.instructions = primary.instructions || null
    }

    delete payload.en
    delete payload.hi
    delete payload.language
    delete payload.previousYearPaperId
    return payload
}

// chapterIds/topicIds are embedded ids from Subject.chapters[].topics[]; there is no
// collection to populate against. Resolve their names from the (populated) mapped
// subjects so the admin UI can display names instead of raw ids.
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
    const { status, page = 1, limit = 10, q, previousYearPaperId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (previousYearPaperId) filter.previousYearPaper = previousYearPaperId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await PreviousYearPaperTest.find(filter)
        .populate('previousYearPaper')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await PreviousYearPaperTest.countDocuments(filter)

    sendPaginated(res, docs.map(withResolvedSyllabus), { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('previousYearPaper')
        .populate('subjectIds')

    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, withResolvedSyllabus(doc))
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({
        subjectIds: [],
        chapterIds: [],
        topicIds: [],
        ...req.body,
        createdBy: req.admin?._id || null,
    })
    sendCreated(res, await PreviousYearPaperTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body, doc))
    doc.markModified('localizedContent')
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Test deleted')
})

// Options for the test create/update form. Flow: paper -> exam -> all subjects for that exam ->
// each subject's embedded chapters -> each chapter's embedded topics. Chapters and
// topics come from Subject.chapters[].topics[], NOT the standalone Topic collection.
const metadata = catchAsync(async (req, res) => {
    const { previousYearPaperId } = req.query
    if (!previousYearPaperId) throw new AppError('previousYearPaperId is required', 400, 'VALIDATION_ERROR')

    const paper = await PreviousYearPaper.findOne({ _id: previousYearPaperId, isDeleted: false }).lean()
    if (!paper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    // Selected subjects to expand chapters for. Accept repeated `subjectIds`, a CSV
    // string, or the legacy single `subjectId`.
    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    // Build subject filter:
    // - If the paper has an exam mapped, show ALL subjects linked to that exam.
    // - Otherwise, fall back to the subjects explicitly mapped on the paper.
    let subjectFilter = { isDeleted: false, status: 'active' }
    if (paper.exam) {
        subjectFilter.examIds = paper.exam
    } else {
        const allowedSubjectIds = Array.isArray(paper.subjectIds) ? paper.subjectIds : []
        subjectFilter._id = { $in: allowedSubjectIds }
    }

    const subjects = await Subject.find(subjectFilter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

    // Flatten embedded chapters of the selected subjects into chapter options
    // carrying their topics and parent subject.
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
        else if (cleanKey === "isperquestiontime") {
          normalizedRow.isPerQuestionTime = String(value).trim().toLowerCase() !== "false" && String(value).trim() !== "0"
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
        else if (cleanKey === "ispaid" || cleanKey === "paid") {
          normalizedRow.isPaid = String(value).trim().toLowerCase() === "true" || String(value).trim() === "1"
        }
        else if (cleanKey === "status") normalizedRow.status = value
        else if (cleanKey === "sortorder") normalizedRow.sortOrder = value !== "" ? Number(value) : undefined
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
        previousYearPaper: common.previousYearPaper || common.previousYearPaperId,
        subjectIds: subjectIds,
        chapterIds: chapterIds,
        topicIds: topicIds,
        title: normalizedRow.title,
        description: normalizedRow.description || "",
        instructions: normalizedRow.instructions || "",
        instructionsNew: normalizedRow.instructionsNew || null,
        thumbnail: "",
        duration: normalizedRow.duration !== undefined ? normalizedRow.duration : (common.duration || 60),
        isPerQuestionTime: normalizedRow.isPerQuestionTime !== undefined ? normalizedRow.isPerQuestionTime : true,
        totalQuestions: normalizedRow.totalQuestions !== undefined ? normalizedRow.totalQuestions : 10,
        totalMarks: normalizedRow.totalMarks !== undefined ? normalizedRow.totalMarks : 10,
        marksPerQuestion: normalizedRow.marksPerQuestion !== undefined ? normalizedRow.marksPerQuestion : 1,
        negativeMarks: normalizedRow.negativeMarks !== undefined ? normalizedRow.negativeMarks : 0,
        passingMarks: normalizedRow.passingMarks !== undefined ? normalizedRow.passingMarks : 4,
        isPaid: normalizedRow.isPaid !== undefined ? normalizedRow.isPaid : false,
        status: normalizedRow.status || common.status || "active",
        sortOrder: normalizedRow.sortOrder !== undefined ? normalizedRow.sortOrder : (common.sortOrder !== undefined ? Number(common.sortOrder) : 0),
        language: normalizedRow.language || common.language || "en",
        scheduleAt: normalizedRow.scheduleAt || null,
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreatePreviousYearPaperTestSchema } = require('./admin-previous-year-paper-test.schema')
    const { error, value } = bulkCreatePreviousYearPaperTestSchema.validate(payloadArray, {
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

    const created = await PreviousYearPaperTest.create(finalDocs)
    sendCreated(res, created)
})

const getSectionTimings = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('subjectIds', 'name title')
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, {
        testId: doc._id,
        totalDuration: doc.duration,
        sectionTimings: doc.sectionTimings || []
    })
})

const updateSectionTimings = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    const { sectionTimings } = req.body
    doc.sectionTimings = sectionTimings || []
    doc.markModified('sectionTimings')
    await doc.save()
    sendSuccess(res, doc, 'Section timings updated successfully')
})

module.exports = { list, getOne, create, update, remove, metadata, bulkCreate, getSectionTimings, updateSectionTimings }
