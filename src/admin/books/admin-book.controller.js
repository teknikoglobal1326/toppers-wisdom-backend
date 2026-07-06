const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const Book = require('../../models/Book.model')
const AppError = require('../../core/AppError')
const {
  getExactLanguageFilter,
  isDualLanguagePayload,
  makeLanguageRecords,
} = require('../../core/languageUtils')

const list = catchAsync(async (req, res) => {
    const { status, section, language, page = 1, limit = 10, q } = req.query
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (section) filter.section = section
    const exactLanguage = getExactLanguageFilter(language)
    if (exactLanguage) filter.language = exactLanguage
    if (q) filter.title = { $regex: q, $options: 'i' }

    const skip = (page - 1) * limit
    const docs = await Book.find(filter)
        .populate('exam')
        .populate('subExams')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    const total = await Book.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
    if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
    sendSuccess(res, book)
})

const normalizeBookPayload = (data = {}) => {
    const payload = { ...data }
    if (payload.examId) payload.exam = payload.examId
    if (payload.subExamIds) payload.subExams = payload.subExamIds
    if (payload.subExamId && !payload.subExamIds) payload.subExams = [payload.subExamId]
    delete payload.examId
    delete payload.subExamIds
    delete payload.subExamId
    return payload
}

const create = catchAsync(async (req, res) => {
    const createdBy = req.admin?._id

    if (isDualLanguagePayload(req.body)) {
        const records = makeLanguageRecords(req.body, { createdBy }).map(normalizeBookPayload)
        sendCreated(res, await Book.insertMany(records))
        return
    }

    sendCreated(res, await Book.create(normalizeBookPayload({ ...req.body, createdBy })))
})

const update = catchAsync(async (req, res) => {
    const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
    if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
    const updates = { ...req.body }
    if (updates.examId) updates.exam = updates.examId
    if (updates.subExamIds) updates.subExams = updates.subExamIds
    if (updates.subExamId && !updates.subExamIds) updates.subExams = [updates.subExamId]
    Object.assign(book, updates)
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
