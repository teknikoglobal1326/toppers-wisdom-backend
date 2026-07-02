const path = require('path')
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
    await courseTestRepository.updateById(testId, { totalQuestions: count })
  }

  async listAll({ page, limit, test, status, language, search } = {}) {
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

    return this.getAll(filter, {
      page,
      limit,
      sort: { order: 1, createdAt: -1 },
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

    return payload
  }

  async createQuestion(data) {
    const payload = this.buildPayload(data)

    let result
    if (payload.language === 'both') {
      result = await questionRepository.createSingle(payload)
    } else {
      const [primary, secondary] = await questionRepository.createPair(payload)
      result = [primary, secondary]
    }

    if (payload.test) {
      await this.syncQuestionCount(payload.test)
    }

    return result
  }

  async updateQuestion(id, data) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    const payload = this.buildPayload(data)
    const updated = await questionRepository.updateById(id, payload)

    const previousTestId = question.test
    const currentTestId = payload.test || previousTestId

    if (previousTestId && currentTestId && previousTestId.toString() !== currentTestId.toString()) {
      await this.syncQuestionCount(previousTestId)
    }

    if (currentTestId) {
      await this.syncQuestionCount(currentTestId)
    }

    return updated
  }

  async softDelete(id) {
    const question = await questionRepository.findOne({ _id: id, isDeleted: false })
    if (!question) throw new AppError('Question not found', 404, 'NOT_FOUND')

    await questionRepository.updateById(id, { isDeleted: true })
    if (question.test) {
      await this.syncQuestionCount(question.test)
    }
    this.logger.info({ questionId: id }, 'Question soft deleted')
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
