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

const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')

const attachTestCounts = async (docs) => {
    if (!docs || docs.length === 0) return docs

    const pypIds = docs.map(d => d._id)

    const testCounts = await PreviousYearPaperTest.aggregate([
        { $match: { previousYearPaper: { $in: pypIds }, isDeleted: false } },
        { $group: { _id: '$previousYearPaper', count: { $sum: 1 } } }
    ])

    const countMap = new Map()
    testCounts.forEach(item => {
        countMap.set(item._id.toString(), item.count)
    })

    return docs.map(doc => {
        const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc }
        const count = countMap.get(doc._id.toString()) || 0
        return {
            ...plain,
            testCount: count,
            totalTests: count
        }
    })
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
        .lean()

    const enrichedDocs = await attachTestCounts(docs)
    const total = await PreviousYearPaper.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        PreviousYearPaper.countDocuments({ isDeleted: false }),
        PreviousYearPaper.countDocuments({ isDeleted: false, status: 'active' }),
        PreviousYearPaper.countDocuments({ isDeleted: false, status: 'inactive' }),
    ])

    sendPaginated(res, enrichedDocs, { 
        page: Number(page), 
        limit: Number(limit), 
        total,
        globalTotal,
        globalActive,
        globalInactive
    })
})

const getOne = catchAsync(async (req, res) => {
    const previousYearPaper = await PreviousYearPaper.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .lean()

    if (!previousYearPaper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    const [enriched] = await attachTestCounts([previousYearPaper])
    sendSuccess(res, enriched)
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
