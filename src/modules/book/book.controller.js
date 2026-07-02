const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const bookService = require('./book.service')

const listBooks = catchAsync(async (req, res) => {
  const r = await bookService.listBooks(req.query)
  sendPaginated(res, r.data, r.pagination)
})

const listUserBooks = catchAsync(async (req, res) => {
  const r = await bookService.listBooksForUser(req.user, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getBook = catchAsync(async (req, res) => {
  sendSuccess(res, await bookService.getBook(req.params.id))
})

module.exports = { listBooks, listUserBooks, getBook }
