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
  if (req.body.hi && req.body.en) {
    sendCreated(res, await adminQuestionService.createQuestionDual(req.body, req.admin?._id))
  } else {
    sendCreated(res, await adminQuestionService.createQuestion({ ...req.body, createdBy: req.admin?._id }))
  }
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminQuestionService.updateQuestion(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminQuestionService.softDelete(req.params.id)
  sendSuccess(res, null, 'Question deleted')
})

const removeByTest = catchAsync(async (req, res) => {
  sendSuccess(res, await adminQuestionService.softDeleteByTest(req.params.testId), 'Questions deleted')
})

module.exports = { list, getOne, create, update, remove, removeByTest }
