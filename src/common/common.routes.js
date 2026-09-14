const router = require('express').Router()
const catchAsync = require('../core/catchAsync')
const { sendSuccess } = require('../core/response')
const Streak = require('../models/Streak.model')

// GET /api/v1/common/streak-count
router.get('/streak-count', require('../middlewares/auth.middleware').authMiddleware, catchAsync(async (req, res) => {
  const userId = req.user._id;
  const streak = await Streak.findOne({ user: userId });
  const count = streak ? streak.currentStreak : 0;
  sendSuccess(res, { count }, 'Active streak count retrieved successfully')
}))

// GET /api/v1/common/courses/faculty/:facultyId
router.get('/courses/faculty/:facultyId', catchAsync(async (req, res) => {
  const courseService = require('../modules/course/course.service')
  const { sendPaginated } = require('../core/response')
  
  req.query.facultyId = req.params.facultyId;
  const userId = req.user ? req.user._id : null;
  
  const result = await courseService.listCourses(userId, [], req.query, req.lang)
  sendPaginated(res, result.data, result.pagination)
}))

router.use('/qualifications', require('./qualification/qualification.common.routes'))
router.use('/exams',          require('./exam/exam.common.routes'))
router.use('/cms',         require('./cms/cms.common.routes'))
router.use('/app-version', require('./app-version/app-version.common.routes'))

module.exports = router
