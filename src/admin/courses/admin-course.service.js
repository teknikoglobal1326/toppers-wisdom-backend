const BaseService = require("../../core/BaseService");
const courseRepository = require("../../modules/course/course.repository");
const { getPresignedUploadUrl } = require("../../lib/s3");
const { createLogger } = require("../../config/logger");

const COURSE_NAME_POPULATE = [
  { path: "exam", select: "name" },
  { path: "subExam", select: "name" },
];

const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // strip special chars (non-ASCII like Hindi becomes empty)
    .replace(/[\s_]+/g, "-") // spaces/underscores → hyphen
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-+|-+$/g, ""); // trim edge hyphens
  const suffix = Date.now().toString(36); // short unique suffix e.g. "lrz1k4"
  return base ? `${base}-${suffix}` : suffix;
};

const buildCourseSort = ({ sortBy = 'createdAt', order = 'desc' } = {}) => {
  const direction = order === 'desc' ? -1 : 1;

  if (sortBy === 'price') {
    return { price: direction, sortOrder: 1, createdAt: -1 };
  }

  if (sortBy === 'createdAt') {
    return { createdAt: direction, sortOrder: 1 };
  }

  return { sortOrder: direction, createdAt: -1 };
};

class AdminCourseService extends BaseService {
  constructor() {
    super(courseRepository, "admin:course");
    this.logger = createLogger("admin:course:service");
  }

  buildPayload(data = {}) {
    const payload = { ...data }

    if (payload.examId && !payload.exam) payload.exam = payload.examId
    delete payload.examId

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      payload.sortOrder = Number(payload.sortOrder)
      if (Number.isNaN(payload.sortOrder)) delete payload.sortOrder
    }

    return payload
  }

  async create(data) {
    const payload = this.buildPayload(data)

    return super.create({
      ...payload,
      slug: generateSlug(data.title),
    });
  }

  async update(id, data) {
    return super.update(id, this.buildPayload(data))
  }

  async listAll(filters) {
    // No status filter — admins see everything
    const filter = { isDeleted: false };

    if (filters.status) filter.status = filters.status;
    if (filters.examId) filter.exam = filters.examId;
    if (filters.subExam) filter.subExam = filters.subExam;
    if (filters.subExamId) filter.subExam = filters.subExamId;
    if (filters.type) filter.type = filters.type;
    const titleSearch = (filters.search || filters.title || "").trim();
    if (titleSearch) {
      filter.title = {
        $regex: titleSearch,
        $options: "i",
      };
    }

    // inherited getAll
    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: buildCourseSort(filters),
      populate: COURSE_NAME_POPULATE,
    });
  }

  async getById(id) {
    return super.getById(id, { populate: COURSE_NAME_POPULATE });
  }

  async publish(courseId) {
    this.logger.info({ courseId }, "Publishing course");
    // inherited update
    return this.update(courseId, {
      status: "published",
      publishedAt: new Date(),
    });
  }

  async archive(courseId) {
    this.logger.info({ courseId }, "Archiving course");
    return this.update(courseId, { status: "archived", isDeleted: true });
  }

  async addLesson(courseId, lessonData) {
    this.logger.info({ courseId }, "Adding lesson");
    return courseRepository.addLesson(courseId, lessonData);
  }

  async removeLesson(courseId, lessonId) {
    this.logger.info({ courseId, lessonId }, "Removing lesson");
    return courseRepository.removeLesson(courseId, lessonId);
  }

  async getLessonUploadUrl(courseId, lessonId, contentType) {
    const key = `courses/${courseId}/lessons/${lessonId}/video`;
    return getPresignedUploadUrl(key, contentType);
  }

  async getThumbnailUploadUrl(courseId, contentType) {
    const key = `courses/${courseId}/thumbnail`;
    return getPresignedUploadUrl(key, contentType);
  }

  async getBannerUploadUrl(courseId, contentType) {
    const key = `courses/${courseId}/banner`;
    return getPresignedUploadUrl(key, contentType);
  }

  async updateTimetable(courseId, data) {
    this.logger.info({ courseId, type: data.type }, "Updating timetable");
    
    if (!['pdf', 'text'].includes(data.type)) {
      const AppError = require('../../core/AppError')
      throw new AppError('Invalid timetable type. Must be pdf or text.', 400);
    }
    
    const timetable = {
      type: data.type,
      content: data.content || ''
    };

    return this.update(courseId, { timetable });
  }

  async listPurchases(query) {
    return courseRepository.listPurchases(query);
  }
}

module.exports = new AdminCourseService();
