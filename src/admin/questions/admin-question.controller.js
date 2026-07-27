const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminQuestionService = require('./admin-question.service')

const list = catchAsync(async (req, res) => {
  const result = await adminQuestionService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminQuestionService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  sendCreated(res, await adminQuestionService.createQuestion({ ...req.body, createdBy: req.admin?._id || req.user?._id || req.user?.id }))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id || req.user?._id || req.user?.id }
  sendSuccess(res, await adminQuestionService.updateQuestion(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminQuestionService.softDelete(req.params.id)
  sendSuccess(res, null, 'Question deleted')
})

const removeByTest = catchAsync(async (req, res) => {
  sendSuccess(res, await adminQuestionService.softDeleteByTest(req.params.testId), 'Questions deleted')
})

const bulkUpload = catchAsync(async (req, res) => {
  const result = await adminQuestionService.bulkUpload(req.file, req.body, req.admin?._id || req.user?._id || req.user?.id)
  sendCreated(res, result)
})

module.exports = { list, getOne, create, update, remove, removeByTest, bulkUpload }
