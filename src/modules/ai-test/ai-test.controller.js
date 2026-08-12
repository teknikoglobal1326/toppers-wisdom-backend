const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const aiTestService = require('./ai-test.service')

const getSubjects = catchAsync(async (req, res) => {
  const data = await aiTestService.getSubjects(req.user, req.query)
  sendSuccess(res, data, 'Subjects retrieved successfully')
})

const getChapters = catchAsync(async (req, res) => {
  const data = await aiTestService.getChapters(req.params.subjectId, req.user)
  sendSuccess(res, data, 'Chapters retrieved successfully')
})

const getTopics = catchAsync(async (req, res) => {
  const data = await aiTestService.getTopics(req.params.subjectId, req.params.chapterId, req.user)
  sendSuccess(res, data, 'Topics retrieved successfully')
})

const generateAiTest = catchAsync(async (req, res) => {
  const data = await aiTestService.generateAiTest(req.user._id, req.body)
  sendSuccess(res, data, 'AI Test generated successfully')
})

const getQuestions = catchAsync(async (req, res) => {
  const data = await aiTestService.getQuestions(req.params.id, req.user._id)
  sendSuccess(res, data, 'AI Test questions retrieved successfully')
})

const startSession = catchAsync(async (req, res) => {
  const data = await aiTestService.startSession(req.params.id, req.user._id)
  sendSuccess(res, data, 'AI Test session started successfully')
})

const updateSession = catchAsync(async (req, res) => {
  const data = await aiTestService.updateSession(req.params.id, req.params.sessionId, req.user._id, req.body)
  sendSuccess(res, data, 'AI Test session updated successfully')
})

const getSessionAnalytics = catchAsync(async (req, res) => {
  const data = await aiTestService.getSessionAnalytics(req.params.id, req.params.sessionId, req.user._id)
  sendSuccess(res, data, 'AI Test session analytics retrieved successfully')
})

module.exports = {
  getSubjects,
  getChapters,
  getTopics,
  generateAiTest,
  getQuestions,
  startSession,
  updateSession,
  getSessionAnalytics
}
