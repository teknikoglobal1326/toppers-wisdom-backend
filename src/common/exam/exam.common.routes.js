const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const AppError = require('../../core/AppError')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const examService = require('../../modules/exam/exam.service')
const User = require('../../models/User.model')

// GET /api/v1/common/exams
// qualificationId is read fresh from DB so stale tokens don't return wrong results
router.get('/', authMiddleware, catchAsync(async (req, res) => {
  const exams = await examService.listAllActive()
  sendSuccess(res, exams)
}))

module.exports = router
