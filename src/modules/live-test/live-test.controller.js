const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const liveTestService = require('./live-test.service')

const getSyllabus = catchAsync(async (req, res) => {
  const { examId } = req.query
  const data = await liveTestService.getSyllabus(examId)
  sendSuccess(res, data, 'Syllabus options retrieved successfully')
})

const autoGenerateQuestions = catchAsync(async (req, res) => {
  const { testId, subjectId, chapterIds, limit } = req.body
  const result = await liveTestService.autoGenerateQuestions({ testId, subjectId, chapterIds, limit })
  sendSuccess(res, result, 'Questions mapped successfully')
})

const listLiveTests = catchAsync(async (req, res) => {
  const result = await liveTestService.listLiveTests(req.user._id, req.query)
  sendPaginated(res, result.data, result.pagination, 'Live tests retrieved successfully')
})

const getLiveTestInstructions = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await liveTestService.getLiveTestInstructions(req.params.id, req.user._id),
    'Live test instructions retrieved successfully'
  )
})

const startSession = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await liveTestService.startSession(req.params.id, req.user._id, req.query.language),
    'Live test session started successfully'
  )
})

const updateSession = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await liveTestService.updateSession(req.params.id, req.params.sessionId, req.user._id, req.body),
    'Live test session updated successfully'
  )
})

const getSessionAnalytics = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await liveTestService.getSessionAnalytics(req.params.id, req.params.sessionId, req.user._id),
    'Live test session analytics retrieved successfully'
  )
})

const getSessionSolution = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await liveTestService.getSessionSolution(req.params.id, req.params.sessionId, req.user._id),
    'Live test session solution retrieved successfully'
  )
})

const listMyAttempts = catchAsync(async (req, res) => {
  const result = await liveTestService.listMyAttempts(req.user._id, req.query)
  sendPaginated(res, result.data, result.pagination, 'Live test attempts retrieved successfully')
})

module.exports = {
  getSyllabus,
  autoGenerateQuestions,
  listLiveTests,
  getLiveTestInstructions,
  startSession,
  updateSession,
  getSessionAnalytics,
  getSessionSolution,
  listMyAttempts
}
