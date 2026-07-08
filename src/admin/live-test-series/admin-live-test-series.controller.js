const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const LiveTestSeries = require('../../models/LiveTestSeries.model')

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await LiveTestSeries.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await LiveTestSeries.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const liveTestSeries = await LiveTestSeries.findOne({ _id: req.params.id, isDeleted: false })

    if (!liveTestSeries) throw new AppError('Live test series not found', 404, 'NOT_FOUND')
    sendSuccess(res, liveTestSeries)
})

const create = catchAsync(async (req, res) => {
    sendCreated(res, await LiveTestSeries.create({ ...req.body, createdBy: req.admin?._id || null }))
})

const update = catchAsync(async (req, res) => {
    const liveTestSeries = await LiveTestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!liveTestSeries) throw new AppError('Live test series not found', 404, 'NOT_FOUND')

    Object.assign(liveTestSeries, req.body)
    await liveTestSeries.save()

    sendSuccess(res, liveTestSeries)
})

const remove = catchAsync(async (req, res) => {
    const liveTestSeries = await LiveTestSeries.findOne({ _id: req.params.id, isDeleted: false })
    if (!liveTestSeries) throw new AppError('Live test series not found', 404, 'NOT_FOUND')

    liveTestSeries.isDeleted = true
    await liveTestSeries.save()

    sendSuccess(res, null, 'Live test series deleted')
})

module.exports = { list, getOne, create, update, remove }
