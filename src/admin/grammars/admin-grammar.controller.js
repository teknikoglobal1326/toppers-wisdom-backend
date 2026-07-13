const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminGrammarService = require('./admin-grammar.service')

const list = catchAsync(async (req, res) => {
  const result = await adminGrammarService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminGrammarService.getOne(req.params.id, req.query.topicSortOrder))
})

const create = catchAsync(async (req, res) => {
  sendCreated(res, await adminGrammarService.createGrammar(req.body))
})

const update = catchAsync(async (req, res) => {
  sendSuccess(res, await adminGrammarService.updateGrammar(req.params.id, req.body))
})

const remove = catchAsync(async (req, res) => {
  await adminGrammarService.softDelete(req.params.id)
  sendSuccess(res, null, 'Grammar deleted')
})

module.exports = { list, getOne, create, update, remove }
