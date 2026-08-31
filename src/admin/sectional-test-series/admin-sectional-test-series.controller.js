const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const SectionalTestSeries = require('../../models/SectionalTestSeries.model')

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

const SectionalTestSeriesTest = require('../../models/SectionalTestSeriesTest.model')

const attachTestCounts = async (docs) => {
    if (!docs || docs.length === 0) return docs

    const tsIds = docs.map(d => d._id)

    const testCounts = await SectionalTestSeriesTest.aggregate([
        { $match: { sectionalTestSeries: { $in: tsIds }, isDeleted: false } },
        { $group: { _id: '$sectionalTestSeries', count: { $sum: 1 } } }
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
    const docs = await SectionalTestSeries.find(filter)
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    const enrichedDocs = await attachTestCounts(docs)
    const total = await SectionalTestSeries.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        SectionalTestSeries.countDocuments({ isDeleted: false }),
        SectionalTestSeries.countDocuments({ isDeleted: false, status: 'active' }),
        SectionalTestSeries.countDocuments({ isDeleted: false, status: 'inactive' }),
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
    const testSeries = await SectionalTestSeries.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .lean()

    if (!testSeries) throw new AppError('Sectional test series not found', 404, 'NOT_FOUND')

    const [enriched] = await attachTestCounts([testSeries])
    sendSuccess(res, enriched)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await SectionalTestSeries.create(payload))
})

const update = catchAsync(async (req, res) => {
    const testSeries = await SectionalTestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!testSeries) throw new AppError('Sectional test series not found', 404, 'NOT_FOUND')

    Object.assign(testSeries, normalizePayload(req.body))
    await testSeries.save()

    sendSuccess(res, testSeries)
})

const remove = catchAsync(async (req, res) => {
    const testSeries = await SectionalTestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!testSeries) throw new AppError('Sectional test series not found', 404, 'NOT_FOUND')

    testSeries.isDeleted = true
    await testSeries.save()

    sendSuccess(res, null, 'Sectional test series deleted')
})

module.exports = { list, getOne, create, update, remove }
