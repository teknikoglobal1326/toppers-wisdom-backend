const catchAsync       = require('../../core/catchAsync')
const { sendSuccess }  = require('../../core/response')
const analyticsService = require('./admin-analytics.service')
const AppError         = require('../../core/AppError')

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

const courseEnrollments = catchAsync(async (req, res) => {
  sendSuccess(res, await analyticsService.courseEnrollments(req.params.courseId, req.query), 'Course enrollment analytics fetched')
})

const testLeaderboard = catchAsync(async (req,res)=>{
  sendSuccess( res, await analyticsService.testLeaderboard( req.params.testId, req.query ), 'Test leaderboard fetched')
})


const previousYearPaperTestLeaderboard = catchAsync(async (req, res) => {
  sendSuccess(res, await analyticsService.previousYearPaperTestLeaderboard(req.params.testId, req.query), 'Previous year paper test leaderboard fetched')
})

const courseTestLeaderboard = catchAsync(async (req, res) => {
  sendSuccess(res, await analyticsService.courseTestLeaderboard(req.params.testId, req.query), 'Course test leaderboard fetched')
})

module.exports = { overview, revenue, users, courseEnrollments, testLeaderboard, previousYearPaperTestLeaderboard, courseTestLeaderboard }
