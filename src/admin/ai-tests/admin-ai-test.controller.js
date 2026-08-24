const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const adminAiTestService = require('./admin-ai-test.service')

const listAll = catchAsync(async (req, res) => {
  const result = await adminAiTestService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const data = await adminAiTestService.getOne(req.params.id)
  sendSuccess(res, data)
})

const deleteTest = catchAsync(async (req, res) => {
  const result = await adminAiTestService.deleteTest(req.params.id)
  sendSuccess(res, null, result.message)
})

module.exports = {
  listAll,
  getOne,
  deleteTest
}
