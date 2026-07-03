const router      = require('express').Router()
const catchAsync  = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError    = require('../../core/AppError')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const examService = require('../../modules/exam/exam.service')
const User        = require('../../models/User.model')

// GET /api/v1/common/exams
// qualificationId is read fresh from DB so stale tokens don't return wrong results
router.get('/', authMiddleware, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('qualification exam').lean()

  if (!user?.qualification?._id) {
    throw new AppError('Please complete your profile and select a qualification first', 400, 'QUALIFICATION_NOT_SET')
  }

  let exams = await examService.listByQualification(user.qualification._id)

  if (user?.exam?._id) {
    exams = exams.filter((exam) => String(exam._id) === String(user.exam._id))
  }

  sendSuccess(res, exams)
}))

module.exports = router
