const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const dashboardService = require('./admin-dashboard.service')

const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getDashboardStats()
  sendSuccess(res, stats, 'Dashboard stats fetched successfully')
})

const getEnrollmentStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getEnrollmentStats(req.query)
  sendSuccess(res, stats, 'Dashboard daily enrollment stats fetched successfully')
})

const getRevenueStats = catchAsync(async (req, res) => {
  const stats = await dashboardService.getRevenueStats(req.query)
  sendSuccess(res, stats, 'Dashboard daily revenue stats fetched successfully')
})

const getUpcomingLiveClasses = catchAsync(async (req, res) => {
  const data = await dashboardService.getUpcomingLiveClasses()
  sendSuccess(res, data, 'Upcoming live classes retrieved successfully')
})

module.exports = {
  getDashboardStats,
  getEnrollmentStats,
  getRevenueStats,
  getUpcomingLiveClasses
}
