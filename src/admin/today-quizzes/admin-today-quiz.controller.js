const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const TodayQuiz = require('../../models/TodayQuiz.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    const title = payload.title || ''
    const description = payload.description || null
    const instructions = payload.instructions || null

    if (!payload.localizedContent) payload.localizedContent = {}
    if (!payload.localizedContent.en) payload.localizedContent.en = {}

    payload.localizedContent.en.title = title
    payload.localizedContent.en.description = description
    payload.localizedContent.en.instructions = instructions

    return payload
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, todayOnly } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    if (todayOnly === 'true') {
        const now = new Date()
        const dayStart = new Date(now)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(now)
        dayEnd.setHours(23, 59, 59, 999)

        filter.startDateTime = { $gte: dayStart, $lte: dayEnd }
    }

    const skip = (page - 1) * limit
    const docs = await TodayQuiz.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await TodayQuiz.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await TodayQuiz.findOne({ _id: req.params.id, isDeleted: false })

    if (!doc) throw new AppError('Today quiz not found', 404, 'NOT_FOUND')
    sendSuccess(res, doc)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await TodayQuiz.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await TodayQuiz.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Today quiz not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body))
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await TodayQuiz.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Today quiz not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Today quiz deleted')
})

module.exports = { list, getOne, create, update, remove }
