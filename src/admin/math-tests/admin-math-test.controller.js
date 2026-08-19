const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const MathTest = require('../../models/MathTest.model')
const MathModel = require('../../models/Math.model')
const Subject = require('../../models/Subject.model')
const MathAttempt = require('../../models/MathAttempt.model')

const normalizePayload = (data = {}, existing = null) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'mathId')) {
        payload.math = payload.mathId || null
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

    // Languages array normalization
    let targetLangs = ['en']
    if (payload.languages) {
        targetLangs = Array.isArray(payload.languages) ? payload.languages : [payload.languages]
    } else if (payload.language) {
        targetLangs = [payload.language]
    } else if (existing?.languages) {
        targetLangs = existing.languages
    }
    payload.languages = targetLangs
    delete payload.language

    // Dual-language field mirroring helper
    const primaryLang = targetLangs.includes('en') ? 'en' : 'hi'
    const setBlock = (lang, field, value) => {
        if (!payload.localizedContent) payload.localizedContent = {}
        if (!payload.localizedContent[lang]) payload.localizedContent[lang] = {}
        payload.localizedContent[lang][field] = value || null
    }

    // Process title, description, instructions
    const flatTitle = payload.title || existing?.title
    const flatDesc = payload.description !== undefined ? payload.description : existing?.description
    const flatInst = payload.instructions !== undefined ? payload.instructions : existing?.instructions

    if (payload.en?.title || payload.hi?.title) {
        if (payload.en) {
            setBlock('en', 'title', payload.en.title)
            setBlock('en', 'description', payload.en.description)
            setBlock('en', 'instructions', payload.en.instructions)
        }
        if (payload.hi) {
            setBlock('hi', 'title', payload.hi.title)
            setBlock('hi', 'description', payload.hi.description)
            setBlock('hi', 'instructions', payload.hi.instructions)
        }

        // Mirror localized blocks back to legacy flat fields
        const primaryBlock = payload.localizedContent[primaryLang] || existing?.localizedContent?.[primaryLang]
        payload.title = primaryBlock?.title || flatTitle
        payload.description = primaryBlock?.description || flatDesc
        payload.instructions = primaryBlock?.instructions || flatInst
    } else {
        // Form sent old flat fields only. Back-populate to localizedContent blocks
        if (flatTitle !== undefined) {
            setBlock(primaryLang, 'title', flatTitle)
            setBlock(primaryLang, 'description', flatDesc)
            setBlock(primaryLang, 'instructions', flatInst)
        }
    }

    delete payload.en
    delete payload.hi
    delete payload.mathId
    return payload
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, mathId, subjectId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (mathId) filter.math = mathId
    if (subjectId) filter.subjectIds = subjectId

    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await MathTest.find(filter)
        .populate('math', 'title')
        .populate('subjectIds', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    const total = await MathTest.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        MathTest.countDocuments({ isDeleted: false }),
        MathTest.countDocuments({ isDeleted: false, status: 'active' }),
        MathTest.countDocuments({ isDeleted: false, status: 'inactive' }),
    ])

    sendPaginated(res, docs, {
        page: Number(page),
        limit: Number(limit),
        total,
        globalTotal,
        globalActive,
        globalInactive
    })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await MathTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('math', 'title')
        .populate('subjectIds', 'name')
        .lean()

    if (!doc) throw new AppError('Math test not found', 404, 'NOT_FOUND')
    sendSuccess(res, doc)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload(req.body)
    payload.createdBy = req.admin?._id || null

    sendCreated(res, await MathTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await MathTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Math test not found', 404, 'NOT_FOUND')

    const payload = normalizePayload(req.body, doc)
    Object.assign(doc, payload)
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await MathTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Math test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Math test deleted')
})

const metadata = catchAsync(async (req, res) => {
    const { mathId } = req.query
    if (!mathId) throw new AppError('mathId query parameter is required', 400)

    const math = await MathModel.findOne({ _id: mathId, isDeleted: false }).lean()
    if (!math) throw new AppError('Math series not found', 404)

    const subjects = await Subject.find({ _id: { $in: math.subjectIds || [] }, isDeleted: false }).select('name chapters').lean()

    sendSuccess(res, {
        mathSeries: { _id: math._id, title: math.title },
        subjects: subjects.map(s => ({
            _id: s._id,
            name: s.name,
            chapters: (s.chapters || []).map(c => ({
                _id: c._id,
                name: c.name,
                topics: (c.topics || []).map(t => ({
                    _id: t._id,
                    name: t.name
                }))
            }))
        }))
    })
})

const bulkCreate = catchAsync(async (req, res) => {
    const adminId = req.admin?._id || null
    const files = req.files
    if (!files || !files.file || files.file.length === 0) {
      throw new AppError('Metadata file is required (.xlsx, .xls, .docx, .doc)', 400, 'VALIDATION_ERROR')
    }

    let common = {}
    if (req.body.common) {
      try {
        common = JSON.parse(req.body.common)
      } catch (err) {
        throw new AppError('Invalid JSON inside common fields body parameter', 400, 'VALIDATION_ERROR')
      }
    }

    const file = files.file[0]
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
        math: common.math || common.mathId,
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
        language: normalizedRow.language || common.language || "en",
        scheduleAt: normalizedRow.scheduleAt || null,
      }

      payloadArray.push(dataRow)
    }

    if (payloadArray.length === 0) {
      throw new AppError('No valid rows found in metadata file', 400, 'VALIDATION_ERROR')
    }

    const { bulkCreateMathTestSchema } = require('./admin-math-test.schema')
    const { error, value } = bulkCreateMathTestSchema.validate(payloadArray, {
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

    const created = await MathTest.create(finalDocs)
    sendCreated(res, created)
})

const getTestAnalytics = catchAsync(async (req, res) => {
    const testId = req.params.id
    
    const test = await MathTest.findOne({ _id: testId, isDeleted: false }).lean()
    if (!test) throw new AppError('Test not found', 404, 'NOT_FOUND')

    const attempts = await MathAttempt.find({ test: testId, status: 'completed' })
        .populate('user', 'name email phone avatar')
        .lean()

    const bestAttemptsMap = new Map()
    attempts.forEach(att => {
        if (!att.user) return
        const userIdStr = att.user._id.toString()
        const existing = bestAttemptsMap.get(userIdStr)
        if (!existing) {
            bestAttemptsMap.set(userIdStr, att)
        } else {
            if (att.score > existing.score || (att.score === existing.score && (att.timeTaken || 0) < (existing.timeTaken || 0))) {
                bestAttemptsMap.set(userIdStr, att)
            }
        }
    })
    const uniqueAttempts = Array.from(bestAttemptsMap.values())

    const totalParticipants = uniqueAttempts.length

    let totalScore = 0
    let maxScore = 0
    let minScore = totalParticipants > 0 ? uniqueAttempts[0].score : 0
    let totalAccuracy = 0
    let totalTimeTaken = 0

    const distribution = {
        "0-20%": 0,
        "21-40%": 0,
        "41-60%": 0,
        "61-80%": 0,
        "81-100%": 0
    }

    uniqueAttempts.forEach(att => {
        const score = att.score || 0
        totalScore += score
        if (score > maxScore) maxScore = score
        if (score < minScore) minScore = score
        totalAccuracy += att.accuracy || 0
        totalTimeTaken += att.timeTaken || 0

        const pct = test.totalMarks > 0 ? (score / test.totalMarks) * 100 : 0
        if (pct <= 20) distribution["0-20%"]++
        else if (pct <= 40) distribution["21-40%"]++
        else if (pct <= 60) distribution["41-60%"]++
        else if (pct <= 80) distribution["61-80%"]++
        else distribution["81-100%"]++
    })

    const avgScore = totalParticipants > 0 ? parseFloat((totalScore / totalParticipants).toFixed(2)) : 0
    const avgAccuracy = totalParticipants > 0 ? parseFloat((totalAccuracy / totalParticipants).toFixed(2)) : 0
    const avgTimeTaken = totalParticipants > 0 ? parseFloat((totalTimeTaken / totalParticipants).toFixed(2)) : 0

    sendSuccess(res, {
        totalParticipants,
        avgScore,
        maxScore,
        minScore,
        avgAccuracy,
        avgTimeTaken,
        distribution
    })
})

module.exports = { list, getOne, create, update, remove, metadata, bulkCreate, getTestAnalytics }
