const catchAsync = require('../../core/catchAsync')
const { sendPaginated, sendSuccess } = require('../../core/response')
const thoughtOfTheDayService = require('./thought-of-the-day.service')

const listFeed = catchAsync(async (req, res) => {
  const result = await thoughtOfTheDayService.listFeed(req.query, req.user?._id)
  sendPaginated(res, result.data, result.pagination)
})

const toggleLike = catchAsync(async (req, res) => {
  const result = await thoughtOfTheDayService.toggleLike(req.params.id, req.user._id)
  sendSuccess(res, result)
})

const addComment = catchAsync(async (req, res) => {
  const { comment } = req.body
  const result = await thoughtOfTheDayService.addComment(req.params.id, req.user._id, comment)
  sendSuccess(res, result)
})

const shareThought = catchAsync(async (req, res) => {
  const result = await thoughtOfTheDayService.shareThought(req.params.id, req.user._id)
  sendSuccess(res, result)
})

module.exports = { listFeed, toggleLike, addComment, shareThought }
