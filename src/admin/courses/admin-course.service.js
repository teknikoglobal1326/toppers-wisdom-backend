const BaseService      = require('../../core/BaseService')
const courseRepository = require('../../modules/course/course.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger } = require('../../config/logger')

const COURSE_NAME_POPULATE = [
  { path: 'exam', select: 'name' },
  { path: 'subExam', select: 'name' },
]

const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // strip special chars (non-ASCII like Hindi becomes empty)
    .replace(/[\s_]+/g, '-')    // spaces/underscores → hyphen
    .replace(/-+/g, '-')        // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')    // trim edge hyphens
  const suffix = Date.now().toString(36)  // short unique suffix e.g. "lrz1k4"
  return base ? `${base}-${suffix}` : suffix
}

class AdminCourseService extends BaseService {
  constructor() {
    super(courseRepository, 'admin:course')
    this.logger = createLogger('admin:course:service')
  }

  async create(data) {
    const { examId, ...rest } = data
    return super.create({ ...rest, exam: examId, slug: generateSlug(data.title) })
  }

  async listAll(filters) {
    // No status filter — admins see everything
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.examId)  filter.exam    = filters.examId
    if (filters.subExam) filter.subExam = filters.subExam
    if (filters.subExamId) filter.subExam = filters.subExamId
    // inherited getAll
    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      populate: COURSE_NAME_POPULATE,
    })
  }

  async getById(id) {
    return super.getById(id, { populate: COURSE_NAME_POPULATE })
  }

  async publish(courseId) {
    this.logger.info({ courseId }, 'Publishing course')
    // inherited update
    return this.update(courseId, { status: 'published', publishedAt: new Date() })
  }

  async archive(courseId) {
    this.logger.info({ courseId }, 'Archiving course')
    return this.update(courseId, { status: 'archived' })
  }

  async addLesson(courseId, lessonData) {
    this.logger.info({ courseId }, 'Adding lesson')
    return courseRepository.addLesson(courseId, lessonData)
  }

  async removeLesson(courseId, lessonId) {
    this.logger.info({ courseId, lessonId }, 'Removing lesson')
    return courseRepository.removeLesson(courseId, lessonId)
  }

  async getLessonUploadUrl(courseId, lessonId, contentType) {
    const key = `courses/${courseId}/lessons/${lessonId}/video`
    return getPresignedUploadUrl(key, contentType)
  }

  async getThumbnailUploadUrl(courseId, contentType) {
    const key = `courses/${courseId}/thumbnail`
    return getPresignedUploadUrl(key, contentType)
  }

  async getBannerUploadUrl(courseId, contentType) {
    const key = `courses/${courseId}/banner`
    return getPresignedUploadUrl(key, contentType)
  }
}

module.exports = new AdminCourseService()