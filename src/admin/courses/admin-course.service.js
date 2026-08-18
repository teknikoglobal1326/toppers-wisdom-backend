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
    if (filters.type) {
      if (filters.type === 'paid') {
        filter.isFree = false;
      } else {
        filter.type = filters.type;
      }
    }
    if (filters.language) filter.language = filters.language;
    if (filters.qualificationId) filter.qualificationId = filters.qualificationId;
    const titleSearch = (filters.search || filters.title || "").trim();
    if (titleSearch) {
      filter.title = {
        $regex: titleSearch,
        $options: "i",
      };
    }

    // inherited getAll
    const result = await this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: buildCourseSort(filters),
      populate: COURSE_NAME_POPULATE,
    });

    const [globalTotal, globalPublished, globalFree] = await Promise.all([
      this.repository.count({ isDeleted: false }),
      this.repository.count({ isDeleted: false, status: 'published' }),
      this.repository.count({
        isDeleted: false,
        $or: [{ isFree: true }, { type: 'free' }],
      }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalPublished = globalPublished
    result.pagination.globalFree = globalFree

    return result
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

  async getAssociatedData(courseId, type,testId = null) {
    const Course = require('../../models/Course.model')
    const Subject = require('../../models/Subject.model')

    if(testId){
      const Test = require('../../models/Test.model')
      const test = await Test.findById(testId).select('subjects').lean()
      if (!test) {
        const AppError = require('../../core/AppError')
        throw new AppError('Test not found', 404)
      }
      return test.subjects
    }

    const course = await Course.findById(courseId).select('subjects').lean()
    if (!course) {
      const AppError = require('../../core/AppError')
      throw new AppError('Course not found', 404)
    }

    const subjectIds = (course.subjects || []).map(s => s.subject)

    if (type === 'subject') {
      const subjects = await Subject.find({
        _id: { $in: subjectIds },
        isDeleted: false,
        status: 'active'
      }).select('_id name sortOrder').sort({ sortOrder: 1, name: 1 }).lean()
      return subjects
    }

    if (type === 'chapter') {
      const subjects = await Subject.find({
        _id: { $in: subjectIds },
        isDeleted: false,
        status: 'active'
      }).select('_id name chapters').sort({ sortOrder: 1, name: 1 }).lean()

      const chapters = []
      for (const sub of subjects) {
        for (const ch of sub.chapters || []) {
          chapters.push({
            _id: ch._id,
            name: ch.name,
            subjectId: sub._id,
            subjectName: sub.name
          })
        }
      }
      return chapters
    }

    if (type === 'topic') {
      const subjects = await Subject.find({
        _id: { $in: subjectIds },
        isDeleted: false,
        status: 'active'
      }).select('_id name chapters').sort({ sortOrder: 1, name: 1 }).lean()

      const topics = []
      for (const sub of subjects) {
        for (const ch of sub.chapters || []) {
          for (const tp of ch.topics || []) {
            topics.push({
              _id: tp._id,
              name: tp.name,
              chapterId: ch._id,
              chapterName: ch.name,
              subjectId: sub._id,
              subjectName: sub.name
            })
          }
        }
      }
      return topics
    }

    return []
  }

  async uploadPdfForCourse(courseId, payload) {
    const CourseSeparatedPdf = require('../../models/CourseSeparatedPdf.model')
    const Course = require('../../models/Course.model')
    const AppError = require('../../core/AppError')

    const courseObj = await Course.findById(courseId).lean()
    if (!courseObj) {
      throw new AppError('Course not found', 404, 'NOT_FOUND')
    }

    const pdf = await CourseSeparatedPdf.create({
      ...payload,
      course: courseId
    })

    return pdf
  }

  async listPdfsForCourse(courseId, query = {}) {
    const CourseSeparatedPdf = require('../../models/CourseSeparatedPdf.model')
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.max(1, Number(query.limit) || 20)
    const skip = (page - 1) * limit

    const filter = { course: courseId, isDeleted: false }
    if (query.status) filter.status = query.status
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ]
    }

    const direction = query.order === 'desc' ? -1 : 1
    const sort = query.sortBy === 'createdAt'
      ? { createdAt: direction, sortOrder: 1 }
      : { sortOrder: direction, createdAt: -1 }

    const [total, data] = await Promise.all([
      CourseSeparatedPdf.countDocuments(filter),
      CourseSeparatedPdf.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('subjects')
        .lean()
    ])

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getPdfForCourse(courseId, pdfId) {
    const CourseSeparatedPdf = require('../../models/CourseSeparatedPdf.model')
    const Subject = require('../../models/Subject.model')
    const AppError = require('../../core/AppError')
    const pdf = await CourseSeparatedPdf.findOne({ _id: pdfId, course: courseId, isDeleted: false }).populate('subjects').lean()
    if (!pdf) {
      throw new AppError('PDF not found', 404, 'NOT_FOUND')
    }

    const subjectIds = pdf.subjects || []
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean()

    const chapterMap = new Map()
    const topicMap = new Map()

    subjects.forEach(sub => {
      (sub.chapters || []).forEach(ch => {
        chapterMap.set(ch._id.toString(), ch.name)
        (ch.topics || []).forEach(tp => {
          topicMap.set(tp._id.toString(), tp.name)
        })
      })
    })

    pdf.chapters = (pdf.chapters || []).map(chId => ({
      _id: chId,
      name: chapterMap.get(chId.toString()) || ''
    }))

    pdf.topics = (pdf.topics || []).map(tpId => ({
      _id: tpId,
      name: topicMap.get(tpId.toString()) || ''
    }))

    return pdf
  }

  async updatePdfForCourse(courseId, pdfId, payload) {
    const CourseSeparatedPdf = require('../../models/CourseSeparatedPdf.model')
    const AppError = require('../../core/AppError')

    const arrayFields = ['subjects', 'topics', 'chapters']
    for (const field of arrayFields) {
      if (payload[field] && typeof payload[field] === 'string') {
        try { payload[field] = JSON.parse(payload[field]) } catch (e) { }
      }
    }

    const pdf = await CourseSeparatedPdf.findOneAndUpdate(
      { _id: pdfId, course: courseId, isDeleted: false },
      payload,
      { new: true }
    )
    if (!pdf) {
      throw new AppError('PDF not found', 404, 'NOT_FOUND')
    }
    return pdf
  }

  async deletePdfForCourse(courseId, pdfId) {
    const CourseSeparatedPdf = require('../../models/CourseSeparatedPdf.model')
    const AppError = require('../../core/AppError')
    const pdf = await CourseSeparatedPdf.findOneAndUpdate(
      { _id: pdfId, course: courseId, isDeleted: false },
      { isDeleted: true }
    )
    if (!pdf) {
      throw new AppError('PDF not found', 404, 'NOT_FOUND')
    }
    return pdf
  }

  async uploadTestForCourse(courseId, payload) {
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model')
    const Course = require('../../models/Course.model')
    const AppError = require('../../core/AppError')

    const courseObj = await Course.findById(courseId).lean()
    if (!courseObj) {
      throw new AppError('Course not found', 404, 'NOT_FOUND')
    }

    if (!payload.slug && payload.title) {
      payload.slug = generateSlug(payload.title)
    }

    const test = await CourseSeparatedTest.create({
      ...payload,
      course: courseId
    })

    return test
  }

  async listTestsForCourse(courseId, query = {}) {
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model')
    const questionRepository = require('../../modules/question/question.repository')
    const page = Math.max(1, Number(query.page) || 1)
    const limit = Math.max(1, Number(query.limit) || 20)
    const skip = (page - 1) * limit

    const filter = { course: courseId, isDeleted: false }
    if (query.status) filter.status = query.status
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } }
      ]
    }

    const direction = query.order === 'desc' ? -1 : 1
    const sort = query.sortBy === 'createdAt'
      ? { createdAt: direction, sortOrder: 1 }
      : { sortOrder: direction, createdAt: -1 }

    const [total, rawData] = await Promise.all([
      CourseSeparatedTest.countDocuments(filter),
      CourseSeparatedTest.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('subjects')
        .lean()
    ])

    const counts = await Promise.all(rawData.map((ct) =>
      questionRepository.count({ test: ct._id, isDeleted: false })
    ))

    const data = rawData.map((ct, index) => {
      ct.totalMappedQuestions = counts[index]
      return ct
    })

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getTestForCourse(courseId, testId) {
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model')
    const Subject = require('../../models/Subject.model')
    const AppError = require('../../core/AppError')
    const test = await CourseSeparatedTest.findOne({ _id: testId, course: courseId, isDeleted: false }).populate('subjects').lean()
    if (!test) {
      throw new AppError('Test not found', 404, 'NOT_FOUND')
    }

    const subjectIds = test.subjects || []
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean()

    const chapterMap = new Map()
    const topicMap = new Map()

    subjects.forEach(sub => {
      (sub.chapters || []).forEach(ch => {
        chapterMap.set(ch._id.toString(), ch.name)
        (ch.topics || []).forEach(tp => {
          topicMap.set(tp._id.toString(), tp.name)
        })
      })
    })

    test.chapters = (test.chapters || []).map(chId => ({
      _id: chId,
      name: chapterMap.get(chId.toString()) || ''
    }))

    test.topics = (test.topics || []).map(tpId => ({
      _id: tpId,
      name: topicMap.get(tpId.toString()) || ''
    }))

    return test
  }

  async updateTestForCourse(courseId, testId, payload) {
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model')
    const AppError = require('../../core/AppError')

    const arrayFields = ['subjects', 'topics', 'chapters']
    for (const field of arrayFields) {
      if (payload[field] && typeof payload[field] === 'string') {
        try { payload[field] = JSON.parse(payload[field]) } catch (e) { }
      }
    }

    if (payload.image === '') delete payload.image

    const test = await CourseSeparatedTest.findOneAndUpdate(
      { _id: testId, course: courseId, isDeleted: false },
      payload,
      { new: true }
    )
    if (!test) {
      throw new AppError('Test not found', 404, 'NOT_FOUND')
    }
    return test
  }

  async deleteTestForCourse(courseId, testId) {
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model')
    const AppError = require('../../core/AppError')
    const test = await CourseSeparatedTest.findOneAndUpdate(
      { _id: testId, course: courseId, isDeleted: false },
      { isDeleted: true }
    )
    if (!test) {
      throw new AppError('Test not found', 404, 'NOT_FOUND')
    }
    return test
  }
}

module.exports = new AdminCourseService();


