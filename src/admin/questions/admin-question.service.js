const path = require('path')
const BaseService = require('../../core/BaseService')
const questionRepository = require('../../modules/question/question.repository')
const courseTestRepository = require('../../modules/course-test/course-test.repository')
const CourseTest = require('../../models/CourseTest.model')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminQuestionService extends BaseService {
  constructor() {
    super(questionRepository, 'admin:question')
  }

  async syncQuestionCount(testId) {
    const count = await questionRepository.count({
      test: testId,
      isDeleted: false,
    })
    const update = { totalMappedQuestions: count }
    const updatedCourseTest = await courseTestRepository.updateById(testId, update)
    if (updatedCourseTest) return

    const updatedSeriesTest = await TestSeriesTest.findOneAndUpdate(
      { _id: testId, isDeleted: false },
      update,
      { new: true }
    )
    if (updatedSeriesTest) return

    await PreviousYearPaperTest.findOneAndUpdate(
      { _id: testId, isDeleted: false },
      update,
      { new: true }
    )
  }

  async listAll({ page, limit, test, status, search, sortOrder } = {}) {
    const filter = { isDeleted: false }

    if (test) filter.test = test
    if (status) filter.status = status

    if (search) {
      filter.$or = [
        { 'en.question.text': { $regex: search, $options: 'i' } },
        { 'hi.question.text': { $regex: search, $options: 'i' } },
        { 'en.explanation.text': { $regex: search, $options: 'i' } },
        { 'hi.explanation.text': { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, order: 1, createdAt: -1 },
      populate: [
        { path: 'test', select: 'title slug' },
        { path: 'subjectId', select: 'name' },
      ],
    })
  }

  async getOne(id) {
    const question = await questionRepository.findOne(
      { _id: id, isDeleted: false },
      { 
        populate: [
          { path: 'test', select: 'title slug' },
          { path: 'subjectId', select: 'name' },
        ] 
      }
    )

    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')
    return question
  }

  buildPayload(data = {}) {
    const payload = { ...data }

    if (payload.testId && !payload.test) payload.test = payload.testId
    delete payload.testId

    if (payload.subjectId === '') payload.subjectId = null
    if (payload.chapterId === '') payload.chapterId = null
    if (payload.topicId === '') payload.topicId = null

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }

    for (const lang of ['en', 'hi']) {
      if (payload[lang]) {
        if (payload[lang].question?.text === '') payload[lang].question.text = ''
        if (payload[lang].question?.image === '') payload[lang].question.image = ''
        if (payload[lang].explanation?.text === '') payload[lang].explanation.text = ''
        if (payload[lang].explanation?.image === '') payload[lang].explanation.image = ''
      }
    }

    return payload
  }

  // A question's `test` can reference any of the test types that share the Question
  // collection (course test / test-series test / previous-year-paper test). Look the
  // id up across all of them and return the first match (a test id lives in one only).
  async resolveParentTest(testId) {
    if (!testId) return null
    const [courseTest, seriesTest, pypTest] = await Promise.all([
      CourseTest.findOne({ _id: testId, isDeleted: false }).select('isPerQuestionTime').lean(),
      TestSeriesTest.findOne({ _id: testId, isDeleted: false }).select('isPerQuestionTime').lean(),
      PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false }).select('isPerQuestionTime').lean(),
    ])
    return courseTest || seriesTest || pypTest || null
  }

  // Enforce the parent test's per-question-time policy on a question payload:
  // when the test uses per-question time, perQuestionTime is required (falls back to
  // the existing value on update); otherwise it is normalised to null.
  async applyPerQuestionTime(payload, existing = null) {
    const testId = payload.test || existing?.test
    const parentTest = await this.resolveParentTest(testId)
    if (!parentTest) throw new AppError('Parent test not found', 404, 'NOT_FOUND')

    // Default is true when the flag is absent (backward compatible with old tests).
    const isPerQuestionTime = parentTest.isPerQuestionTime !== false

    if (isPerQuestionTime) {
      const provided = payload.perQuestionTime
      const effective = provided !== undefined && provided !== null ? provided : existing?.perQuestionTime
      if (effective === undefined || effective === null) {
        throw new AppError('perQuestionTime is required for this test', 400, 'VALIDATION_ERROR')
      }
      payload.perQuestionTime = effective
    } else {
      payload.perQuestionTime = null
    }

    return payload
  }

  // Next available order for a test (auto-increment on add).
  async nextOrder(testId) {
    if (!testId) return 1
    const max = await questionRepository.getMaxOrder(testId)
    return max + 1
  }

  async createQuestion(data) {
    const payload = this.buildPayload(data)
    if (payload.order === undefined || payload.order === null) {
      payload.order = await this.nextOrder(payload.test)
    }
    await this.applyPerQuestionTime(payload)
    const result = await questionRepository.createSingle(payload)
    if (payload.test) await this.syncQuestionCount(payload.test)
    return this.getOne(result._id)
  }

  async updateQuestion(id, data) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    const payload = this.buildPayload(data)
    await this.applyPerQuestionTime(payload, question)

    const updated = await questionRepository.updateById(id, payload)
    const testId = payload.test || question.test
    if (testId) await this.syncQuestionCount(testId)

    return this.getOne(updated._id)
  }

  async softDelete(id) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    await questionRepository.updateById(id, { isDeleted: true })
    if (question.test) await this.syncQuestionCount(question.test)
    this.logger.info({ questionId: id }, 'Question soft deleted')
  }

  async softDeleteByTest(testId) {
    const parentTest = await this.resolveParentTest(testId)
    if (!parentTest) throw new AppError('Parent test not found', 404, 'NOT_FOUND')

    const result = await questionRepository.updateMany(
      { test: testId, isDeleted: false },
      { isDeleted: true }
    )

    await this.syncQuestionCount(testId)
    this.logger.info({ testId, deletedCount: result.modifiedCount }, 'Questions soft deleted by test')
    return { deletedCount: result.modifiedCount || 0 }
  }
}

const adminQuestionService = new AdminQuestionService()

adminQuestionService.attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `questions/${req.params.id ?? `new-${Date.now()}`}`

    const parseJsonField = (fieldName) => {
      if (req.body[fieldName] && typeof req.body[fieldName] === 'string') {
        req.body[fieldName] = JSON.parse(req.body[fieldName])
      }
    }

    const uploadSingleImage = async (fieldName, fileNamePrefix, target, targetKey) => {
      const file = req.files?.[fieldName]?.[0]
      if (!file) return

      const ext = path.extname(file.originalname) || '.jpg'
      target[targetKey] = target[targetKey] || {}
      target[targetKey].image = await uploadFile(file.buffer, `${fileNamePrefix}${ext}`, folder, file.mimetype)
    }

    const uploadOptionImages = async (language, target) => {
      target.options = Array.isArray(target.options) ? target.options : []
      for (let index = 0; index < 4; index += 1) {
        const file = req.files?.[`${language}Option${index}Image`]?.[0]
        if (!file || !target.options[index]) continue

        const ext = path.extname(file.originalname) || '.jpg'
        target.options[index].image = await uploadFile(
          file.buffer,
          `${language}-option-${index + 1}${ext}`,
          folder,
          file.mimetype
        )
      }
    }

    if (req.files?.questionImage?.[0]) {
      const file = req.files.questionImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.question = {
        ...(req.body.question ? JSON.parse(req.body.question) : {}),
        image: await uploadFile(file.buffer, `question${ext}`, folder, file.mimetype),
      }
    }

    if (req.files?.explanationImage?.[0]) {
      const file = req.files.explanationImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.explanation = {
        ...(req.body.explanation ? JSON.parse(req.body.explanation) : {}),
        image: await uploadFile(file.buffer, `explanation${ext}`, folder, file.mimetype),
      }
    }

    if (req.files?.optionImages?.length) {
      const optionImages = req.files.optionImages
      const options = req.body.options ? JSON.parse(req.body.options) : []
      for (let index = 0; index < optionImages.length; index += 1) {
        const file = optionImages[index]
        const ext = path.extname(file.originalname) || '.jpg'
        if (options[index]) {
          options[index].image = await uploadFile(file.buffer, `option-${index + 1}${ext}`, folder, file.mimetype)
        }
      }
      req.body.options = options
    }

    const indexedOptionFields = ['option0Image', 'option1Image', 'option2Image', 'option3Image']
    if (indexedOptionFields.some((field) => req.files?.[field]?.[0])) {
      const options = Array.isArray(req.body.options)
        ? req.body.options
        : (req.body.options ? JSON.parse(req.body.options) : [])

      for (let index = 0; index < indexedOptionFields.length; index += 1) {
        const fieldName = indexedOptionFields[index]
        const file = req.files?.[fieldName]?.[0]
        if (!file || !options[index]) continue

        const ext = path.extname(file.originalname) || '.jpg'
        options[index].image = await uploadFile(file.buffer, `option-${index + 1}${ext}`, folder, file.mimetype)
      }

      req.body.options = options
    }

    parseJsonField('hi')
    parseJsonField('en')
    parseJsonField('question')
    parseJsonField('explanation')
    parseJsonField('options')
    parseJsonField('subjects')
    parseJsonField('chapters')
    parseJsonField('topics')

    // Map uploaded file paths into hi and en payloads if dual creation
    if (req.body.hi && req.body.en) {
      await uploadSingleImage('hiQuestionImage', 'hi-question', req.body.hi, 'question')
      await uploadSingleImage('hiExplanationImage', 'hi-explanation', req.body.hi, 'explanation')
      await uploadOptionImages('hi', req.body.hi)
      await uploadSingleImage('enQuestionImage', 'en-question', req.body.en, 'question')
      await uploadSingleImage('enExplanationImage', 'en-explanation', req.body.en, 'explanation')
      await uploadOptionImages('en', req.body.en)

      if (req.body.question?.image) {
        req.body.hi.question = req.body.hi.question || {}
        req.body.hi.question.image = req.body.question.image
        req.body.en.question = req.body.en.question || {}
        req.body.en.question.image = req.body.question.image
      }
      if (req.body.explanation?.image) {
        req.body.hi.explanation = req.body.hi.explanation || {}
        req.body.hi.explanation.image = req.body.explanation.image
        req.body.en.explanation = req.body.en.explanation || {}
        req.body.en.explanation.image = req.body.explanation.image
      }
      if (req.body.options && Array.isArray(req.body.options)) {
        req.body.hi.options = req.body.hi.options || []
        req.body.en.options = req.body.en.options || []
        req.body.options.forEach((opt, idx) => {
          if (opt?.image) {
            if (req.body.hi.options[idx]) req.body.hi.options[idx].image = opt.image
            if (req.body.en.options[idx]) req.body.en.options[idx].image = opt.image
          }
        })
      }
      // Remove flat fields to satisfy Joi validation for dual schema
      delete req.body.question
      delete req.body.explanation
      delete req.body.options
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = adminQuestionService
