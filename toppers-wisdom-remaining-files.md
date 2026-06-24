# Toppers Wisdom — Remaining Files
# Drop these into your toppers-wisdom-api project and run npm run dev

---

## src/modules/qualification/qualification.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Qualification  = require('../../models/Qualification.model')
const ExamType       = require('../../models/ExamType.model')
const SubExam        = require('../../models/SubExam.model')

class QualificationRepository extends BaseRepository {
  constructor() { super(Qualification, 'qualification') }

  async getActiveExamTypes(qualificationId) {
    return ExamType.find({ qualification: qualificationId, isActive: true }).sort({ sortOrder: 1 }).lean()
  }

  async getActiveSubExams(examTypeId) {
    return SubExam.find({ examType: examTypeId, isActive: true }).sort({ sortOrder: 1 }).lean()
  }
}

module.exports = new QualificationRepository()
```

---

## src/modules/qualification/qualification.service.js

```js
const BaseService              = require('../../core/BaseService')
const qualificationRepository  = require('./qualification.repository')
const { createLogger }         = require('../../config/logger')

class QualificationService extends BaseService {
  constructor() {
    super(qualificationRepository, 'qualification')
    this.logger = createLogger('qualification:service')
  }

  async listAll() {
    this.logger.info('Listing all qualifications')
    return this.getAll({ isActive: true }, { sort: { sortOrder: 1 }, limit: 100 })
  }

  async getExamTypes(qualificationId) {
    this.logger.info({ qualificationId }, 'Fetching exam types')
    await this.repository.assertExists(qualificationId, 'Qualification not found')
    return qualificationRepository.getActiveExamTypes(qualificationId)
  }

  async getSubExams(examTypeId) {
    this.logger.info({ examTypeId }, 'Fetching sub-exams')
    return qualificationRepository.getActiveSubExams(examTypeId)
  }
}

module.exports = new QualificationService()
```

---

## src/modules/qualification/qualification.controller.js

```js
const catchAsync              = require('../../core/catchAsync')
const { sendSuccess }         = require('../../core/response')
const qualificationService    = require('./qualification.service')

const listAll      = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.listAll()) })
const getExamTypes = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.getExamTypes(req.params.id)) })
const getSubExams  = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.getSubExams(req.params.id)) })

module.exports = { listAll, getExamTypes, getSubExams }
```

---

## src/modules/qualification/qualification.routes.js

```js
const router     = require('express').Router()
const controller = require('./qualification.controller')

router.get('/',                          controller.listAll)
router.get('/:id/exam-types',            controller.getExamTypes)
router.get('/exam-types/:id/sub-exams',  controller.getSubExams)

module.exports = router
```

---

## src/modules/booster/booster.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Booster        = require('../../models/Booster.model')

class BoosterRepository extends BaseRepository {
  constructor() { super(Booster, 'booster') }

  async findItemById(boosterId, itemId) {
    const booster = await this.findById(boosterId)
    if (!booster) return null
    const item = booster.items.find((i) => i._id.toString() === itemId)
    return { booster, item }
  }

  async addItem(boosterId, item) {
    return this.pushToArray(boosterId, 'items', item)
  }

  async removeItem(boosterId, itemId) {
    return this.pullFromArray(boosterId, 'items', { _id: itemId })
  }

  async updateItem(boosterId, itemId, data) {
    return this.model.findOneAndUpdate(
      { _id: boosterId, 'items._id': itemId },
      { $set: { 'items.$': { ...data, _id: itemId } } },
      { new: true }
    ).lean()
  }
}

module.exports = new BoosterRepository()
```

---

## src/modules/booster/booster.service.js

```js
const BaseService        = require('../../core/BaseService')
const boosterRepository  = require('./booster.repository')
const { checkAccess }    = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError           = require('../../core/AppError')
const User               = require('../../models/User.model')
const { createLogger }   = require('../../config/logger')

class BoosterService extends BaseService {
  constructor() {
    super(boosterRepository, 'booster')
    this.logger = createLogger('booster:service')
  }

  async listBoosters(subExamId, filters) {
    this.logger.info({ subExamId }, 'Listing boosters')
    const filter = { subExam: subExamId, isActive: true }
    if (filters.type) filter.type = filters.type
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: 'title type language isActive' })
  }

  async getBooster(boosterId, userId) {
    this.logger.info({ boosterId, userId }, 'Fetching booster')
    const booster   = await this.getById(boosterId)
    const hasAccess = await checkAccess(userId, 'booster', boosterId)

    const items = booster.items.map((item) =>
      item.isFree || hasAccess
        ? item
        : { ...item, audioKey: undefined, pdfKey: undefined, content: undefined }
    )

    return { ...booster, items, hasAccess }
  }

  async getAudioUrl(boosterId, itemId, userId) {
    this.logger.info({ boosterId, itemId, userId }, 'Audio URL requested')
    const { booster, item } = await boosterRepository.findItemById(boosterId, itemId)
    if (!booster) throw new AppError('Booster not found', 404)
    if (!item)    throw new AppError('Item not found', 404)

    const hasAccess = item.isFree || await checkAccess(userId, 'booster', boosterId)
    if (!hasAccess) throw new AppError('Please purchase this booster to access audio', 403, 'FORBIDDEN')
    if (!item.audioKey) throw new AppError('No audio available for this item', 404)

    const url = await getPresignedDownloadUrl(item.audioKey, 900)
    this.logger.info({ boosterId, itemId }, 'Audio URL generated')
    return { url, expiresIn: 900 }
  }

  async saveItem(userId, boosterId, itemId) {
    this.logger.info({ userId, boosterId, itemId }, 'Saving booster item')
    const existing = await User.findOne({ _id: userId, 'savedItems.itemId': itemId }).lean()
    if (existing) throw new AppError('Already saved', 409, 'DUPLICATE_ERROR')
    await User.findByIdAndUpdate(userId, {
      $push: { savedItems: { itemType: 'booster_item', itemId, savedAt: new Date() } },
    })
    return { message: 'Item saved' }
  }

  async reportItem(userId, boosterId, itemId, reason) {
    this.logger.info({ userId, boosterId, itemId }, 'Reporting booster item')
    await User.findByIdAndUpdate(userId, {
      $push: { reportedItems: { itemType: 'booster_item', itemId, reason, reportedAt: new Date() } },
    })
    return { message: 'Item reported' }
  }
}

module.exports = new BoosterService()
```

---

## src/modules/booster/booster.schema.js

```js
const Joi = require('joi')

const reportSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
})

module.exports = { reportSchema }
```

---

## src/modules/booster/booster.controller.js

```js
const catchAsync        = require('../../core/catchAsync')
const { sendSuccess }   = require('../../core/response')
const boosterService    = require('./booster.service')

const listBoosters = catchAsync(async (req, res) => {
  const r = await boosterService.listBoosters(req.user.subExamId, req.query)
  const { sendPaginated } = require('../../core/response')
  sendPaginated(res, r.data, r.pagination)
})

const getBooster   = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.getBooster(req.params.id, req.user._id)) })
const getAudioUrl  = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.getAudioUrl(req.params.id, req.params.itemId, req.user._id)) })
const saveItem     = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.saveItem(req.user._id, req.params.id, req.params.itemId)) })
const reportItem   = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.reportItem(req.user._id, req.params.id, req.params.itemId, req.body.reason)) })

module.exports = { listBoosters, getBooster, getAudioUrl, saveItem, reportItem }
```

---

## src/modules/booster/booster.routes.js

```js
const router     = require('express').Router()
const controller = require('./booster.controller')
const { validate } = require('../../core/validate')
const { reportSchema } = require('./booster.schema')

router.get('/',                                   controller.listBoosters)
router.get('/:id',                                controller.getBooster)
router.get('/:id/items/:itemId/audio-url',        controller.getAudioUrl)
router.post('/:id/items/:itemId/save',            controller.saveItem)
router.post('/:id/items/:itemId/report',          validate(reportSchema), controller.reportItem)

module.exports = router
```

---

## src/modules/progress/progress.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Enrollment     = require('../../models/Enrollment.model')
const User           = require('../../models/User.model')

class ProgressRepository extends BaseRepository {
  constructor() { super(Enrollment, 'progress') }

  async getEnrollment(userId, courseId) {
    return this.findOne({ user: userId, course: courseId })
  }

  async updateLessonProgress(userId, courseId, lessonId, watchedSeconds, completed) {
    const enrollment = await Enrollment.findOne({ user: userId, course: courseId })
    if (!enrollment) return null

    const existing = enrollment.progress.find((p) => p.lessonId.toString() === lessonId)

    if (existing) {
      existing.watchedSeconds = Math.max(existing.watchedSeconds, watchedSeconds)
      if (completed && !existing.completed) {
        existing.completed   = true
        existing.completedAt = new Date()
      }
    } else {
      enrollment.progress.push({
        lessonId,
        watchedSeconds,
        completed,
        completedAt: completed ? new Date() : undefined,
      })
    }

    // Recalculate progress percent
    const Course    = require('../../models/Course.model')
    const course    = await Course.findById(courseId).select('lessons').lean()
    const total     = course?.lessons?.length || 1
    const done      = enrollment.progress.filter((p) => p.completed).length
    enrollment.progressPercent = parseFloat(((done / total) * 100).toFixed(2))

    await enrollment.save()

    // Update user total watch duration
    await User.findByIdAndUpdate(userId, { $inc: { watchDuration: watchedSeconds } })

    return enrollment
  }
}

module.exports = new ProgressRepository()
```

---

## src/modules/progress/progress.service.js

```js
const BaseService          = require('../../core/BaseService')
const progressRepository   = require('./progress.repository')
const AppError             = require('../../core/AppError')
const { createLogger }     = require('../../config/logger')

class ProgressService extends BaseService {
  constructor() {
    super(progressRepository, 'progress')
    this.logger = createLogger('progress:service')
  }

  async updateLesson(userId, data) {
    const { lessonId, courseId, watchedSeconds, completed } = data
    this.logger.info({ userId, courseId, lessonId, watchedSeconds, completed }, 'Updating lesson progress')

    const enrollment = await progressRepository.getEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const result = await progressRepository.updateLessonProgress(userId, courseId, lessonId, watchedSeconds || 0, completed || false)
    this.logger.info({ userId, courseId, progress: result.progressPercent }, 'Progress updated')
    return { progressPercent: result.progressPercent, lessonId, completed }
  }

  async getCourseProgress(userId, courseId) {
    this.logger.info({ userId, courseId }, 'Fetching course progress')
    const enrollment = await progressRepository.getEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')
    return enrollment
  }
}

module.exports = new ProgressService()
```

---

## src/modules/progress/progress.schema.js

```js
const Joi = require('joi')

const updateLessonSchema = Joi.object({
  lessonId:      Joi.string().required(),
  courseId:      Joi.string().required(),
  watchedSeconds: Joi.number().min(0).default(0),
  completed:     Joi.boolean().default(false),
})

module.exports = { updateLessonSchema }
```

---

## src/modules/progress/progress.controller.js

```js
const catchAsync              = require('../../core/catchAsync')
const { sendSuccess }         = require('../../core/response')
const progressService         = require('./progress.service')

const updateLesson    = catchAsync(async (req, res) => { sendSuccess(res, await progressService.updateLesson(req.user._id, req.body)) })
const getCourseProgress = catchAsync(async (req, res) => { sendSuccess(res, await progressService.getCourseProgress(req.user._id, req.params.courseId)) })

module.exports = { updateLesson, getCourseProgress }
```

---

## src/modules/progress/progress.routes.js

```js
const router     = require('express').Router()
const controller = require('./progress.controller')
const { validate } = require('../../core/validate')
const { updateLessonSchema } = require('./progress.schema')

router.post('/lesson',              validate(updateLessonSchema), controller.updateLesson)
router.get('/course/:courseId',     controller.getCourseProgress)

module.exports = router
```

---

## src/modules/blog/blog.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Blog           = require('../../models/Blog.model')

class BlogRepository extends BaseRepository {
  constructor() { super(Blog, 'blog') }

  async findBySlug(slug) {
    return this.findOne({ slug, status: 'published' })
  }
}

module.exports = new BlogRepository()
```

---

## src/modules/blog/blog.service.js

```js
const BaseService      = require('../../core/BaseService')
const blogRepository   = require('./blog.repository')
const AppError         = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class BlogService extends BaseService {
  constructor() {
    super(blogRepository, 'blog')
    this.logger = createLogger('blog:service')
  }

  async listPosts(filters) {
    this.logger.info({ filters }, 'Listing blog posts')
    const filter = { status: 'published' }
    if (filters.category) filter.category = filters.category
    return this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      select: 'title slug excerpt thumbnail category tags author publishedAt',
      sort: { publishedAt: -1 },
    })
  }

  async getPost(slug) {
    this.logger.info({ slug }, 'Fetching blog post')
    const post = await blogRepository.findBySlug(slug)
    if (!post) throw new AppError('Blog post not found', 404)
    return post
  }
}

module.exports = new BlogService()
```

---

## src/modules/blog/blog.controller.js

```js
const catchAsync           = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const blogService          = require('./blog.service')

const listPosts = catchAsync(async (req, res) => {
  const r = await blogService.listPosts(req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getPost = catchAsync(async (req, res) => {
  sendSuccess(res, await blogService.getPost(req.params.slug))
})

module.exports = { listPosts, getPost }
```

---

## src/modules/blog/blog.routes.js

```js
const router     = require('express').Router()
const controller = require('./blog.controller')

router.get('/',          controller.listPosts)
router.get('/:slug',     controller.getPost)

module.exports = router
```

---

## src/modules/payment/payment.routes.js

```js
const router     = require('express').Router()
const controller = require('./payment.controller')
const { validate }       = require('../../core/validate')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { createOrderSchema, verifyPaymentSchema } = require('./payment.schema')

// Webhook is unauthenticated — Razorpay calls this directly
router.post('/webhook', controller.webhook)

// All other payment routes require auth
router.use(authMiddleware)
router.post('/create-order',  validate(createOrderSchema),  controller.createOrder)
router.post('/verify',        validate(verifyPaymentSchema), controller.verifyPayment)

module.exports = router
```

---

## src/modules/payment/payment.schema.js

```js
const Joi = require('joi')

const createOrderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    itemType: Joi.string().valid('course', 'test', 'booster').required(),
    itemId:   Joi.string().required(),
    title:    Joi.string().required(),
    price:    Joi.number().min(0).required(),
  })).min(1).required(),
})

const verifyPaymentSchema = Joi.object({
  razorpayOrderId:   Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
})

module.exports = { createOrderSchema, verifyPaymentSchema }
```

---

## src/modules/test/test.routes.js

```js
const router     = require('express').Router()
const controller = require('./test.controller')
const { validate }    = require('../../core/validate')
const { submitSchema } = require('./test.schema')

router.get('/',                                       controller.listTests)
router.get('/attempts',                               controller.getMyAttempts)
router.get('/:id',                                    controller.getTest)
router.get('/:id/sub-tests/:subTestId/start',         controller.startSubTest)
router.get('/:id/leaderboard',                        controller.getLeaderboard)
router.post('/:id/sub-tests/:subTestId/submit',       validate(submitSchema), controller.submitAttempt)

module.exports = router
```

---

## src/modules/test/test.schema.js

```js
const Joi = require('joi')

const submitSchema = Joi.object({
  answers: Joi.array().items(Joi.object({
    questionId:     Joi.string().required(),
    selectedOption: Joi.number().min(0).max(3).allow(null),
  })).required(),
  timeTaken: Joi.number().min(0).required(),
})

module.exports = { submitSchema }
```

---

## src/modules/course/course.routes.js

```js
const router     = require('express').Router()
const controller = require('./course.controller')
const { validate }    = require('../../core/validate')
const { reviewSchema } = require('./course.schema')

router.get('/',                                     controller.listCourses)
router.get('/:id',                                  controller.getCourse)
router.get('/:id/lessons/:lessonId/video-url',      controller.getVideoUrl)
router.post('/:id/enroll',                          controller.enrollFree)
router.post('/:id/review',   validate(reviewSchema), controller.addReview)
router.get('/:id/timetable',                        controller.getTimetable)

module.exports = router
```

---

## src/modules/course/course.schema.js

```js
const Joi = require('joi')

const reviewSchema = Joi.object({
  rating:  Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(5).max(1000).required(),
})

module.exports = { reviewSchema }
```

---

## src/modules/course/course.controller.js  (updated — full version)

```js
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const courseService = require('./course.service')

const listCourses = catchAsync(async (req, res) => {
  const r = await courseService.listCourses(req.user._id, req.user.subExamId, req.query, req.lang)
  sendPaginated(res, r.data, r.pagination)
})

const getCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getCourse(req.params.id, req.user._id))
})

const getVideoUrl = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getVideoUrl(req.params.id, req.params.lessonId, req.user._id))
})

const enrollFree = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.enrollFree(req.params.id, req.user._id), 'Enrolled successfully')
})

const addReview = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.addReview(req.params.id, req.user._id, req.body), 'Review submitted')
})

const getTimetable = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getTimetable(req.params.id))
})

module.exports = { listCourses, getCourse, getVideoUrl, enrollFree, addReview, getTimetable }
```

---

## src/modules/course/course.service.js  (updated — addReview + getTimetable added)

```js
const BaseService      = require('../../core/BaseService')
const courseRepository = require('./course.repository')
const { checkAccess }  = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError         = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class CourseService extends BaseService {
  constructor() {
    super(courseRepository, 'course')
    this.logger = createLogger('course:service')
  }

  async listCourses(userId, subExamId, filters, lang) {
    this.logger.info({ userId, subExamId }, 'Listing courses')
    const filter = { subExam: subExamId, status: 'published' }
    if (filters.type)              filter.type    = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    if (filters.subject)           filter['subjects.name'] = filters.subject
    if (lang && lang !== 'both')   filter.language = { $in: [lang, 'both'] }

    const result = await this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      select: 'title slug thumbnail type price isFree avgRating totalEnrollments instructor.name language subjects',
    })

    result.data = await Promise.all(result.data.map(async (course) => ({
      ...course,
      hasAccess: course.isFree || await checkAccess(userId, 'course', course._id),
    })))

    return result
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course')
    const course    = await this.getById(courseId)
    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)

    if (!hasAccess) {
      course.lessons = course.lessons.map((l) =>
        l.isPreview ? l : { ...l, videoKey: undefined, pdfKey: undefined }
      )
    }

    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    return { ...course, hasAccess, enrollmentProgress: enrollment?.progressPercent || 0 }
  }

  async getVideoUrl(courseId, lessonId, userId) {
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const course = await this.getById(courseId)
    const lesson = course.lessons.find((l) => l._id.toString() === lessonId)
    if (!lesson?.videoKey) throw new AppError('Video not available', 404)

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
    this.logger.info({ courseId, userId }, 'Enrolled in free course')
    return enrollment
  }

  async addReview(courseId, userId, data) {
    this.logger.info({ courseId, userId }, 'Adding review')
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You must be enrolled to leave a review', 403)

    // Simple avg rating update — in production use a proper Review model
    const course   = await this.getById(courseId)
    const newTotal = course.totalReviews + 1
    const newAvg   = parseFloat((((course.avgRating * course.totalReviews) + data.rating) / newTotal).toFixed(2))

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
}

module.exports = new CourseService()
```

---

## src/modules/user/user.routes.js

```js
const router     = require('express').Router()
const controller = require('./user.controller')
const { validate }    = require('../../core/validate')
const { updateProfileSchema, setupProfileSchema, updateFcmSchema } = require('./user.schema')

router.get('/me',                               controller.getMe)
router.patch('/me',       validate(updateProfileSchema), controller.updateProfile)
router.post('/me/setup',  validate(setupProfileSchema),  controller.setupProfile)
router.get('/me/stats',                         controller.getStats)
router.get('/me/saved',                         controller.getSaved)
router.delete('/me/saved/:itemId',              controller.removeSaved)
router.get('/me/orders',                        controller.getOrders)
router.get('/me/notifications',                 controller.getNotifications)
router.patch('/me/notifications/:id/read',      controller.markNotifRead)
router.patch('/me/fcm-token', validate(updateFcmSchema), controller.updateFcmToken)

module.exports = router
```

---

## src/modules/user/user.schema.js

```js
const Joi = require('joi')

const updateProfileSchema = Joi.object({
  name:     Joi.string().min(2).max(100),
  email:    Joi.string().email(),
  language: Joi.string().valid('hi', 'en'),
  avatar:   Joi.string().uri(),
})

const setupProfileSchema = Joi.object({
  name:            Joi.string().min(2).max(100).required(),
  email:           Joi.string().email().required(),
  qualificationId: Joi.string().required(),
  examTypeId:      Joi.string().required(),
  subExamId:       Joi.string().required(),
  language:        Joi.string().valid('hi', 'en').default('hi'),
})

const updateFcmSchema = Joi.object({
  fcmToken: Joi.string().required(),
})

module.exports = { updateProfileSchema, setupProfileSchema, updateFcmSchema }
```

---

## src/admin/admin.router.js

```js
const router = require('express').Router()

router.use('/courses',       require('./courses/admin-course.routes'))
router.use('/tests',         require('./tests/admin-test.routes'))
router.use('/boosters',      require('./boosters/admin-booster.routes'))
router.use('/users',         require('./users/admin-user.routes'))
router.use('/blog',          require('./blog/admin-blog.routes'))
router.use('/analytics',     require('./analytics/admin-analytics.routes'))
router.use('/notifications', require('./notifications/admin-notification.routes'))

module.exports = router
```

---

## src/admin/courses/admin-course.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-course.controller')

router.get('/',                                    controller.listAll)
router.post('/',                                   controller.createCourse)
router.get('/:id',                                 controller.getOne)
router.put('/:id',                                 controller.updateCourse)
router.delete('/:id',                              controller.deleteCourse)
router.patch('/:id/publish',                       controller.publish)
router.post('/:id/lessons',                        controller.addLesson)
router.delete('/:id/lessons/:lessonId',            controller.removeLesson)
router.post('/:id/lessons/:lessonId/upload-url',   controller.uploadUrl)

module.exports = router
```

---

## src/admin/tests/admin-test.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-test.controller')

router.get('/',                                                   controller.listAll)
router.post('/',                                                  controller.createTest)
router.get('/:id',                                                controller.getOne)
router.put('/:id',                                                controller.updateTest)
router.delete('/:id',                                             controller.deleteTest)
router.patch('/:id/publish',                                      controller.publish)
router.post('/:id/sub-tests',                                     controller.addSubTest)
router.post('/:id/sub-tests/:subTestId/questions',                controller.addQuestion)
router.post('/:id/sub-tests/:subTestId/questions/bulk',           controller.bulkAddQuestions)
router.delete('/:id/sub-tests/:subTestId/questions/:questionId',  controller.removeQuestion)

module.exports = router
```

---

## src/admin/tests/admin-test.service.js

```js
const BaseService      = require('../../../core/BaseService')
const testRepository   = require('../../modules/test/test.repository')
const AppError         = require('../../../core/AppError')
const { createLogger } = require('../../../config/logger')

class AdminTestService extends BaseService {
  constructor() {
    super(testRepository, 'admin:test')
    this.logger = createLogger('admin:test:service')
  }

  async listAll(filters) {
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.subExam) filter.subExam = filters.subExam
    if (filters.type)    filter.type    = filters.type
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: '-subTests.questions' })
  }

  async publish(testId) {
    this.logger.info({ testId }, 'Publishing test')
    return this.update(testId, { status: 'published' })
  }

  async addSubTest(testId, subTestData) {
    this.logger.info({ testId }, 'Adding sub-test')
    return testRepository.pushToArray(testId, 'subTests', subTestData)
  }

  async addQuestion(testId, subTestId, question) {
    this.logger.info({ testId, subTestId }, 'Adding question')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $push: { 'subTests.$.questions': question } },
      { new: true }
    ).lean()
  }

  async bulkAddQuestions(testId, subTestId, questions) {
    this.logger.info({ testId, subTestId, count: questions.length }, 'Bulk adding questions')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $push: { 'subTests.$.questions': { $each: questions } } },
      { new: true }
    ).lean()
  }

  async removeQuestion(testId, subTestId, questionId) {
    this.logger.info({ testId, subTestId, questionId }, 'Removing question')
    return testRepository.model.findOneAndUpdate(
      { _id: testId, 'subTests._id': subTestId },
      { $pull: { 'subTests.$.questions': { _id: questionId } } },
      { new: true }
    ).lean()
  }
}

module.exports = new AdminTestService()
```

---

## src/admin/tests/admin-test.controller.js

```js
const catchAsync         = require('../../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../../core/response')
const adminTestService   = require('./admin-test.service')

const listAll          = catchAsync(async (req, res) => { const r = await adminTestService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne           = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.getById(req.params.id)) })
const createTest       = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.create({ ...req.body, createdBy: req.user._id })) })
const updateTest       = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.update(req.params.id, req.body)) })
const deleteTest       = catchAsync(async (req, res) => { await adminTestService.remove(req.params.id); sendSuccess(res, null, 'Test deleted') })
const publish          = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.publish(req.params.id), 'Test published') })
const addSubTest       = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.addSubTest(req.params.id, req.body)) })
const addQuestion      = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.addQuestion(req.params.id, req.params.subTestId, req.body)) })
const bulkAddQuestions = catchAsync(async (req, res) => { sendCreated(res, await adminTestService.bulkAddQuestions(req.params.id, req.params.subTestId, req.body.questions)) })
const removeQuestion   = catchAsync(async (req, res) => { sendSuccess(res, await adminTestService.removeQuestion(req.params.id, req.params.subTestId, req.params.questionId), 'Question removed') })

module.exports = { listAll, getOne, createTest, updateTest, deleteTest, publish, addSubTest, addQuestion, bulkAddQuestions, removeQuestion }
```

---

## src/admin/boosters/admin-booster.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-booster.controller')

router.get('/',                                  controller.listAll)
router.post('/',                                 controller.createBooster)
router.get('/:id',                               controller.getOne)
router.put('/:id',                               controller.updateBooster)
router.delete('/:id',                            controller.deleteBooster)
router.post('/:id/items',                        controller.addItem)
router.put('/:id/items/:itemId',                 controller.updateItem)
router.delete('/:id/items/:itemId',              controller.removeItem)
router.post('/:id/items/:itemId/upload-url',     controller.getUploadUrl)

module.exports = router
```

---

## src/admin/boosters/admin-booster.controller.js

```js
const catchAsync         = require('../../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../../core/response')
const BaseService        = require('../../../core/BaseService')
const boosterRepository  = require('../../modules/booster/booster.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger }   = require('../../../config/logger')

// Inline admin booster service — reuses boosterRepository
class AdminBoosterService extends BaseService {
  constructor() { super(boosterRepository, 'admin:booster'); this.logger = createLogger('admin:booster:service') }
  async listAll(f)              { return this.getAll(f.subExam ? { subExam: f.subExam } : {}, { page: f.page, limit: f.limit }) }
  async addItem(id, item)       { this.logger.info({ id }, 'Adding booster item'); return boosterRepository.addItem(id, item) }
  async updateItem(id, iid, d)  { return boosterRepository.updateItem(id, iid, d) }
  async removeItem(id, iid)     { return boosterRepository.removeItem(id, iid) }
  async getUploadUrl(id, iid, contentType) {
    const key = `boosters/${id}/items/${iid}/${contentType.startsWith('audio') ? 'audio' : 'pdf'}`
    return getPresignedUploadUrl(key, contentType)
  }
}

const svc = new AdminBoosterService()

const listAll        = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne         = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const createBooster  = catchAsync(async (req, res) => { sendCreated(res, await svc.create(req.body)) })
const updateBooster  = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const deleteBooster  = catchAsync(async (req, res) => { await svc.remove(req.params.id); sendSuccess(res, null, 'Booster deleted') })
const addItem        = catchAsync(async (req, res) => { sendCreated(res, await svc.addItem(req.params.id, req.body)) })
const updateItem     = catchAsync(async (req, res) => { sendSuccess(res, await svc.updateItem(req.params.id, req.params.itemId, req.body)) })
const removeItem     = catchAsync(async (req, res) => { await svc.removeItem(req.params.id, req.params.itemId); sendSuccess(res, null, 'Item removed') })
const getUploadUrl   = catchAsync(async (req, res) => { sendSuccess(res, await svc.getUploadUrl(req.params.id, req.params.itemId, req.body.contentType)) })

module.exports = { listAll, getOne, createBooster, updateBooster, deleteBooster, addItem, updateItem, removeItem, getUploadUrl }
```

---

## src/admin/users/admin-user.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-user.controller')

router.get('/',          controller.listAll)
router.get('/:id',       controller.getOne)
router.patch('/:id',     controller.updateUser)
router.get('/:id/orders',   controller.getUserOrders)
router.get('/:id/attempts', controller.getUserAttempts)

module.exports = router
```

---

## src/admin/users/admin-user.controller.js

```js
const catchAsync        = require('../../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../../core/response')
const BaseService       = require('../../../core/BaseService')
const userRepository    = require('../../modules/user/user.repository')
const { paginate }      = require('../../../core/paginate')
const Order             = require('../../models/Order.model')
const TestAttempt       = require('../../models/TestAttempt.model')

class AdminUserService extends BaseService {
  constructor() { super(userRepository, 'admin:user') }

  async listAll(filters) {
    const filter = { role: 'user' }
    if (filters.search) filter.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
    ]
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: '-fcmToken -savedItems -reportedItems' })
  }
}

const svc = new AdminUserService()

const listAll      = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne       = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const updateUser   = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const getUserOrders = catchAsync(async (req, res) => {
  const r = await paginate(Order, { user: req.params.id }, { page: req.query.page, limit: req.query.limit })
  sendPaginated(res, r.data, r.pagination)
})
const getUserAttempts = catchAsync(async (req, res) => {
  const r = await paginate(TestAttempt, { user: req.params.id }, { page: req.query.page, limit: req.query.limit, sort: { attemptedAt: -1 } })
  sendPaginated(res, r.data, r.pagination)
})

module.exports = { listAll, getOne, updateUser, getUserOrders, getUserAttempts }
```

---

## src/admin/blog/admin-blog.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-blog.controller')

router.get('/',           controller.listAll)
router.post('/',          controller.createPost)
router.get('/:id',        controller.getOne)
router.put('/:id',        controller.updatePost)
router.delete('/:id',     controller.deletePost)
router.patch('/:id/publish', controller.publish)

module.exports = router
```

---

## src/admin/blog/admin-blog.controller.js

```js
const catchAsync     = require('../../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../../core/response')
const BaseService    = require('../../../core/BaseService')
const blogRepository = require('../../modules/blog/blog.repository')
const { createLogger } = require('../../../config/logger')

class AdminBlogService extends BaseService {
  constructor() { super(blogRepository, 'admin:blog'); this.logger = createLogger('admin:blog:service') }

  async listAll(filters) {
    const filter = {}
    if (filters.status) filter.status = filters.status
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: 'title slug status category publishedAt createdAt' })
  }

  async publish(id) {
    return this.update(id, { status: 'published', publishedAt: new Date() })
  }
}

const svc = new AdminBlogService()

const listAll    = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne     = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const createPost = catchAsync(async (req, res) => { sendCreated(res, await svc.create({ ...req.body, createdBy: req.user._id })) })
const updatePost = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const deletePost = catchAsync(async (req, res) => { await svc.remove(req.params.id); sendSuccess(res, null, 'Post deleted') })
const publish    = catchAsync(async (req, res) => { sendSuccess(res, await svc.publish(req.params.id), 'Post published') })

module.exports = { listAll, getOne, createPost, updatePost, deletePost, publish }
```

---

## src/admin/analytics/admin-analytics.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-analytics.controller')

router.get('/overview', controller.overview)
router.get('/revenue',  controller.revenue)
router.get('/users',    controller.users)

module.exports = router
```

---

## src/admin/analytics/admin-analytics.service.js

```js
const User       = require('../../models/User.model')
const Enrollment = require('../../models/Enrollment.model')
const Order      = require('../../models/Order.model')
const Test       = require('../../models/Test.model')
const { createLogger } = require('../../../config/logger')

const logger = createLogger('admin:analytics:service')

const overview = async () => {
  logger.info('Fetching analytics overview')
  const [totalUsers, totalEnrollments, revenueResult, activeTests] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Enrollment.countDocuments(),
    Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Test.countDocuments({ status: 'published' }),
  ])
  return { totalUsers, totalEnrollments, totalRevenue: revenueResult[0]?.total || 0, activeTests }
}

const revenue = async (from, to) => {
  logger.info({ from, to }, 'Fetching revenue report')
  return Order.aggregate([
    { $match: { status: 'paid', paidAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

const users = async (from, to) => {
  logger.info({ from, to }, 'Fetching user growth report')
  return User.aggregate([
    { $match: { role: 'user', createdAt: { $gte: new Date(from), $lte: new Date(to) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
}

module.exports = { overview, revenue, users }
```

---

## src/admin/analytics/admin-analytics.controller.js

```js
const catchAsync           = require('../../../core/catchAsync')
const { sendSuccess }      = require('../../../core/response')
const analyticsService     = require('./admin-analytics.service')
const AppError             = require('../../../core/AppError')

const overview = catchAsync(async (req, res) => {
  sendSuccess(res, await analyticsService.overview())
})

const revenue = catchAsync(async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) throw new AppError('from and to date query params are required', 400)
  sendSuccess(res, await analyticsService.revenue(from, to))
})

const users = catchAsync(async (req, res) => {
  const { from, to } = req.query
  if (!from || !to) throw new AppError('from and to date query params are required', 400)
  sendSuccess(res, await analyticsService.users(from, to))
})

module.exports = { overview, revenue, users }
```

---

## src/admin/notifications/admin-notification.routes.js

```js
const router     = require('express').Router()
const controller = require('./admin-notification.controller')
const { validate } = require('../../../core/validate')
const { broadcastSchema } = require('./admin-notification.schema')

router.post('/broadcast', validate(broadcastSchema), controller.broadcast)

module.exports = router
```

---

## src/admin/notifications/admin-notification.schema.js

```js
const Joi = require('joi')

const broadcastSchema = Joi.object({
  title:     Joi.string().required(),
  body:      Joi.string().required(),
  subExamId: Joi.string(),
  all:       Joi.boolean().default(false),
  type:      Joi.string().valid('course', 'test', 'payment', 'system').default('system'),
})

module.exports = { broadcastSchema }
```

---

## src/admin/notifications/admin-notification.controller.js

```js
const catchAsync           = require('../../../core/catchAsync')
const { sendSuccess }      = require('../../../core/response')
const { notificationQueue } = require('../../jobs/queue')
const { createLogger }     = require('../../../config/logger')

const logger = createLogger('admin:notification:controller')

const broadcast = catchAsync(async (req, res) => {
  const { title, body, subExamId, all, type } = req.body
  logger.info({ title, all, subExamId }, 'Broadcasting notification')

  await notificationQueue.add('broadcast', {
    title, body, subExamId, all, data: { type },
  })

  sendSuccess(res, null, 'Notification broadcast queued')
})

module.exports = { broadcast }
```

---

## src/seeds/seed.js

```js
require('dotenv').config()
const mongoose     = require('mongoose')
const config       = require('../config/env')
const Qualification = require('../models/Qualification.model')
const ExamType     = require('../models/ExamType.model')
const SubExam      = require('../models/SubExam.model')
const User         = require('../models/User.model')
const { rootLogger } = require('../config/logger')

const seed = async () => {
  await mongoose.connect(config.MONGODB_URI)
  rootLogger.info('Connected — seeding...')

  await Promise.all([Qualification.deleteMany(), ExamType.deleteMany(), SubExam.deleteMany()])

  const graduate = await Qualification.create({ name: 'Graduate',      slug: 'graduate',      sortOrder: 1 })
  const tenth    = await Qualification.create({ name: '10th Pass',     slug: '10th-pass',     sortOrder: 2 })
  const postGrad = await Qualification.create({ name: 'Post Graduate', slug: 'post-graduate', sortOrder: 3 })

  const banking = await ExamType.create({ qualification: graduate._id,  name: 'Banking',         slug: 'banking',       sortOrder: 1 })
  const ssc     = await ExamType.create({ qualification: graduate._id,  name: 'SSC',             slug: 'ssc',           sortOrder: 2 })
  const railway = await ExamType.create({ qualification: graduate._id,  name: 'Railway',         slug: 'railway',       sortOrder: 3 })
  const upsc    = await ExamType.create({ qualification: postGrad._id,  name: 'UPSC',            slug: 'upsc',          sortOrder: 4 })
  const defence = await ExamType.create({ qualification: graduate._id,  name: 'Defence',         slug: 'defence',       sortOrder: 5 })
  const railGD  = await ExamType.create({ qualification: tenth._id,     name: 'Railway Group D', slug: 'railway-gd',    sortOrder: 6 })

  await SubExam.insertMany([
    { examType: banking._id,  name: 'IBPS PO',     slug: 'ibps-po',      sortOrder: 1 },
    { examType: banking._id,  name: 'IBPS Clerk',  slug: 'ibps-clerk',   sortOrder: 2 },
    { examType: banking._id,  name: 'SBI PO',      slug: 'sbi-po',       sortOrder: 3 },
    { examType: banking._id,  name: 'SBI Clerk',   slug: 'sbi-clerk',    sortOrder: 4 },
    { examType: banking._id,  name: 'RBI Grade B', slug: 'rbi-grade-b',  sortOrder: 5 },
    { examType: ssc._id,      name: 'SSC CGL',     slug: 'ssc-cgl',      sortOrder: 1 },
    { examType: ssc._id,      name: 'SSC CHSL',    slug: 'ssc-chsl',     sortOrder: 2 },
    { examType: ssc._id,      name: 'SSC MTS',     slug: 'ssc-mts',      sortOrder: 3 },
    { examType: ssc._id,      name: 'SSC CPO',     slug: 'ssc-cpo',      sortOrder: 4 },
    { examType: ssc._id,      name: 'SSC GD',      slug: 'ssc-gd',       sortOrder: 5 },
    { examType: railway._id,  name: 'RRB NTPC',    slug: 'rrb-ntpc',     sortOrder: 1 },
    { examType: railway._id,  name: 'RRB ALP',     slug: 'rrb-alp',      sortOrder: 2 },
    { examType: upsc._id,     name: 'UPSC CSE',    slug: 'upsc-cse',     sortOrder: 1 },
    { examType: upsc._id,     name: 'UPSC CDS',    slug: 'upsc-cds',     sortOrder: 2 },
    { examType: upsc._id,     name: 'UPSC CAPF',   slug: 'upsc-capf',    sortOrder: 3 },
    { examType: defence._id,  name: 'NDA',         slug: 'nda',          sortOrder: 1 },
    { examType: railGD._id,   name: 'RRB Group D', slug: 'rrb-group-d',  sortOrder: 1 },
  ])

  if (config.ADMIN_PHONE) {
    await User.findOneAndUpdate(
      { phone: config.ADMIN_PHONE },
      { phone: config.ADMIN_PHONE, role: 'admin', profileComplete: true, name: 'Admin' },
      { upsert: true }
    )
    rootLogger.info({ phone: config.ADMIN_PHONE }, 'Admin user seeded')
  }

  rootLogger.info('Seed complete')
  await mongoose.connection.close()
  process.exit(0)
}

seed().catch((err) => { console.error(err); process.exit(1) })
```

---

## README.md

```md
# Toppers Wisdom API

Production-ready REST API for Toppers Wisdom — a government exam e-learning platform.

## Stack
- Node.js + Express (CommonJS)
- MongoDB + Mongoose
- Redis (sessions, OTP, BullMQ)
- JWT Auth (OTP-based)
- Pino (structured logging)
- BullMQ (background jobs)

## Prerequisites
- Node.js 18+
- MongoDB 7
- Redis 7

## Local Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd toppers-wisdom-api
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in all values

# 3. Start MongoDB and Redis
docker-compose up -d

# 4. Seed the database
npm run seed

# 5. Start dev server
npm run dev
```

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/send-otp | No | Send OTP to phone |
| POST | /api/v1/auth/verify-otp | No | Verify OTP and login |
| POST | /api/v1/auth/refresh-token | No | Refresh access token |
| POST | /api/v1/auth/logout | Yes | Logout |

### User
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/user/me | Yes | Get profile |
| PATCH | /api/v1/user/me | Yes | Update profile |
| POST | /api/v1/user/me/setup | Yes | Complete profile setup |
| GET | /api/v1/user/me/stats | Yes | Get usage stats |
| GET | /api/v1/user/me/saved | Yes | Get saved items |
| DELETE | /api/v1/user/me/saved/:itemId | Yes | Remove saved item |
| GET | /api/v1/user/me/orders | Yes | Order history |
| GET | /api/v1/user/me/notifications | Yes | Notifications |
| PATCH | /api/v1/user/me/notifications/:id/read | Yes | Mark read |

### Qualifications
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/qualifications | No | List qualifications |
| GET | /api/v1/qualifications/:id/exam-types | No | Get exam types |
| GET | /api/v1/qualifications/exam-types/:id/sub-exams | No | Get sub-exams |

### Courses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/courses | Yes | List courses (filtered by user sub-exam) |
| GET | /api/v1/courses/:id | Yes | Course detail |
| GET | /api/v1/courses/:id/lessons/:lessonId/video-url | Yes | Get video URL |
| POST | /api/v1/courses/:id/enroll | Yes | Enroll in free course |
| POST | /api/v1/courses/:id/review | Yes | Submit review |

### Tests
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/tests | Yes | List tests |
| GET | /api/v1/tests/:id | Yes | Test detail |
| GET | /api/v1/tests/:id/sub-tests/:subTestId/start | Yes | Start a sub-test |
| POST | /api/v1/tests/:id/sub-tests/:subTestId/submit | Yes | Submit attempt |
| GET | /api/v1/tests/:id/leaderboard | Yes | Leaderboard |
| GET | /api/v1/test-attempts | Yes | My attempts |

### Boosters
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/boosters | Yes | List boosters |
| GET | /api/v1/boosters/:id | Yes | Booster detail |
| GET | /api/v1/boosters/:id/items/:itemId/audio-url | Yes | Audio URL |
| POST | /api/v1/boosters/:id/items/:itemId/save | Yes | Save item |
| POST | /api/v1/boosters/:id/items/:itemId/report | Yes | Report item |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/payments/create-order | Yes | Create Razorpay order |
| POST | /api/v1/payments/verify | Yes | Verify payment |
| POST | /api/v1/payments/webhook | No | Razorpay webhook |

### Progress
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/progress/lesson | Yes | Update lesson progress |
| GET | /api/v1/progress/course/:courseId | Yes | Get course progress |

### Blog
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/blog | No | List posts |
| GET | /api/v1/blog/:slug | No | Get post |

### Admin (all require admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/admin/analytics/overview | Dashboard stats |
| GET | /api/v1/admin/analytics/revenue | Revenue report |
| GET | /api/v1/admin/analytics/users | User growth |
| GET/POST/PUT/DELETE | /api/v1/admin/courses | Course management |
| PATCH | /api/v1/admin/courses/:id/publish | Publish course |
| POST | /api/v1/admin/courses/:id/lessons | Add lesson |
| GET/POST/PUT/DELETE | /api/v1/admin/tests | Test management |
| POST | /api/v1/admin/tests/:id/sub-tests/:stId/questions/bulk | Bulk add questions |
| GET/POST/PUT/DELETE | /api/v1/admin/boosters | Booster management |
| GET | /api/v1/admin/users | User list |
| PATCH | /api/v1/admin/users/:id | Update user |
| GET/POST/PUT/DELETE | /api/v1/admin/blog | Blog management |
| POST | /api/v1/admin/notifications/broadcast | Broadcast notification |

## Response Format

All endpoints return:
```json
// Success
{ "success": true, "message": "...", "data": {} }

// Paginated
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 } }

// Error
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```

## Architecture

```
src/core/           ← Reusable foundation (write once, use everywhere)
  BaseRepository    ← All DB methods (findById, create, update, delete, increment...)
  BaseService       ← Standard CRUD built on BaseRepository
  catchAsync        ← Eliminates try/catch from every controller
  response.js       ← sendSuccess, sendCreated, sendPaginated, sendError
  AppError.js       ← Custom error class
  validate.js       ← Joi validation middleware factory
```
```

---

## Quick fix — update app.js to add the attempt route

In your existing `src/app.js`, the line:
```js
app.use('/api/v1/test-attempts', authMiddleware, require('./modules/test/attempt.routes'))
```

Create this file:

## src/modules/test/attempt.routes.js

```js
const router     = require('express').Router()
const controller = require('./test.controller')

router.get('/', controller.getMyAttempts)

module.exports = router
```
