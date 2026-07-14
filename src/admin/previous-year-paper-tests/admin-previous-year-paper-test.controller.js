const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const Subject = require('../../models/Subject.model')
const Course = require('../../models/Course.model')
const Topic = require('../../models/Topic.model')

// Turn a nested { en: {...}, hi: {...} } dual-language body into the stored shape:
// `localizedContent.en/hi` (only for the selected languages) plus top-level
// title/description/instructions mirrored from the primary language (English when
// present, otherwise Hindi) for list/search and legacy reads.
// `existing` is the current doc on update, so unsent languages are preserved.
const normalizePayload = (data = {}, existing = null) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'previousYearPaperId')) {
        payload.previousYearPaper = payload.previousYearPaperId || null
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

    // Resolve languages leniently: explicit `languages`, else legacy scalar
    // `language`, else the existing doc's, else default English. Never blocks.
    let languages = Array.isArray(payload.languages) && payload.languages.length
        ? payload.languages
        : (payload.language ? [payload.language] : null)
    if (!languages) {
        languages = (existing && Array.isArray(existing.languages) && existing.languages.length)
            ? existing.languages
            : ['en']
    }
    payload.languages = languages

    const buildBlock = (block) => ({
        title: block?.title || null,
        description: block?.description || null,
        instructions: block?.instructions || null,
    })

    // Flat title/description/instructions = the primary language's content (what the
    // current UI sends). Primary is English when selected, else the first language.
    const flatBlock = {
        title: payload.title || null,
        description: payload.description || null,
        instructions: payload.instructions || null,
    }
    const primaryLang = languages.includes('en') ? 'en' : languages[0]

    // Start from existing content (update) so unsent languages survive.
    const localizedContent = {
        en: (existing && existing.localizedContent && existing.localizedContent.en) || null,
        hi: (existing && existing.localizedContent && existing.localizedContent.hi) || null,
    }

    for (const lang of ['en', 'hi']) {
        if (payload[lang]) {
            localizedContent[lang] = buildBlock(payload[lang])
        } else if (lang === primaryLang && (flatBlock.title || flatBlock.description || flatBlock.instructions)) {
            localizedContent[lang] = buildBlock(flatBlock)
        }
        // Drop content for a language not selected.
        if (!languages.includes(lang)) localizedContent[lang] = null
    }

    payload.localizedContent = localizedContent

    // Mirror the primary language onto the flat fields for list/search/legacy reads.
    const primary = localizedContent[primaryLang] || localizedContent.en || localizedContent.hi
    if (primary) {
        payload.title = primary.title || ''
        payload.description = primary.description || null
        payload.instructions = primary.instructions || null
    }

    delete payload.en
    delete payload.hi
    delete payload.language
    delete payload.previousYearPaperId
    return payload
}

const list = catchAsync(async (req, res) => {
    const { status, page = 1, limit = 10, q, previousYearPaperId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (previousYearPaperId) filter.previousYearPaper = previousYearPaperId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await PreviousYearPaperTest.find(filter)
        .populate('previousYearPaper')
        .populate('subjectId')
        .populate('topicIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await PreviousYearPaperTest.countDocuments(filter)

    sendPaginated(res, docs, { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('previousYearPaper')
        .populate('subjectId')
        .populate('topicIds')

    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, doc)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({
        subjectId: null,
        topicIds: [],
        chapterTitles: [],
        ...req.body,
        createdBy: req.admin?._id || null,
    })
    sendCreated(res, await PreviousYearPaperTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body, doc))
    doc.markModified('localizedContent')
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Test deleted')
})

const metadata = catchAsync(async (req, res) => {
    const { previousYearPaperId, subjectId } = req.query
    if (!previousYearPaperId) throw new AppError('previousYearPaperId is required', 400, 'VALIDATION_ERROR')

    const paper = await PreviousYearPaper.findOne({ _id: previousYearPaperId, isDeleted: false }).lean()
    if (!paper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    const allowedSubjectIds = Array.isArray(paper.subjectIds) ? paper.subjectIds : []

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
