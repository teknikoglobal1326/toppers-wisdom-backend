const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const TestSeries = require('../../models/TestSeries.model')

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

    if (Object.prototype.hasOwnProperty.call(payload, 'chapterIds')) {
        if (Array.isArray(payload.chapterIds)) {
            payload.chapterIds = payload.chapterIds.filter(Boolean)
        } else if (typeof payload.chapterIds === 'string' && payload.chapterIds) {
            payload.chapterIds = [payload.chapterIds]
        } else {
            payload.chapterIds = []
        }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'topicIds')) {
        if (Array.isArray(payload.topicIds)) {
            payload.topicIds = payload.topicIds.filter(Boolean)
        } else if (typeof payload.topicIds === 'string' && payload.topicIds) {
            payload.topicIds = [payload.topicIds]
        } else {
            payload.topicIds = []
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
    const docs = await TestSeries.find(filter)
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await TestSeries.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const testSeries = await TestSeries.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')

    if (!testSeries) throw new AppError('Test series not found', 404, 'NOT_FOUND')
    sendSuccess(res, testSeries)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await TestSeries.create(payload))
})

const update = catchAsync(async (req, res) => {
    const testSeries = await TestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!testSeries) throw new AppError('Test series not found', 404, 'NOT_FOUND')

    Object.assign(testSeries, normalizePayload(req.body))
    await testSeries.save()

    sendSuccess(res, testSeries)
})

const remove = catchAsync(async (req, res) => {
    const testSeries = await TestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!testSeries) throw new AppError('Test series not found', 404, 'NOT_FOUND')

    testSeries.isDeleted = true
    await testSeries.save()

    sendSuccess(res, null, 'Test series deleted')
})

module.exports = { list, getOne, create, update, remove }
