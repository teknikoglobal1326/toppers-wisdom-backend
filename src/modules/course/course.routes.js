const router = require('express').Router()
const controller = require('./course.controller')
const { validate } = require('../../core/validate')
const { reviewSchema } = require('./course.schema')

router.get('/subjects', controller.listCourseSubjects)
router.get('/', controller.listCourses)
router.get('/:id', controller.getCourse)
router.get('/:id/lessons/:lessonId/video-url', controller.getVideoUrl)
router.post('/:id/enroll', controller.enrollFree)
router.post('/:id/review', validate(reviewSchema), controller.addReview)
router.get('/:id/timetable', controller.getTimetable)
router.get('/:id/checkout', require('../../middlewares/auth.middleware').authMiddleware, controller.checkout)

module.exports = router
