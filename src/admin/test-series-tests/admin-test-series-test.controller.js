const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const TestSeriesTest = require('../../models/TestSeriesTest.model')
const TestSeries = require('../../models/TestSeries.model')
const Subject = require('../../models/Subject.model')
const Course = require('../../models/Course.model')
const Topic = require('../../models/Topic.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'testSeriesId')) {
        payload.testSeries = payload.testSeriesId || null
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'subjectId')) {
        payload.subjectId = payload.subjectId || null
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

    if (Object.prototype.hasOwnProperty.call(payload, 'chapterTitles')) {
        if (Array.isArray(payload.chapterTitles)) {
            payload.chapterTitles = payload.chapterTitles.filter(Boolean)
        } else if (typeof payload.chapterTitles === 'string' && payload.chapterTitles) {
            payload.chapterTitles = [payload.chapterTitles]
        } else {
            payload.chapterTitles = []
        }
    }

    const title = payload.title || ''
    const description = payload.description || null
    const instructions = payload.instructions || null

    if (!payload.localizedContent) payload.localizedContent = {}
    if (!payload.localizedContent.en) payload.localizedContent.en = {}

    payload.localizedContent.en.title = title
    payload.localizedContent.en.description = description
    payload.localizedContent.en.instructions = instructions

    delete payload.testSeriesId
    return payload
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, testSeriesId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (testSeriesId) filter.testSeries = testSeriesId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await TestSeriesTest.find(filter)
        .populate('testSeries')
        .populate('subjectId')
        .populate('topicIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await TestSeriesTest.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await TestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('testSeries')
        .populate('subjectId')
        .populate('topicIds')

    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, doc)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await TestSeriesTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await TestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body))
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await TestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Test deleted')
})

const metadata = catchAsync(async (req, res) => {
    const { testSeriesId, subjectId } = req.query
    if (!testSeriesId) throw new AppError('testSeriesId is required', 400, 'VALIDATION_ERROR')

    const series = await TestSeries.findOne({ _id: testSeriesId, isDeleted: false }).lean()
    if (!series) throw new AppError('Test series not found', 404, 'NOT_FOUND')

    const allowedSubjectIds = Array.isArray(series.subjectIds) ? series.subjectIds : []

    const subjects = await Subject.find({
        _id: { $in: allowedSubjectIds },
        isDeleted: false,
        status: 'active',
    })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

    let topics = []
    if (subjectId) {
        const courses = await Course.find({
            isDeleted: false,
            'subjects.subject': subjectId,
        })
            .select('_id')
            .lean()

        const courseIds = courses.map((course) => course._id)

        if (courseIds.length) {
            topics = await Topic.find({
                isDeleted: false,
                status: 'active',
                course: { $in: courseIds },
            })
                .sort({ sortOrder: 1, createdAt: -1 })
                .lean()
        }
    }

    const topicOptions = topics.map((topic) => ({
        _id: topic._id,
        topicName: topic.topicName,
        chapters: Array.isArray(topic.chapters) ? topic.chapters.map((chapter) => chapter.title).filter(Boolean) : [],
    }))

    sendSuccess(res, {
        subjects,
        topics: topicOptions,
    })
})

module.exports = { list, getOne, create, update, remove, metadata }
