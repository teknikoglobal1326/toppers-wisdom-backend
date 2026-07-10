const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const vocabularyService = require('./vocabulary.service')

const list = catchAsync(async (req, res) => {
    const result = await vocabularyService.listAll(req.query, req.user?._id)
    sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
    sendSuccess(res, await vocabularyService.getOne(req.params.id, req.user?._id))
})

const markRead = catchAsync(async (req, res) => {
    sendSuccess(res, await vocabularyService.markAsRead(req.params.id, req.user?._id), 'Marked as read')
})

const setBookmark = catchAsync(async (req, res) => {
    sendSuccess(res, await vocabularyService.setBookmark(req.params.id, req.user?._id, req.body.isBookmarked), 'Bookmark updated')
})

module.exports = { list, getOne, markRead, setBookmark }