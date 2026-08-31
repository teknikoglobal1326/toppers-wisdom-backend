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
        sectionalTestSeries: common.sectionalTestSeries || common.sectionalTestSeriesId,
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

    const { bulkCreateSectionalTestSeriesTestSchema } = require('./admin-sectional-test-series-test.schema')
    const { error, value } = bulkCreateSectionalTestSeriesTestSchema.validate(payloadArray, {
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

    const created = await SectionalTestSeriesTest.create(finalDocs)
    sendCreated(res, created)
})
