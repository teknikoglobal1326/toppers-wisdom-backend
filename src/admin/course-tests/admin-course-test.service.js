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


  
  async listAll({ page, limit, status, course, topic, search, sortOrder } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { slug: { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    const result = await this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'topic', select: 'topicName' },
      ],
    })

    return this.attachMappedQuestionCounts(result)
  }

  async getOne(id) {
    const courseTest = await courseTestRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'topic', select: 'topicName chapters' },
        ],
      }
    )
    if (!courseTest) throw new AppError('Course test not found', 404, 'NOT_FOUND')
    return courseTest
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    if (payload.topicId && !payload.topic) payload.topic = payload.topicId
    delete payload.courseId
    delete payload.topicId
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
