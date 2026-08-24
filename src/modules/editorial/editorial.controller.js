const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const editorialService = require('./editorial.service')

const list = catchAsync(async (req, res) => {
  const result = await editorialService.listAll(req.query, req.user?._id)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.getOne(req.params.id, req.user?._id))
})

const setRead = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setRead(req.params.id, req.user?._id, req.body.isRead), 'Editorial read state updated')
})

const setBookmark = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setBookmark(req.params.id, req.user?._id, req.body.isBookmarked), 'Editorial bookmark updated')
})

const setLike = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setLike(req.params.id, req.user?._id, req.body.isLiked), 'Editorial like updated')
})

const getPurchaseStatus = catchAsync(async (req, res) => {
  const isPurchased = await editorialService.getPurchaseStatus(req.user?._id)
  sendSuccess(res, { isPurchased }, 'Purchase status retrieved successfully')
})

const purchaseSection = catchAsync(async (req, res) => {
  const result = await editorialService.purchaseSection(req.user?._id, req.body.amount || 0)
  sendSuccess(res, result, 'Editorial section purchased successfully')
})

const getActivePlan = catchAsync(async (req, res) => {
  const plan = await editorialService.getActivePlan()
  sendSuccess(res, plan, 'Active plan retrieved successfully')
})

const getTopics = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.getTopics(req.query), 'Active topics retrieved successfully')
})

const listTests = catchAsync(async (req, res) => {
  const result = await editorialService.listTests(req.query)
  sendPaginated(res, result.data, result.pagination, 'Editorial tests retrieved successfully')
})

const getEditorialTests = catchAsync(async (req, res) => {
  const result = await editorialService.listTests({ editorialId: req.params.id, ...req.query })
  sendPaginated(res, result.data, result.pagination, 'Editorial tests retrieved successfully')
})

const getTestInstructions = catchAsync(async (req, res) => {
  const language = req.headers['accept-language'] === 'hi' ? 'hi' : 'en'
  const result = await editorialService.getTestInstructions(req.params.testId, req.user?._id, language)
  sendSuccess(res, result, 'Editorial test instructions retrieved successfully')
})

const startTest = catchAsync(async (req, res) => {
  const result = await editorialService.startTest(req.params.testId, req.user?._id)
  sendSuccess(res, result, 'Editorial test started successfully')
})

const submitTest = catchAsync(async (req, res) => {
  const result = await editorialService.submitTest(req.params.testId, req.user?._id, req.body)
  sendSuccess(res, result, 'Editorial test submitted successfully')
})

const startSession = catchAsync(async (req, res) => {
  const result = await editorialService.startSession(req.params.testId, req.user?._id, req.query.sessionId)
  sendSuccess(res, result, 'Editorial test session started successfully')
})

const updateSession = catchAsync(async (req, res) => {
  const result = await editorialService.updateSession(req.params.testId, req.params.sessionId, req.user?._id, req.body)
  sendSuccess(res, result, 'Editorial test session updated successfully')
})

const getSessionAnalytics = catchAsync(async (req, res) => {
  const result = await editorialService.getSessionAnalytics(req.params.testId, req.params.sessionId, req.user?._id)
  sendSuccess(res, result, 'Editorial test session analytics retrieved successfully')
})

const getSessionSolution = catchAsync(async (req, res) => {
  const result = await editorialService.getSessionSolution(req.params.testId, req.params.sessionId, req.user?._id)
  sendSuccess(res, result, 'Editorial test session solutions retrieved successfully')
})

const getEditorialVocabulary = catchAsync(async (req, res) => {
  const result = await editorialService.getEditorialVocabulary(req.params.id, req.query)
  sendPaginated(res, result.data, result.pagination, 'Editorial vocabulary retrieved successfully')
})

module.exports = {
  list,
  getOne,
  setRead,
  setBookmark,
  setLike,
  getPurchaseStatus,
  purchaseSection,
  getActivePlan,
  getTopics,
  listTests,
  getEditorialTests,
  getTestInstructions,
  startTest,
  submitTest,
  startSession,
  updateSession,
  getSessionAnalytics,
  getSessionSolution,
  getEditorialVocabulary
}
