const catchAsync = require('../../core/catchAsync')
const { sendPaginated } = require('../../core/response')
const shortCategoryService = require('./short-category.service')

const listCategories = catchAsync(async (req, res) => {
  const result = await shortCategoryService.listCategories(req.user._id, req.query)
  sendPaginated(res, result.data, result.pagination)
})

module.exports = { listCategories }
