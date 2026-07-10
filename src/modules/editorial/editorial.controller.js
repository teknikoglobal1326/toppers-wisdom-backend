const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const editorialService = require('./editorial.service')

const list = catchAsync(async (req, res) => {
  const result = await editorialService.listAll(req.query, req.user?._id)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.getOne(req.params.id, req.user?._id))
})

const setLike = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setLike(req.params.id, req.user?._id, req.body.isLiked), 'Editorial like updated')
})

module.exports = { list, getOne, setLike }
