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

    let purchasedCourseIds = []
    if (userId) {
      const CourseOrder = require('../../models/CourseOrder.model')
      const orders = await CourseOrder.find({
        user: userId,
        status: { $in: ['paid', 'pending'] },
        'items.itemType': 'course'
      }).select('items').lean()

      purchasedCourseIds = orders.flatMap(order =>
        order.items
          .filter(item => item.itemType === 'course')
          .map(item => item.itemId.toString())
      )
    }

    console.log("purchasedCourseIds.length==============>", purchasedCourseIds.length);
    if (purchasedCourseIds.length > 0) {
      filter._id = { $nin: purchasedCourseIds }
    }

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

    console.log("result.data=============>", result.data);
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

  async getScheduledLiveClasses(userId, filters = {}) {
    this.logger.info({ userId }, 'Fetching scheduled live classes')

    const enrollments = await courseRepository.findEnrollmentsByUser(userId)
    const enrolledCourseIds = enrollments.map(e => e.course)

    const Course = require('../../models/Course.model')

    const freeCourses = await Course.find({ isFree: true, status: 'published', isDeleted: false }).select('_id').lean()
    const freeCourseIds = freeCourses.map(c => c._id)

    const allAllowedCourseIds = Array.from(new Set([
      ...enrolledCourseIds.map(id => id.toString()),
      ...freeCourseIds.map(id => id.toString())
    ]))

    // this.logger.info({ userId, enrolledCount: enrolledCourseIds.length, freeCount: freeCourseIds.length, totalAllowed: allAllowedCourseIds.length }, 'Scheduled live classes course mapping info')

    if (allAllowedCourseIds.length === 0) {
      return {
        data: [],
        pagination: {
          total: 0,
          page: Number(filters.page) || 1,
          limit: Number(filters.limit) || 20,
          totalPages: 0
        }
      }
    }

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const filter = {
      course: { $in: allAllowedCourseIds },
      isLive: true,
      isDeleted: false,
      status: 'active',
      liveStatus: { $in: ['pending', 'ongoing'] },
      scheduledStartTime: { $gte: startOfToday }
    }

    // this.logger.info({ filter }, 'Scheduled live classes MongoDB query filter')

    const page = Math.max(1, Number(filters.page) || 1)
    const limit = Math.max(1, Number(filters.limit) || 20)
    const skip = (page - 1) * limit

    // console.log("filter============>", filter);
    const [total, data] = await Promise.all([
      Content.countDocuments(filter),
      Content.find(filter)
        .select('title description isLive liveStatus scheduledStartTime scheduledEndTime course agoraChannel rtmpServer rtmpStreamKey rtmpUrl agoraToken restreamUrls')
        .sort({ scheduledStartTime: 1 })
        .skip(skip)
        .limit(limit)
        .populate([
          { path: 'course', select: 'title thumbnail' }
        ])
        .lean()
    ])

    // this.logger.info({ total, foundCount: data.length }, 'Scheduled live classes query result')

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course detail')
    // inherited: this.getById() throws 404 automatically if not found
    const course = await this.getById(courseId, {
      select: 'title slug description longDescription mrp price thumbnail bannerImage isFree lessons subjects timetable courseThought',
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
    console.log("enrollment================>", enrollment);
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

    const Faq = require('../../models/Faq.model');
    const faqs = await Faq.find({ course: courseId, status: 'active', isDeleted: false })
      .sort({ sortOrder: 1 })
      .select('question answer sortOrder')
      .lean();

    return {
      ...course,
      hasAccess,
      enrollmentProgress: enrollment?.progressPercent || 0,
      syllabus,
      tests, // kept root level tests in case they are needed
      faqs,
      courseThought: {
        thought: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        authorName: "Prashant Sir",
        authorImage: "https://topperswisdom.teknikoglobal.in/prashant_sir.png"
      }
    }
  }

  async getSubjectMaterials(courseId, subjectId, userId) {
    this.logger.info({ courseId, subjectId, userId }, 'Fetching subject materials for course');

    const course = await this.getById(courseId, { select: 'isFree isDeleted' });
    if (course.isDeleted) throw new AppError('Course not found', 404, 'NOT_FOUND');

    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId);

    // Fetch allowed materials via active subscription plans
    const allowedMaterialIds = new Set();
    if (!hasAccess && userId) {
      const UserSubscription = require('../../models/UserSubscription.model');
      const userSubs = await UserSubscription.find({
        user: userId,
        isActive: true,
        endDate: { $gt: new Date() }
      }).populate('subscription').lean();

      userSubs.forEach(us => {
        if (us.subscription && Array.isArray(us.subscription.materials)) {
          us.subscription.materials.forEach(id => allowedMaterialIds.add(id.toString()));
        }
      });
    }

    // Fetch user progress for content / pdf
    const Enrollment = require('../../models/Enrollment.model');
    const enrollment = userId ? await Enrollment.findOne({ user: userId, course: courseId }).lean() : null;
    const progressList = enrollment?.progress || [];
    const progressMap = new Map(progressList.map(p => [p.lessonId.toString(), p]));

    // Fetch user attempts for tests
    const CourseTestAttempt = require('../../models/CourseTestAttempt.model');
    const attempts = userId ? await CourseTestAttempt.find({ user: userId, course: courseId }).lean() : [];
    const testAttemptsMap = new Map();
    const latestAttemptMap = new Map();
    attempts.forEach(att => {
      if (att.courseTest) {
        const testId = att.courseTest.toString();
        const existing = testAttemptsMap.get(testId);
        if (!existing || att.status === 'completed' || (existing.status !== 'completed' && att.updatedAt > existing.updatedAt)) {
          testAttemptsMap.set(testId, att);
        }
        const existingLatest = latestAttemptMap.get(testId);
        if (!existingLatest || att.updatedAt > existingLatest.updatedAt) {
          latestAttemptMap.set(testId, att);
        }
      }
    });

    const mapAccess = (item) => {
      const idStr = item._id.toString();
      const hasItemAccess = hasAccess || allowedMaterialIds.has(idStr);

      let progressObj = null;
      let attemptSessionId = null;
      if (item.materialType === 'content' || item.materialType === 'pdf') {
        const prog = progressMap.get(idStr);
        progressObj = {
          completed: prog?.completed || false,
          watchedSeconds: prog?.watchedSeconds || 0
        };
      } else if (item.materialType === 'test') {
        const attempt = testAttemptsMap.get(idStr);
        const latestAttempt = latestAttemptMap.get(idStr);
        attemptSessionId = latestAttempt?.sessionId || null;
        progressObj = {
          completed: attempt?.status === 'completed',
          status: attempt?.status || 'unstarted',
          score: attempt?.score || 0,
          totalMarks: attempt?.totalMarks || 0,
          accuracy: attempt?.accuracy || 0,
          // sessionId: attemptSessionId
        };
      }

      return {
        ...item,
        hasAccess: hasItemAccess,
        progress: progressObj,
        ...(item.materialType === 'test' ? { sessionId: attemptSessionId } : {})
      };
    };

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
          ...topicContents.map(c => mapAccess({ ...c, materialType: 'content' }))
        ];

        if (combinedData.length > 0) {
          contentTopics.push({ _id: topic._id, title: topicName, data: combinedData });
        }

        if (topicPdfs.length > 0) {
          pdfTopics.push({ _id: topic._id, title: topicName, data: topicPdfs.map(t => mapAccess({ ...t, materialType: 'pdf' })) });
        }

        if (topicTests.length > 0) {
          testTopics.push({ _id: topic._id, title: topicName, data: topicTests.map(t => mapAccess({ ...t, materialType: 'test' })) });
        }
      });

      const unassignedContents = contents.filter(c => (c.chapter || []).some(ch => ch.toString() === chapterId) && isUnassigned(c, 'content'));
      let unassignedPdfs = pdfs.filter(p => (p.chapters || []).some(ch => ch.toString() === chapterId) && isUnassigned(p, 'pdf'));
      const unassignedTests = courseTests.filter(t => (t.chapters || []).some(ch => ch.toString() === chapterId) && isUnassigned(t, 'test'));

      const combinedUnassigned = [
        ...unassignedContents.map(c => mapAccess({ ...c, materialType: 'content' }))
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
          ...(unassignedPdfs.length > 0 && { unassignedData: unassignedPdfs.map(p => mapAccess({ ...p, materialType: 'pdf' })) })
        });
      }

      if (testTopics.length > 0 || unassignedTests.length > 0) {
        syllabus.test.push({
          _id: chapterId,
          chapterName,
          topics: testTopics,
          ...(unassignedTests.length > 0 && { unassignedData: unassignedTests.map(t => mapAccess({ ...t, materialType: 'test' })) })
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

    var gstRate = 18; // 18% standard GST

    if (course.price > 1) {
      gstRate = 0;
    }

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
    try {
      const { amount, discount, gstRate, gstAmount, grandTotal } = amountDetails;
      console.log("check token==============>");
      this.logger.info({ courseId, userId, amount, grandTotal }, 'Creating razorpay order for course')

      if (amount === undefined || amount === null || grandTotal === undefined || grandTotal === null) {
        throw new AppError('Amount and grandTotal are required', 400)
      }

      const existing = await courseRepository.findEnrollment(userId, courseId)
      if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

      const course = await this.getById(courseId, { select: 'title isFree validityInMonths isLifetime' })
      if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND')

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
    } catch (error) {
      this.logger.error({ courseId, userId, error }, 'Error creating razorpay order')
      if (error instanceof AppError) throw error

      let message = 'Failed to create payment order'
      let statusCode = 500

      if (error && typeof error === 'object') {
        if (error.error && error.error.description) {
          message = `Razorpay: ${error.error.description}`
        } else if (error.message) {
          message = error.message
        }
        if (error.statusCode) {
          statusCode = error.statusCode
        }
      } else if (typeof error === 'string') {
        message = error
      }

      throw new AppError(message, statusCode)
    }
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

  async createNote(courseId, lessonId, userId, data) {
    const Note = require('../../models/Note.model')
    const course = await this.getById(courseId, { select: 'isFree' })
    if (!course) throw new AppError('Course not found', 404, 'NOT_FOUND')

    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)
    if (!hasAccess) throw new AppError('You do not have access to this course', 403, 'FORBIDDEN')

    let noteDoc = await Note.findOne({ user: userId, course: courseId, lessonId, isDeleted: false })
    if (noteDoc) {
      noteDoc.notes.push({
        title: data.title || '',
        text: data.text || '',
        image: data.image || '',
        audio: data.audio || '',
        videoTimestamp: data.videoTimestamp || 0
      })
      await noteDoc.save()
    } else {
      noteDoc = await Note.create({
        user: userId,
        course: courseId,
        lessonId,
        notes: [{
          title: data.title || '',
          text: data.text || '',
          image: data.image || '',
          audio: data.audio || '',
          videoTimestamp: data.videoTimestamp || 0
        }]
      })
    }

    return noteDoc
  }

  async getNotes(courseId, lessonId, userId) {
    const Note = require('../../models/Note.model')
    const noteDoc = await Note.findOne({
      user: userId,
      course: courseId,
      lessonId,
      isDeleted: false
    }).lean()

    if (!noteDoc) return []
    const list = noteDoc.notes || []
    list.sort((a, b) => a.videoTimestamp - b.videoTimestamp)
    return list
  }

  async deleteNote(courseId, lessonId, noteId, userId) {
    const Note = require('../../models/Note.model')
    const result = await Note.findOneAndUpdate(
      { user: userId, course: courseId, lessonId, isDeleted: false },
      { $pull: { notes: { _id: noteId } } },
      { new: true }
    )
    if (!result) throw new AppError('Notes record not found', 404, 'NOT_FOUND')
    return result
  }
}

module.exports = new CourseService()
