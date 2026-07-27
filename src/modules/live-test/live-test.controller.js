const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
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

module.exports = {
  getSyllabus,
  autoGenerateQuestions
}
