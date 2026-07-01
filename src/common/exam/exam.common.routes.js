const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const examService = require('../../modules/exam/exam.service')

// GET /api/v1/common/exams — qualificationId resolved from the logged-in user's token
router.get('/', authMiddleware, catchAsync(async (req, res) => {
  const exams = await examService.listByQualification(req.user.qualificationId)
  sendSuccess(res, exams)
}))

module.exports = router
