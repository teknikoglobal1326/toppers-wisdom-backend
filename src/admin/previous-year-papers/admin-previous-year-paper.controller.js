const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'examId')) {
        payload.exam = payload.examId || null
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subExamIds')) {
        if (Array.isArray(payload.subExamIds)) {
            payload.subExams = payload.subExamIds
        } else if (typeof payload.subExamIds === 'string' && payload.subExamIds) {
            payload.subExams = [payload.subExamIds]
        } else {
            payload.subExams = []
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subjectIds')) {
        if (Array.isArray(payload.subjectIds)) {
            payload.subjectIds = payload.subjectIds.filter(Boolean)
        } else if (typeof payload.subjectIds === 'string' && payload.subjectIds) {
            payload.subjectIds = [payload.subjectIds]
        } else {
            payload.subjectIds = []
        }
    }

    delete payload.examId
    delete payload.subExamIds
    return payload
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, examId, subExamId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (examId) filter.exam = examId
    if (subExamId) filter.subExams = subExamId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await PreviousYearPaper.find(filter)
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await PreviousYearPaper.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const previousYearPaper = await PreviousYearPaper.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')

    if (!previousYearPaper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')
    sendSuccess(res, previousYearPaper)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await PreviousYearPaper.create(payload))
})

const update = catchAsync(async (req, res) => {
    const previousYearPaper = await PreviousYearPaper.findOne({ _id: req.params.id, isDeleted: false })
    if (!previousYearPaper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    Object.assign(previousYearPaper, normalizePayload(req.body))
    await previousYearPaper.save()

    sendSuccess(res, previousYearPaper)
})

const remove = catchAsync(async (req, res) => {
    const previousYearPaper = await PreviousYearPaper.findOne({ _id: req.params.id, isDeleted: false })
    if (!previousYearPaper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    previousYearPaper.isDeleted = true
    await previousYearPaper.save()

    sendSuccess(res, null, 'Previous year paper deleted')
})

module.exports = { list, getOne, create, update, remove }
