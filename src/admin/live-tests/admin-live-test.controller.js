const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const LiveTest = require('../../models/LiveTest.model')
const Subject = require('../../models/Subject.model')

const normalizePayload = (data = {}) => {
    const payload = { ...data }

    for (const key of ['subExamIds', 'subjectIds', 'chapterIds', 'topicIds']) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
            if (Array.isArray(payload[key])) {
                payload[key] = payload[key].filter(Boolean)
            } else if (typeof payload[key] === 'string' && payload[key]) {
                payload[key] = [payload[key]]
            } else {
                payload[key] = []
            }
        }
    }
    if (payload.examId === '') payload.examId = null

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

// chapterIds/topicIds are embedded ids from Subject.chapters[].topics[]; resolve
// their names from the (populated) mapped subjects for display.
const withResolvedSyllabus = (doc) => {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const chapterNameById = new Map()
    const topicNameById = new Map()
    for (const subject of Array.isArray(obj.subjectIds) ? obj.subjectIds : []) {
        for (const chapter of (subject && Array.isArray(subject.chapters)) ? subject.chapters : []) {
            if (chapter && chapter._id) chapterNameById.set(String(chapter._id), chapter.name)
            for (const topic of (chapter && Array.isArray(chapter.topics)) ? chapter.topics : []) {
                if (topic && topic._id) topicNameById.set(String(topic._id), topic.name)
            }
        }
    }
    obj.chapterIds = (Array.isArray(obj.chapterIds) ? obj.chapterIds : []).map((id) => ({
        _id: id,
        chapterName: chapterNameById.get(String(id)) || null,
    }))
    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => ({
        _id: id,
        topicName: topicNameById.get(String(id)) || null,
    }))
    return obj
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, liveNow } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (liveNow === 'true') {
        const now = new Date()
        filter.startDateTime = { $lte: now }
        filter.endDateTime = { $gte: now }
    }
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await LiveTest.find(filter)
        .populate('examId', 'name')
        .populate('subExamIds', 'name')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await LiveTest.countDocuments(filter)

    sendPaginated(res, docs.map(withResolvedSyllabus), { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('examId', 'name')
        .populate('subExamIds', 'name')
        .populate('subjectIds')

    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')
    sendSuccess(res, withResolvedSyllabus(doc))
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await LiveTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body))
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await LiveTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Live test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Live test deleted')
})

// Options for the live-test create/update form. Flow: exam -> subjects mapped to
// that exam (Subject.examIds) -> each subject's embedded chapters -> each chapter's
// embedded topics.
const metadata = catchAsync(async (req, res) => {
    const { examId } = req.query
    if (!examId) throw new AppError('examId is required', 400, 'VALIDATION_ERROR')

    // Selected subjects to expand chapters for. Accept repeated `subjectIds`, a CSV
    // string, or a single `subjectId`.
    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    const subjects = await Subject.find({
        examIds: examId,
        isDeleted: false,
        status: 'active',
    })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

    const selectedSet = new Set(selectedSubjectIds)
    const chapterOptions = []
    for (const subject of subjects) {
        if (selectedSet.size && !selectedSet.has(String(subject._id))) continue
        const embeddedChapters = Array.isArray(subject.chapters) ? subject.chapters : []
        for (const chapter of embeddedChapters) {
            chapterOptions.push({
                _id: chapter._id,
                chapterName: chapter.name,
                subjectId: subject._id,
                topics: Array.isArray(chapter.topics)
                    ? chapter.topics.map((topic) => ({ _id: topic._id, name: topic.name }))
                    : [],
            })
        }
    }

    sendSuccess(res, {
        subjects,
        chapters: chapterOptions,
    })
})

module.exports = { list, getOne, create, update, remove, metadata }
