const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const testService = require('./test.service')

const listTests     = catchAsync(async (req, res) => { const r = await testService.listTests(req.user._id, req.user.subExamId, req.query); sendPaginated(res, r.data, r.pagination) })
const getTest       = catchAsync(async (req, res) => { sendSuccess(res, await testService.getTest(req.params.id, req.user._id)) })
const startSubTest  = catchAsync(async (req, res) => { sendSuccess(res, await testService.startSubTest(req.params.id, req.params.subTestId, req.user._id)) })
const getLeaderboard = catchAsync(async (req, res) => { sendSuccess(res, await testService.getLeaderboard(req.params.id)) })
const getMyAttempts  = catchAsync(async (req, res) => { const r = await testService.getMyAttempts(req.user._id, req.query); sendPaginated(res, r.data, r.pagination) })

const submitAttempt = catchAsync(async (req, res) => {
  const result = await testService.submitAttempt(
    req.params.id, req.params.subTestId, req.user._id, req.body.answers, req.body.timeTaken
  )
  sendSuccess(res, result, 'Attempt submitted successfully')
})

module.exports = { listTests, getTest, startSubTest, submitAttempt, getLeaderboard, getMyAttempts }