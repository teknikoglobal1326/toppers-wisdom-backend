const catchAsync = require('../../core/catchAsync')
const { sendPaginated, sendSuccess } = require('../../core/response')
const thoughtOfTheDayService = require('./thought-of-the-day.service')

const listFeed = catchAsync(async (req, res) => {
  const result = await thoughtOfTheDayService.listFeed(req.query, req.user?._id)
  sendPaginated(res, result.data, result.pagination)
})

const toggleLike = catchAsync(async (req, res) => {
  const postId = req.params.id || req.params.twPostId || req.body.twPostId || req.body.twpostId || req.body.postId || req.body.id
  const result = await thoughtOfTheDayService.toggleLike(postId, req.user._id)
  sendSuccess(res, result)
})

const addComment = catchAsync(async (req, res) => {
  const postId = req.params.id || req.params.twPostId || req.body.twPostId || req.body.twpostId || req.body.postId || req.body.id
  const { comment } = req.body
  const result = await thoughtOfTheDayService.addComment(postId, req.user._id, comment)
  sendSuccess(res, result)
})

const shareThought = catchAsync(async (req, res) => {
  const postId = req.params.id || req.params.twPostId || req.body.twPostId || req.body.twpostId || req.body.postId || req.body.id
  const result = await thoughtOfTheDayService.shareThought(postId, req.user._id)
  sendSuccess(res, result)
})

module.exports = { listFeed, toggleLike, addComment, shareThought }
