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

const setRead = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setRead(req.params.id, req.user?._id, req.body.isRead), 'Editorial read state updated')
})

const setBookmark = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setBookmark(req.params.id, req.user?._id, req.body.isBookmarked), 'Editorial bookmark updated')
})

const setLike = catchAsync(async (req, res) => {
  sendSuccess(res, await editorialService.setLike(req.params.id, req.user?._id, req.body.isLiked), 'Editorial like updated')
})

const getPurchaseStatus = catchAsync(async (req, res) => {
  const isPurchased = await editorialService.getPurchaseStatus(req.user?._id)
  sendSuccess(res, { isPurchased }, 'Purchase status retrieved successfully')
})

const purchaseSection = catchAsync(async (req, res) => {
  const result = await editorialService.purchaseSection(req.user?._id, req.body.amount || 0)
  sendSuccess(res, result, 'Editorial section purchased successfully')
})

module.exports = { list, getOne, setRead, setBookmark, setLike, getPurchaseStatus, purchaseSection }
