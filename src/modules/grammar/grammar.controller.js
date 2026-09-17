const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const grammarService = require('./grammar.service')

const list = catchAsync(async (req, res) => {
  const result = await grammarService.listAll(req.query, req.user?._id)
  sendSuccess(res, result, 'Grammar categories retrieved successfully')
})

const getByCategory = catchAsync(async (req, res) => {
  const result = await grammarService.getByCategory(req.params.categoryId, req.query, req.user?._id)
  sendPaginated(res, result.data, result.pagination, 'Grammar list retrieved successfully')
})

const setChapterRead = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await grammarService.setChapterRead(req.params.id, req.params.chapterId, req.user?._id, req.body.isRead),
    'Chapter read state updated'
  )
})

const setChapterBookmark = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await grammarService.setChapterBookmark(req.params.id, req.params.chapterId, req.user?._id, req.body.isBookmarked),
    'Chapter bookmark updated'
  )
})

const setChapterLike = catchAsync(async (req, res) => {
  sendSuccess(
    res,
    await grammarService.setChapterLike(req.params.id, req.params.chapterId, req.user?._id, req.body.isLiked),
    'Chapter like updated'
  )
})

module.exports = { list, getByCategory, setChapterRead, setChapterBookmark, setChapterLike }
