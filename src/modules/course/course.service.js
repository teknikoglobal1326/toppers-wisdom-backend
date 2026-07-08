const BaseService = require('../../core/BaseService')
const courseRepository = require('./course.repository')
const { checkAccess } = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const Pdf = require('../../models/Pdf.model')
const Content = require('../../models/Content.model')
const Test = require('../../models/Test.model')
const CourseTest = require('../../models/CourseTest.model')
const Topic = require('../../models/Topic.model')

const getPdfChapterTitle = (chapter) => {
  if (!chapter) return ''
  if (typeof chapter === 'string') return chapter
  if (typeof chapter === 'object' && typeof chapter.title === 'string') return chapter.title
  return ''
}

class CourseService extends BaseService {
  constructor() {
    super(courseRepository, 'course')
    this.logger = createLogger('course:service')
  }

  async listCourseSubjects(userId, filters = {}) {
    const user = await User.findById(userId).select('subExams').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id)
    this.logger.info({ userId, subExamIds, filters }, 'Listing course subjects')

    const matchQuery = { subExam: { $in: subExamIds }, status: 'published', isDeleted: false }
    if (filters.type) matchQuery.type = filters.type
    if (filters.isFree !== undefined) matchQuery.isFree = filters.isFree === 'true'
    console.log("matchQuery==================>", matchQuery);
    const pipeline = [
      { $match: matchQuery },
      { $unwind: { path: '$subjects', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjects.subject',
          foreignField: '_id',
          as: 'subjectInfo',
        },
      },
      { $unwind: '$subjectInfo' },
      { $match: { 'subjectInfo.isDeleted': false, 'subjectInfo.status': 'active' } },
      {
        $group: {
          _id: '$subjectInfo._id',
          name: { $first: '$subjectInfo.name' },
        },
      },
      { $sort: { name: 1 } },
    ]

    return this.repository.aggregate(pipeline)
  }

  async listCourses(userId, _ignored, filters, lang) {
    const user = await User.findById(userId).select('subExams').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id)
    this.logger.info({ userId, subExamIds }, 'Listing courses')

    const filter = { subExam: { $in: subExamIds }, status: 'published', isDeleted: false }
    if (filters.type) filter.type = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    // if (lang && lang !== 'both') filter.language = { $in: [lang, 'both'] }

    const sortBy = filters.sortBy || 'createdAt'
    const order = filters.order === 'asc' ? 1 : -1
    const sort = sortBy === 'price'
      ? { price: order, createdAt: -1 }
      : sortBy === 'sortOrder'
        ? { sortOrder: order, createdAt: -1 }
        : { createdAt: order, sortOrder: 1 }

    const result = await this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      sort,
      select: 'title slug thumbnail type mrp price isFree sortOrder avgRating totalEnrollments instructor.name language description longDescription subjects',
      populate: [{ path: 'subjects.subject', select: 'name' }]
    })

    result.data = await Promise.all(result.data.map(async (course) => ({
      ...course,
      hasAccess: course.isFree || await checkAccess(userId, 'course', course._id),
    })))

    return result
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course detail')
    // inherited: this.getById() throws 404 automatically if not found
    const course = await this.getById(courseId, {
      select: 'title slug description longDescription mrp price thumbnail bannerImage isFree lessons subjects'
    })
    if (course.isDeleted) throw new AppError('Course not found', 404, 'NOT_FOUND')
    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)

    if (!hasAccess && course.lessons) {
      course.lessons = course.lessons.map((l) =>
        l.isPreview ? l : { ...l, videoKey: undefined, pdfKey: undefined }
      )
    }

    const enrollment = await courseRepository.findEnrollment(userId, courseId)

    const [pdfs, contents, tests, courseTests, topics] = await Promise.all([
      Pdf.find({ course: courseId, isDeleted: false, status: 'active' })
        .select('title description pdfFile image topic chapter')
        .lean(),
      Content.find({ course: courseId, isDeleted: false, status: 'active' })
        .select('title description video image topic chapter')
        .lean(),
      Test.find({ course: courseId, status: 'published' })
        .select('title slug description image duration totalQuestion totalMarks difficulty')
        .lean(),
      CourseTest.find({ course: courseId, isDeleted: false, status: { $in: ['active', 'published'] } })
        .select('title slug description image duration totalQuestion totalMarks difficulty topic chapter')
        .lean(),
      Topic.find({ course: courseId, isDeleted: false, status: 'active' }).lean()
    ])

    const syllabus = {
      content: [],
      pdf: [],
      test: []
    };

    topics.forEach(topic => {
      const topicId = topic._id.toString();
      const chapterIdentifiers = (topic.chapters || []).flatMap(c => [c.title, c._id?.toString()]).filter(Boolean);
      const chapterTitles = (topic.chapters || []).map((c) => c.title).filter(Boolean);

      const contentChapters = [];
      const pdfChapters = [];
      const testChapters = [];

      (topic.chapters || []).forEach(chapter => {
        const chapterTitle = chapter.title;
        const chapterId = chapter._id?.toString();

        const matchChapter = (item) => item.chapter === chapterTitle || item.chapter?.toString() === chapterId;

        const chapterContents = contents.filter(c => c.topic?.toString() === topicId && matchChapter(c));
        const chapterPdfs = pdfs.filter(p => p.topic?.toString() === topicId && matchChapter(p));
        const chapterTests = courseTests.filter(t => t.topic?.toString() === topicId && matchChapter(t));

        const combinedData = [
          ...chapterContents.map(c => ({ ...c, materialType: 'content' })),
          ...chapterPdfs.map(p => ({ ...p, materialType: 'pdf' })),
          ...chapterTests.map(t => ({ ...t, materialType: 'test' }))
        ];

        if (combinedData.length > 0) {
          contentChapters.push({ title: chapterTitle, data: combinedData });
        }
        const pdfChapterItems = pdfs.filter((p) =>
          p.topic?.toString() === topicId &&
          getPdfChapterTitle(p.chapter) === chapterTitle
        );

        if (pdfChapterItems.length > 0) {
          pdfChapters.push({
            title: chapterTitle,
            data: pdfChapterItems
          });
        }

        // const chapterPdfs = pdfs.filter((p) => p.topic?.toString() === topicId && getPdfChapterTitle(p.chapter) === chapterTitle);
        // if (chapterPdfs.length > 0) {
        //   pdfChapters.push({ title: chapterTitle, data: chapterPdfs });
        // }

        // if (chapterTests.length > 0) {
        //   testChapters.push({ title: chapterTitle, data: chapterTests });
        // }
      });

      const unassignedContents = contents.filter(c => c.topic?.toString() === topicId && (!c.chapter || !chapterIdentifiers.includes(c.chapter?.toString())));
      const unassignedPdfs = pdfs.filter((p) => {
        const chapterTitle = getPdfChapterTitle(p.chapter)
        return p.topic?.toString() === topicId && (!chapterTitle || !chapterTitles.includes(chapterTitle))
      });
      const unassignedTests = courseTests.filter(t => t.topic?.toString() === topicId && (!t.chapter || !chapterIdentifiers.includes(t.chapter?.toString())));

      const combinedUnassigned = [
        ...unassignedContents.map(c => ({ ...c, materialType: 'content' })),
        ...unassignedPdfs.map(p => ({ ...p, materialType: 'pdf' })),
        ...unassignedTests.map(t => ({ ...t, materialType: 'test' }))
      ];

      if (contentChapters.length > 0 || combinedUnassigned.length > 0) {
        syllabus.content.push({
          _id: topic._id,
          topicName: topic.topicName,
          chapters: contentChapters,
          ...(combinedUnassigned.length > 0 && { unassignedData: combinedUnassigned })
        });
      }

      if (pdfChapters.length > 0 || unassignedPdfs.length > 0) {
        syllabus.pdf.push({
          _id: topic._id,
          topicName: topic.topicName,
          chapters: pdfChapters,
          ...(unassignedPdfs.length > 0 && { unassignedData: unassignedPdfs })
        });
      }

      if (testChapters.length > 0 || unassignedTests.length > 0) {
        syllabus.test.push({
          _id: topic._id,
          topicName: topic.topicName,
          chapters: testChapters,
          ...(unassignedTests.length > 0 && { unassignedData: unassignedTests })
        });
      }
    });

    return {
      ...course,
      hasAccess,
      enrollmentProgress: enrollment?.progressPercent || 0,
      syllabus,
      tests // kept root level tests in case they are needed
    }
  }

  async getVideoUrl(courseId, lessonId, userId) {
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const course = await this.getById(courseId)
    const lesson = course.lessons.find((l) => l._id.toString() === lessonId)
    if (!lesson?.videoKey) throw new AppError('Video not available for this lesson', 404)

    const url = await getPresignedDownloadUrl(lesson.videoKey, 900)
    this.logger.info({ courseId, lessonId, userId }, 'Video URL generated')
    return { url, expiresIn: 900 }
  }

  async enrollFree(courseId, userId) {
    const course = await this.getById(courseId)
    if (!course.isFree) throw new AppError('This is a paid course. Please purchase it first.', 403)

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    const enrollment = await courseRepository.createEnrollment(userId, courseId)
    await courseRepository.incrementEnrollments(courseId)
    this.logger.info({ courseId, userId }, 'User enrolled in free course')
    return enrollment
  }

  async addReview(courseId, userId, data) {
    this.logger.info({ courseId, userId }, 'Adding review')
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You must be enrolled to leave a review', 403)

    const course = await this.getById(courseId)
    const newTotal = course.totalReviews + 1
    const newAvg = parseFloat((((course.avgRating * course.totalReviews) + data.rating) / newTotal).toFixed(2))

    await courseRepository.updateRating(courseId, newAvg, newTotal)
    this.logger.info({ courseId, newAvg, newTotal }, 'Review added')
    return { avgRating: newAvg, totalReviews: newTotal }
  }

  async getTimetable(courseId) {
    this.logger.info({ courseId }, 'Fetching timetable')
    const course = await this.repository.findById(courseId, { select: 'title timetable lessons' })
    if (!course) throw new AppError('Course not found', 404)
    return { courseId, timetable: course.timetable || [], lessons: course.lessons || [] }
  }

  async checkout(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Checkout preview requested')

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    const course = await this.getById(courseId, { select: 'title mrp price isFree description thumbnail' })

    if (course.isFree) {
      return {
        courseId,
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        mrp: course.mrp,
        subtotal: 0,
        gstRate: 0,
        gstAmount: 0,
        grandTotal: 0,
        isFree: true
      }
    }

    const gstRate = 18; // 18% standard GST
    const subtotal = course.price || 0;
    const gstAmount = parseFloat(((subtotal * gstRate) / 100).toFixed(2));
    const grandTotal = parseFloat((subtotal + gstAmount).toFixed(2));

    return {
      courseId,
      title: course.title,
      mrp: course.mrp,
      description: course.description,
      thumbnail: course.thumbnail,
      price: course.price,
      subtotal,
      gstRate,
      gstAmount,
      grandTotal,
      isFree: false
    }
  }
}

module.exports = new CourseService()