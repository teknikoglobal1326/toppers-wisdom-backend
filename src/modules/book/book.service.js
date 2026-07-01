const BaseService = require('../../core/BaseService')
const bookRepository = require('./book.repository')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

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
            select: 'title author coverImage description price isFree section buyUrl pages rating tags exam subExam',
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
            select: 'title author coverImage description price isFree section buyUrl pages rating tags exam subExam',
        })
    }
}

module.exports = new BookService()
