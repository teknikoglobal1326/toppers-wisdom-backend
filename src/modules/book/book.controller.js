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

const purchaseBook = catchAsync(async (req, res) => {
  const result = await bookService.purchaseBook(req.user._id, req.params.id)
  sendSuccess(res, result)
})

const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
  const result = await bookService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature)
  sendSuccess(res, result)
})

const webhook = catchAsync(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const result = await bookService.handleWebhook(req.body, signature)
  sendSuccess(res, result)
})

const listPurchasedBooks = catchAsync(async (req, res) => {
  const r = await bookService.listPurchasedBooks(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const listTransactions = catchAsync(async (req, res) => {
  const r = await bookService.listTransactions(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

module.exports = { 
  listBooks, 
  listUserBooks, 
  getBook, 
  purchaseBook, 
  verifyPayment, 
  webhook, 
  listPurchasedBooks, 
  listTransactions 
}
