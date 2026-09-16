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
    const { status, section, language, page = 1, limit = 10, q, sortOrder = 'asc', exam } = req.query
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (section) filter.section = section
    if (exam) filter.exam = exam
    const exactLanguage = getExactLanguageFilter(language)
    if (exactLanguage) filter.language = exactLanguage
    if (q) filter.title = { $regex: q, $options: 'i' }

    const skip = (page - 1) * limit
    const direction = sortOrder === 'desc' ? -1 : 1
    const docs = await Book.find(filter)
        .populate('exam')
        .populate('subExams')
        .sort({ sortOrder: direction, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    const total = await Book.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        Book.countDocuments({ isDeleted: false }),
        Book.countDocuments({ isDeleted: false, status: 'active' }),
        Book.countDocuments({ isDeleted: false, status: 'inactive' }),
    ])

    sendPaginated(res, docs, { 
        page: Number(page), 
        limit: Number(limit), 
        total,
        globalTotal,
        globalActive,
        globalInactive
    })
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
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
        const parsedSortOrder = Number(payload.sortOrder)
        if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    if (payload.mrp !== undefined && payload.mrp !== null && payload.mrp !== '') {
        const parsedMrp = Number(payload.mrp)
        if (!Number.isNaN(parsedMrp)) payload.mrp = parsedMrp
    }
    if (payload.price !== undefined && payload.price !== null && payload.price !== '') {
        const parsedPrice = Number(payload.price)
        if (!Number.isNaN(parsedPrice)) payload.price = parsedPrice
    }
    return payload
}

const create = catchAsync(async (req, res) => {
    const createdBy = req.admin?._id

    if (isDualLanguagePayload(req.body)) {
        const records = makeLanguageRecords(req.body, { createdBy }).map(normalizeBookPayload)
        console.log("records===================>", records);
        sendCreated(res, await Book.insertMany(records))
        return
    }

    sendCreated(res, await Book.create(normalizeBookPayload({ ...req.body, createdBy })))
})

const update = catchAsync(async (req, res) => {
    const book = await Book.findOne({ _id: req.params.id, isDeleted: false })
    if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
    const updates = normalizeBookPayload(req.body)
    console.log("updates book payload=====================>", updates);
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


const listPurchases = catchAsync(async (req, res) => {
  const BookPurchase = require('../../models/BookPurchase.model')
  const User = require('../../models/User.model')
  const Book = require('../../models/Book.model')
  const mongoose = require('mongoose')
  const { page = 1, limit = 10, search, q, bookId, status, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query

  const queryFilter = {}
  
  if (status && status !== 'all') {
    queryFilter.status = status
  }

  if (bookId && mongoose.Types.ObjectId.isValid(bookId)) {
    queryFilter.book = new mongoose.Types.ObjectId(bookId)
  }

  const searchTerm = search || q
  if (searchTerm && searchTerm.trim()) {
    const rx = new RegExp(searchTerm.trim(), 'i')
    const [matchingUsers, matchingBooks] = await Promise.all([
      User.find({ $or: [{ name: rx }, { email: rx }, { phone: rx }] }).select('_id').lean(),
      Book.find({ title: rx }).select('_id').lean(),
    ])
    const userIds = matchingUsers.map(u => u._id)
    const bookIds = matchingBooks.map(b => b._id)

    queryFilter.$or = [
      { razorpayOrderId: rx },
      { razorpayPaymentId: rx },
      { user: { $in: userIds } },
      { book: { $in: bookIds } }
    ]
  }

  if (startDate || endDate) {
    queryFilter.createdAt = {}
    if (startDate) queryFilter.createdAt.$gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      queryFilter.createdAt.$lte = end
    }
  }

  const pageNum = Number(page) || 1
  const limitNum = Number(limit) || 10
  const skip = (pageNum - 1) * limitNum
  const sortDirection = sortOrder === 'asc' ? 1 : -1
  const sort = { [sortBy]: sortDirection }

  const [purchases, total, globalTotalTransactions, globalTotalPaid, globalTotalPending, globalTotalFailed, revenueAgg, todayCount, todayRevenueAgg] = await Promise.all([
    BookPurchase.find(queryFilter)
      .populate('user', 'name email phone qualification avatar image')
      .populate('book', 'title author coverImage price mrp section language file samplePdf buyUrl isFree rating')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    BookPurchase.countDocuments(queryFilter),
    BookPurchase.countDocuments({}),
    BookPurchase.countDocuments({ status: 'paid' }),
    BookPurchase.countDocuments({ status: 'pending' }),
    BookPurchase.countDocuments({ status: 'failed' }),
    BookPurchase.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]),
    (() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return BookPurchase.countDocuments({ createdAt: { $gte: today } })
    })(),
    (() => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return BookPurchase.aggregate([
        { $match: { status: 'paid', createdAt: { $gte: today } } },
        { $group: { _id: null, todayRevenue: { $sum: '$amount' } } }
      ])
    })()
  ])

  const globalRevenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0
  const globalTodayRevenue = todayRevenueAgg.length > 0 ? todayRevenueAgg[0].todayRevenue : 0

  sendPaginated(res, purchases, {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum) || 1,
    globalTotalTransactions,
    globalTotalPaid,
    globalTotalPending,
    globalTotalFailed,
    globalRevenue,
    globalTodayTransactions: todayCount,
    globalTodayRevenue
  })
})
module.exports = { list, getOne, create, update, remove, setBuyUrl, listPurchases }
