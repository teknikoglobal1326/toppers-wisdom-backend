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

const getTopExamsByStudentCount = catchAsync(async (req, res) => {
  const data = await dashboardService.getTopExamsByStudentCount()
  sendSuccess(res, data, 'Top exams (categories) by student count retrieved successfully')
})

const getCategorizedEnrollments = catchAsync(async (req, res) => {
  const data = await dashboardService.getCategorizedEnrollments()
  sendSuccess(res, data, 'Categorized paid enrollment statistics retrieved successfully')
})

const getDashboardCounts = catchAsync(async (req, res) => {
  const data = await dashboardService.getDashboardCounts()
  sendSuccess(res, data, 'Dashboard item counts retrieved successfully')
})

const getRecentActivities = catchAsync(async (req, res) => {
  const data = await dashboardService.getRecentActivities()
  sendSuccess(res, data, 'Recent dashboard activities retrieved successfully')
})

module.exports = {
  getDashboardStats,
  getEnrollmentStats,
  getRevenueStats,
  getUpcomingLiveClasses,
  getTopExamsByStudentCount,
  getCategorizedEnrollments,
  getDashboardCounts,
  getRecentActivities
}

