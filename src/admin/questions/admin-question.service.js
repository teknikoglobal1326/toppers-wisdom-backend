const path = require('path')
const mongoose = require('mongoose')
const BaseService = require('../../core/BaseService')
const questionRepository = require('../../modules/question/question.repository')
const courseTestRepository = require('../../modules/course-test/course-test.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminQuestionService extends BaseService {
  constructor() {
    super(questionRepository, 'admin:question')
  }

  async syncQuestionCount(testId) {
    const count = await questionRepository.count({ test: testId, isDeleted: false })
    await courseTestRepository.updateById(testId, { totalMappedQuestions: count })
  }

  async listAll({ page, limit, test, status, language, search, sortOrder } = {}) {
    const filter = { isDeleted: false }

    if (test) filter.test = test
    if (status) filter.status = status
    if (language) filter.language = language

    if (search) {
      filter.$or = [
        { 'question.text': { $regex: search, $options: 'i' } },
        { 'explanation.text': { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, order: 1, createdAt: -1 },
      populate: [{ path: 'test', select: 'title slug' }],
    })
  }

  async getOne(id) {
    const question = await questionRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [{ path: 'test', select: 'title slug' }] }
    )

    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')
    return question
  }

  buildPayload(data = {}) {
    const payload = { ...data }

    if (payload.testId && !payload.test) payload.test = payload.testId
    delete payload.testId

    if (payload.question?.text === '') payload.question.text = ''
    if (payload.question?.image === '') payload.question.image = ''
    if (payload.explanation?.text === '') payload.explanation.text = ''
    if (payload.explanation?.image === '') payload.explanation.image = ''
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
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
    if (!payload.groupId) payload.groupId = new mongoose.Types.ObjectId()
    const result = await questionRepository.createSingle(payload)
    if (payload.test) await this.syncQuestionCount(payload.test)
    return result
  }

  async createQuestionDual({ hi, en }, createdBy) {
    const testId = hi?.test || hi?.testId || en?.test || en?.testId
    // Same logical question in both languages → shared order + shared groupId.
    const order = await this.nextOrder(testId)
    const groupId = new mongoose.Types.ObjectId()

    const [hiResult, enResult] = await Promise.all([
      questionRepository.createSingle(this.buildPayload({ ...hi, language: 'hi', order, groupId, createdBy })),
      questionRepository.createSingle(this.buildPayload({ ...en, language: 'en', order, groupId, createdBy })),
    ])
    if (testId) await this.syncQuestionCount(testId)
    return [hiResult, enResult]
  }

  async updateQuestion(id, data) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    const payload = this.buildPayload(data)
    const updated = await questionRepository.updateById(id, payload)
    const testId = payload.test || question.test
    if (testId) await this.syncQuestionCount(testId)

    return updated
  }

  async softDelete(id) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    await questionRepository.updateById(id, { isDeleted: true })
    if (question.test) await this.syncQuestionCount(question.test)
    this.logger.info({ questionId: id }, 'Question soft deleted')
  }

  async softDeleteByTest(testId) {
    const courseTest = await courseTestRepository.findOne({ _id: testId, isDeleted: false })
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')

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

    if (req.body.question && typeof req.body.question === 'string') {
      req.body.question = JSON.parse(req.body.question)
    }

    if (req.body.explanation && typeof req.body.explanation === 'string') {
      req.body.explanation = JSON.parse(req.body.explanation)
    }

    if (req.body.options && typeof req.body.options === 'string') {
      req.body.options = JSON.parse(req.body.options)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = adminQuestionService
