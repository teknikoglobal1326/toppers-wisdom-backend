/**
 * EVERY function is 3 lines:
 * 1. catchAsync wrapper — no try/catch needed
 * 2. call service
 * 3. send response
 */
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated, sendCreated } = require('../../core/response')
const userService = require('./user.service')

const getMe = catchAsync(async (req, res) => { sendSuccess(res, await userService.getMe(req.user._id)) })
const updateProfile = catchAsync(async (req, res) => { sendSuccess(res, await userService.updateProfile(req.user._id, req.body)) })
const setupProfile = catchAsync(async (req, res) => { sendSuccess(res, await userService.setupProfile(req.user._id, req.body), 'Profile setup complete') })
const getStats = catchAsync(async (req, res) => { sendSuccess(res, await userService.getStats(req.user._id)) })
const getCommonStudyStats = catchAsync(async (req, res) => { sendSuccess(res, await userService.getCommonStudyStats(req.user._id)) })
const removeSaved = catchAsync(async (req, res) => { await userService.removeSaved(req.user._id, req.params.itemId); sendSuccess(res, null, 'Removed') })
const markNotifRead = catchAsync(async (req, res) => { await userService.markNotificationRead(req.user._id, req.params.id); sendSuccess(res, null, 'Marked as read') })
const deleteNotification = catchAsync(async (req, res) => { await userService.deleteNotification(req.user._id, req.params.id); sendSuccess(res, null, 'Deleted') })
const updateFcmToken = catchAsync(async (req, res) => { const updatedUser = await userService.updateFcmToken(req.user._id, req.body); sendSuccess(res, updatedUser, 'Updated') })
const createReport = catchAsync(async (req, res) => { sendCreated(res, await userService.createReport(req.user._id, req.body), 'Report submitted') })
const createMcqReport = catchAsync(async (req, res) => { sendCreated(res, await userService.createMcqReport(req.user._id, req.body), 'MCQ Report submitted') })
const getMyMcqReportByItemId = catchAsync(async (req, res) => { sendSuccess(res, await userService.getMyMcqReportByItemId(req.user._id, req.params.itemId)) })
const getMyMcqReports = catchAsync(async (req, res) => {
  const r = await userService.getMyMcqReports(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getSaved = catchAsync(async (req, res) => {
  const r = await userService.getSaved(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getOrders = catchAsync(async (req, res) => {
  const r = await userService.getOrders(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getNotifications = catchAsync(async (req, res) => {
  const r = await userService.getNotifications(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getUnreadNotificationCount = catchAsync(async (req, res) => {
  const count = await userService.getUnreadNotificationCount(req.user._id)
  sendSuccess(res, { count })
})

const getMyReports = catchAsync(async (req, res) => {
  const r = await userService.getMyReports(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getMyReportByItemId = catchAsync(async (req, res) => {
  sendSuccess(res, await userService.getMyReportByItemId(req.user._id, req.params.itemId))
})

const saveQuestion = catchAsync(async (req, res) => {
  sendCreated(res, await userService.saveQuestion(req.user._id, req.body), 'Question saved')
})

const unsaveQuestion = catchAsync(async (req, res) => {
  await userService.unsaveQuestion(req.user._id, req.params.questionId)
  sendSuccess(res, null, 'Removed')
})

const getSavedQuestions = catchAsync(async (req, res) => {
  const r = await userService.getSavedQuestions(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const sendTestNotification = catchAsync(async (req, res) => {
  const result = await userService.sendTestNotification(req.user._id, req.body)
  sendSuccess(res, result)
})

const getPremiumPlan = catchAsync(async (req, res) => {
  console.log("req.user",req.user);
  const plan = await userService.getPremiumPlan(req.user)
  sendSuccess(res, plan, 'Premium subscription plan retrieved successfully')
})

module.exports = { getMe, updateProfile, setupProfile, getStats, getCommonStudyStats, getSaved, removeSaved, getOrders, getNotifications, getUnreadNotificationCount, markNotifRead, deleteNotification, updateFcmToken, createReport, getMyReports, getMyReportByItemId, createMcqReport, getMyMcqReportByItemId, saveQuestion, unsaveQuestion, getSavedQuestions, getMyMcqReports, sendTestNotification, getPremiumPlan }
