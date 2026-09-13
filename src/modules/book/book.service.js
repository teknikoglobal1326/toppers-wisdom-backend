const BaseService = require('../../core/BaseService')
const bookRepository = require('./book.repository')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const config = require('../../config/env')
const crypto = require('crypto')
const Razorpay = require('razorpay')
const BookPurchase = require('../../models/BookPurchase.model')

class BookService extends BaseService {
    constructor() {
        super(bookRepository, 'book')
        this.logger = createLogger('book:service')
    }

    async listBooks(filters) {
        this.logger.info({ filters }, 'Listing books')
        const filter = { isDeleted: false, status: 'active' }
        if (filters.section) filter.section = filters.section
        if (filters.q) filter.title = { $regex: filters.q, $options: 'i' }
        if (filters.isFree !== undefined) filter.isFree = filters.isFree
        if (filters.examId) filter.exam = filters.examId
        if (filters.subExam) filter.subExam = filters.subExam

        return this.getAll(filter, {
            page: filters.page,
            limit: filters.limit,
            sort: { createdAt: -1 },
            select: 'title author coverImage file description price mrp isFree section buyUrl pages rating tags language',
        })
    }

    async getBook(bookId) {
        this.logger.info({ bookId }, 'Fetching book')
        const book = await bookRepository.findOne({ _id: bookId, isDeleted: false, status: 'active' })
        if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')
        return book
    }

    async listBooksForUser(user, filters = {}) {
        this.logger.info({ userId: user?._id, subExamId: user?.subExamId, examTypeId: user?.examTypeId }, 'Listing user books')

        const filter = { isDeleted: false, status: 'active' }
        if (user?.subExamId) filter.subExam = user.subExamId
        else if (user?.examTypeId) filter.exam = user.examTypeId
        if (filters.section) filter.section = filters.section
        if (filters.q) filter.title = { $regex: filters.q, $options: 'i' }
        if (filters.isFree !== undefined) filter.isFree = filters.isFree
        if (filters.examId) filter.exam = filters.examId
        if (filters.subExam) filter.subExam = filters.subExam

        return this.getAll(filter, {
            page: filters.page,
            limit: filters.limit,
            sort: { createdAt: -1 },
            select: 'title author coverImage description price mrp isFree section buyUrl pages rating tags exam subExam',
        })
    }

    async purchaseBook(userId, bookId) {
    this.logger.info({ userId, bookId }, 'Initiating book purchase')

    const book = await bookRepository.findOne({ _id: bookId, isDeleted: false, status: 'active' })
    if (!book) throw new AppError('Book not found', 404, 'NOT_FOUND')

    if (book.isFree) throw new AppError('This book is free', 400, 'BAD_REQUEST')

    // Initialize Razorpay
    const razorpay = new Razorpay({
        key_id: config.RAZORPAY_KEY_ID,
        key_secret: config.RAZORPAY_KEY_SECRET,
    })

    // Amount in paise
    const amount = book.price * 100

    // Create Razorpay Order
    const rzpOrder = await razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: `receipt_${userId}_${bookId}`
    })

    // Create Pending Purchase Record
    const purchase = await BookPurchase.create({
        user: userId,
        book: bookId,
        amount: book.price,
        razorpayOrderId: rzpOrder.id,
        status: 'pending'
    })

    return {
        purchaseId: purchase._id,
        razorpayOrderId: rzpOrder.id,
        amount: book.price,
        keyId: config.RAZORPAY_KEY_ID
    }
}

    async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    this.logger.info({ userId, razorpayOrderId }, 'Verifying book purchase payment')

    const expectedSig = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex')

    if (expectedSig !== razorpaySignature) {
        this.logger.warn({ userId, razorpayOrderId }, 'Signature mismatch for book purchase')
        throw new AppError('Invalid payment signature', 400, 'BAD_REQUEST')
    }

    const purchase = await BookPurchase.findOne({ razorpayOrderId, user: userId })
    if (!purchase) {
        throw new AppError('Purchase record not found', 404, 'NOT_FOUND')
    }

    purchase.status = 'paid'
    purchase.razorpayPaymentId = razorpayPaymentId
    purchase.razorpaySignature = razorpaySignature
    await purchase.save()

    return purchase
}

    async handleWebhook(payload, signature) {
    this.logger.info('Received Razorpay Webhook')

    const expectedSig = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
        .update(JSON.stringify(payload))
        .digest('hex')

    if (expectedSig !== signature) {
        throw new AppError('Invalid webhook signature', 400, 'BAD_REQUEST')
    }

    const event = payload.event
    if (event === 'payment.captured') {
        const paymentEntity = payload.payload.payment.entity
        const razorpayOrderId = paymentEntity.order_id

        const purchase = await BookPurchase.findOne({ razorpayOrderId })
        if (purchase && purchase.status === 'pending') {
            purchase.status = 'paid'
            purchase.razorpayPaymentId = paymentEntity.id
            await purchase.save()
        }
    }

    return { success: true }
}

    async listPurchasedBooks(userId, filters = {}) {
    this.logger.info({ userId }, 'Listing purchased books')

    const limit = filters.limit ? parseInt(filters.limit, 10) : 10
    const page = filters.page ? parseInt(filters.page, 10) : 1
    const skip = (page - 1) * limit

    const query = { user: userId, status: 'paid' }

    const purchases = await BookPurchase.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('book', 'title author coverImage price isFree tags rating')

    const total = await BookPurchase.countDocuments(query)

    return {
        data: purchases.map(p => p.book),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}

    async listTransactions(userId, filters = {}) {
    this.logger.info({ userId }, 'Listing book transactions')

    const limit = filters.limit ? parseInt(filters.limit, 10) : 10
    const page = filters.page ? parseInt(filters.page, 10) : 1
    const skip = (page - 1) * limit

    const query = { user: userId }

    const transactions = await BookPurchase.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('book', 'title author coverImage')

    const total = await BookPurchase.countDocuments(query)

    return {
        data: transactions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    }
}
}

module.exports = new BookService()
