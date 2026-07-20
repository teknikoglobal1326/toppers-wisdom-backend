const catchAsync = require('../../core/catchAsync')
const { sendPaginated } = require('../../core/response')
const shortService = require('./short.service')

const listShorts = catchAsync(async (req, res) => {
  const result = await shortService.listShorts(req.user._id, req.params.categoryId, req.query)
  sendPaginated(res, result.data, result.pagination)
})

module.exports = { listShorts }
