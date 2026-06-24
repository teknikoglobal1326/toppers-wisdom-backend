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

module.exports = { overview, revenue, users }
