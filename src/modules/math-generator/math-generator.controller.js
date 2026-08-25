const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated } = require('../../core/response')
const speedMathTestService = require('./math-generator.service')

const generateTest = catchAsync(async (req, res) => {
  const result = await speedMathTestService.generateTest(req.user._id, req.body)
  sendCreated(res, result)
})

const getTestQuestions = catchAsync(async (req, res) => {
  const result = await speedMathTestService.getTestQuestions(req.params.testId)
  sendSuccess(res, result)
})

const submitAnswer = catchAsync(async (req, res) => {
  const result = await speedMathTestService.submitAnswer(req.user._id, req.params.testId, req.body)
  sendSuccess(res, result)
})

const submitTest = catchAsync(async (req, res) => {
  const result = await speedMathTestService.submitTest(req.user._id, req.params.testId)
  sendSuccess(res, result)
})

const getResult = catchAsync(async (req, res) => {
  const result = await speedMathTestService.getResult(req.user._id, req.params.testId)
  sendSuccess(res, result)
})

const getDashboardData = catchAsync(async (req, res) => {
  const result = await speedMathTestService.getDashboardData(req.user._id)
  sendSuccess(res, result, 'Dashboard data retrieved successfully')
})

module.exports = {
  generateTest,
  getTestQuestions,
  submitAnswer,
  submitTest,
  getResult,
  getDashboardData
}
