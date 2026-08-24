const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminGrammarCategoryService = require('./admin-grammar-category.service')

const list = catchAsync(async (req, res) => {
  const result = await adminGrammarCategoryService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const category = await adminGrammarCategoryService.getOne(req.params.id)
  sendSuccess(res, category)
})

const create = catchAsync(async (req, res) => {
  const category = await adminGrammarCategoryService.createGrammarCategory(req.body)
  sendCreated(res, category)
})

const update = catchAsync(async (req, res) => {
  const category = await adminGrammarCategoryService.updateGrammarCategory(req.params.id, req.body)
  sendSuccess(res, category)
})

const remove = catchAsync(async (req, res) => {
  await adminGrammarCategoryService.softDelete(req.params.id)
  sendSuccess(res, null, 'Grammar category deleted successfully')
})

module.exports = {
  list,
  getOne,
  create,
  update,
  remove
}
