const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const Book = require('../../models/Book.model')
const AppError = require('../../core/AppError')

const list = catchAsync(async (req, res) => {
  const { status, section, page = 1, limit = 10, q } = req.query
  const filter = { isDeleted: false }
  if (status) filter.status = status
  if (section) filter.section = section
  if (q) filter.title = { $regex: q, $options: 'i' }

  const skip = (page - 1) * limit
  const docs = await Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
  const total = await Book.countDocuments(filter)

  sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
  if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
  sendSuccess(res, book)
})

const create = catchAsync(async (req, res) => {
  const data = req.body
  data.createdBy = req.admin?._id
  const book = await Book.create(data)
  sendCreated(res, book)
})

const update = catchAsync(async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
  if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
  Object.assign(book, req.body)
  await book.save()
  sendSuccess(res, book)
})

const remove = catchAsync(async (req, res) => {
  const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
  if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
  book.isDeleted = true
  await book.save()
  sendSuccess(res, null, 'Book deleted')
})

const setBuyUrl = catchAsync(async (req, res) => {
  const { buyUrl } = req.body
  const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
  if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
  book.buyUrl = buyUrl
  await book.save()
  sendSuccess(res, book, 'Buy URL updated')
})

module.exports = { list, getOne, create, update, remove, setBuyUrl }
