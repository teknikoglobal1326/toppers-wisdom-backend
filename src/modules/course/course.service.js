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
const Subject = require('../../models/Subject.model')
const paymentService = require('../payment/payment.service')
const { generateSubscriberToken } = require('../../lib/agora')

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
    const user = await User.findById(userId).select('subExams exam subExam examType').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id || s).filter(Boolean)
    if (user?.subExam?._id && !subExamIds.some(id => String(id) === String(user.subExam._id))) {
      subExamIds.push(user.subExam._id)
    }
    const examId = user?.exam?._id || (typeof user?.exam === 'object' ? user?.exam?._id : user?.exam) || user?.examType?._id
    this.logger.info({ userId, subExamIds, examId, filters }, 'Listing course subjects')

    const matchQuery = { status: 'published', isDeleted: false }
    if (filters.type) matchQuery.type = filters.type
    if (filters.isFree !== undefined) matchQuery.isFree = filters.isFree === 'true'

    const reqExam = filters.exam || filters.examId
    const reqSubExam = filters.subExam || filters.subExamId

    if (reqSubExam) {
      matchQuery.subExam = reqSubExam
    } else if (reqExam) {
      matchQuery.exam = reqExam
    } else if (subExamIds.length > 0 && examId) {
      matchQuery.$or = [{ subExam: { $in: subExamIds } }, { exam: examId }]
    } else if (subExamIds.length > 0) {
      matchQuery.subExam = { $in: subExamIds }
    } else if (examId) {
      matchQuery.exam = examId
    }

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

  async listCourses(userId, _ignored, filters = {}, lang) {
    const user = await User.findById(userId).select('subExams exam subExam examType').lean()
    const subExamIds = (user?.subExams || []).map((s) => s._id || s).filter(Boolean)
    if (user?.subExam?._id && !subExamIds.some(id => String(id) === String(user.subExam._id))) {
      subExamIds.push(user.subExam._id)
    }
    const examId = user?.exam?._id || (typeof user?.exam === 'object' ? user?.exam?._id : user?.exam) || user?.examType?._id

    this.logger.info({ userId, subExamIds, examId }, 'Listing courses')

    const filter = { status: 'published', isDeleted: false }
    if (filters.type) filter.type = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'

    const subjectParam = filters.subject || filters.subjectId
    if (subjectParam && String(subjectParam).toLowerCase() !== 'all') {
      filter['subjects.subject'] = subjectParam
    }

    const reqExam = filters.exam || filters.examId
    const reqSubExam = filters.subExam || filters.subExamId

    if (reqSubExam) {
      filter.subExam = reqSubExam
    } else if (reqExam) {
      filter.exam = reqExam
    } else if (subExamIds.length > 0 && examId) {
      filter.$or = [{ subExam: { $in: subExamIds } }, { exam: examId }]
    } else if (subExamIds.length > 0) {
      filter.subExam = { $in: subExamIds }
    } else if (examId) {
      filter.exam = examId
    }

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
      select: 'title slug thumbnail type mrp price isFree sortOrder avgRating totalEnrollments instructor.name language description longDescription subjects timetable exam subExam',
      populate: [{ path: 'subjects.subject', select: 'name' }]
    })

    result.data = await Promise.all(result.data.map(async (course) => {
      const isPurchased = !!(await courseRepository.findEnrollment(userId, course._id))
      return {
        ...course,
        hasAccess: course.isFree || isPurchased || await checkAccess(userId, 'course', course._id),
        isPurchased
      }
    }))

    return result
  }

  async myCourses(userId, filters) {
    this.logger.info({ userId }, 'Listing my courses')

    const enrollments = await courseRepository.findEnrollmentsByUser(userId)
    const courseIds = enrollments.map(e => e.course)

    const filter = { _id: { $in: courseIds }, status: 'published', isDeleted: false }
    if (filters.type) filter.type = filters.type

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
      select: 'title slug thumbnail type mrp price isFree sortOrder avgRating totalEnrollments instructor.name language description longDescription subjects timetable',
      populate: [{ path: 'subjects.subject', select: 'name' }]
    })

    result.data = result.data.map(course => ({
      ...course,
      hasAccess: true,
      isPurchased: true
    }))

    return result
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course detail')
    // inherited: this.getById() throws 404 automatically if not found
    const course = await this.getById(courseId, {
      select: 'title slug description longDescription mrp price thumbnail bannerImage isFree lessons subjects timetable',
      populate: [{ path: 'subjects.subject', select: 'name' }]
    })
    if (course.isDeleted) throw new AppError('Course not found', 404, 'NOT_FOUND')
    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)

    if (!hasAccess && course.lessons) {
      course.lessons = course.lessons.map((l) =>
        l.isPreview ? l : { ...l, videoKey: undefined, pdfKey: undefined }
      )
    }

    const enrollment = await courseRepository.findEnrollment(userId, courseId)

    const tests = await Test.find({ course: courseId, status: 'published' })
      .select('title slug description image duration totalQuestion totalMarks difficulty')
      .lean();

    const subjectsList = (course.subjects || []).map(s => {
      if (s.subject && s.subject._id) {
        return { _id: s.subject._id, name: s.subject.name }
      }
      return null
    }).filter(Boolean)

    const syllabus = {
      content: subjectsList,
      pdf: subjectsList,
      test: subjectsList
    };

    return {
      ...course,
      hasAccess,
      enrollmentProgress: enrollment?.progressPercent || 0,
      syllabus,
      tests // kept root level tests in case they are needed
    }
  }

  async getSubjectMaterials(courseId, subjectId, userId) {
    this.logger.info({ courseId, subjectId, userId }, 'Fetching subject materials for course');

    const course = await this.getById(courseId, { select: 'isFree isDeleted' });
    if (course.isDeleted) throw new AppError('Course not found', 404, 'NOT_FOUND');

    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId);

    const subject = await Subject.findOne({ _id: subjectId, isDeleted: false }).select('chapters name').lean();
    if (!subject) throw new AppError('Subject not found', 404, 'NOT_FOUND');

    const chapterIds = (subject.chapters || []).map(c => c._id.toString());

    console.log("chapterIds==================>", chapterIds);
    console.log("courseId=====================>", courseId);
    const [pdfs, contents, courseTests] = await Promise.all([
      Pdf.find({ course: courseId, chapters: { $in: chapterIds }, isDeleted: false, status: 'active' })
        .select('title description pdfFile image topics chapters')
        .lean(),
      Content.find({ course: courseId, chapter: { $in: chapterIds }, isDeleted: false, status: 'active' })
        .select('title description video image topic chapter isLive liveStatus scheduledStartTime scheduledEndTime agoraChannel')
        .lean(),
      CourseTest.find({ course: courseId, chapters: { $in: chapterIds }, isDeleted: false, status: { $in: ['active', 'published'] } })
        .select('title slug description image duration isPerQuestionTime totalQuestion totalMarks difficulty topics chapters')
        .lean()
    ]);

    const syllabus = {
      content: [],
      pdf: [],
      test: []
    };

    const chapters = subject.chapters || [];

    chapters.forEach(chapterDoc => {
      const chapterId = chapterDoc._id.toString();
      const chapterName = chapterDoc.name;
      const embeddedTopics = chapterDoc.topics || [];
      const topicIdentifiers = embeddedTopics.flatMap(t => [t.name, t._id?.toString()]).filter(Boolean);

      const contentTopics = [];
      const pdfTopics = [];
      const testTopics = [];

      const isUnassigned = (item, type) => {
        const val = (type === 'content') ? item.topic : item.topics;
        if (!val) return true;
        if (Array.isArray(val)) {
          if (val.length === 0) return true;
          return !val.some(t => topicIdentifiers.includes(t.toString()));
        }
        return !topicIdentifiers.includes(val.toString());
      };

      embeddedTopics.forEach(topic => {
        const topicName = topic.name;
        const topicId = topic._id?.toString();

        const matchTopic = (item, type) => {
          const val = (type === 'content') ? item.topic : item.topics;
          if (!val) return false;
          if (Array.isArray(val)) {
            return val.some(t => t.toString() === topicId || t.toString() === topicName);
          }
          return val.toString() === topicId || val === topicName;
        };

        const topicContents = contents.filter(c => (c.chapter || []).some(ch => ch.toString() === chapterId) && matchTopic(c, 'content'));
        const topicPdfs = pdfs.filter(p => (p.chapters || []).some(ch => ch.toString() === chapterId) && matchTopic(p, 'pdf'));
        const topicTests = courseTests.filter(t => (t.chapters || []).some(ch => ch.toString() === chapterId) && matchTopic(t, 'test'));

        const combinedData = [
          ...topicContents.map(c => ({ ...c, materialType: 'content' })),
          ...topicPdfs.map(p => ({ ...p, materialType: 'pdf' }))
        ];

        if (combinedData.length > 0) {
          contentTopics.push({ _id: topic._id, title: topicName, data: combinedData });
        }

        if (topicPdfs.length > 0) {
          pdfTopics.push({ _id: topic._id, title: topicName, data: topicPdfs });
        }

        if (topicTests.length > 0) {
          testTopics.push({ _id: topic._id, title: topicName, data: topicTests });
        }
      });

      const unassignedContents = contents.filter(c => (c.chapter || []).some(ch => ch.toString() === chapterId) && isUnassigned(c, 'content'));
      let unassignedPdfs = pdfs.filter(p => (p.chapters || []).some(ch => ch.toString() === chapterId) && isUnassigned(p, 'pdf'));
      const unassignedTests = courseTests.filter(t => (t.chapters || []).some(ch => ch.toString() === chapterId) && isUnassigned(t, 'test'));

      const combinedUnassigned = [
        ...unassignedContents.map(c => ({ ...c, materialType: 'content' })),
        ...unassignedPdfs.map(p => ({ ...p, materialType: 'pdf' }))
      ];

      if (contentTopics.length > 0 || combinedUnassigned.length > 0) {
        syllabus.content.push({
          _id: chapterId,
          chapterName,
          topics: contentTopics,
          ...(combinedUnassigned.length > 0 && { unassignedData: combinedUnassigned })
        });
      }

      unassignedPdfs = pdfs.filter(p => (p.chapters || []).some(ch => ch.toString() === chapterId) && isUnassigned(p, 'pdf'));
      if (pdfTopics.length > 0 || unassignedPdfs.length > 0) {
        syllabus.pdf.push({
          _id: chapterId,
          chapterName,
          topics: pdfTopics,
          ...(unassignedPdfs.length > 0 && { unassignedData: unassignedPdfs })
        });
      }

      if (testTopics.length > 0 || unassignedTests.length > 0) {
        syllabus.test.push({
          _id: chapterId,
          chapterName,
          topics: testTopics,
          ...(unassignedTests.length > 0 && { unassignedData: unassignedTests })
        });
      }
    });

    return syllabus;
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
    const course = await this.getById(courseId, { select: 'isFree isLifetime validityInMonths' })
    if (!course.isFree) throw new AppError('This is a paid course. Please purchase it first.', 403)

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    let expiresAt = null
    if (!course.isLifetime && course.validityInMonths) {
      const d = new Date()
      d.setMonth(d.getMonth() + course.validityInMonths)
      expiresAt = d
    }

    const enrollment = await courseRepository.createEnrollment(userId, courseId, expiresAt)
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

  async createRazorpayOrder(courseId, userId, amountDetails) {
    const { amount, discount, gstRate, gstAmount, grandTotal } = amountDetails;
    this.logger.info({ courseId, userId, amount, grandTotal }, 'Creating razorpay order for course')

    if (!amount || !grandTotal) {
      throw new AppError('Amount and grandTotal are required', 400)
    }

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    const course = await this.getById(courseId, { select: 'title isFree validityInMonths isLifetime' })

    if (course.isFree) {
      throw new AppError('Course is free, use enroll endpoint instead', 400)
    }

    const items = [{
      itemType: 'course',
      itemId: courseId,
      title: course.title,
      price: Number(amount),
      validityInMonths: course.validityInMonths,
      isLifetime: course.isLifetime
    }]

    // const paymentService = require('../payment/payment.service')
    return await paymentService.createOrder(userId, items, {
      totalAmount: Number(amount),
      discount: Number(discount || 0),
      gstRate: Number(gstRate || 0),
      gstAmount: Number(gstAmount || 0),
      grandTotal: Number(grandTotal)
    })
  }

  async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    // const paymentService = require('../payment/payment.service')
    return await paymentService.verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature)
  }

  async joinLive(courseId, contentId, userId) {
    const course = await this.getById(courseId, { select: 'isFree' })
    if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND')

    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)
    if (!hasAccess) throw new AppError('You must purchase this course to join the live class', 403, 'FORBIDDEN')

    const content = await Content.findOne({ _id: contentId, course: courseId, isDeleted: false })
    if (!content) throw new AppError('Content not found', 404, 'NOT_FOUND')
    if (!content.isLive) throw new AppError('This content is not a live class', 400)
    if (content.liveStatus !== 'ongoing') throw new AppError('Live class is not currently ongoing', 400)

    const token = generateSubscriberToken(content.agoraChannel, 0)
    return { token, channel: content.agoraChannel }
  }
}

module.exports = new CourseService()
