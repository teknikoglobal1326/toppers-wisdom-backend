const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
const Subject = require('../../models/Subject.model')

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

    if (Object.prototype.hasOwnProperty.call(payload, 'subjectIds')) {
        if (Array.isArray(payload.subjectIds)) {
            payload.subjectIds = payload.subjectIds.filter(Boolean)
        } else if (typeof payload.subjectIds === 'string' && payload.subjectIds) {
            payload.subjectIds = [payload.subjectIds]
        } else {
            payload.subjectIds = []
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

// topicIds are embedded ids from Subject.topics[]; there is no Topic collection to
// populate against. Resolve their names from the (populated) mapped subjects so the
// admin UI can display topic names instead of raw ids.
const withResolvedTopics = (doc) => {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const topicNameById = new Map()
    for (const subject of Array.isArray(obj.subjectIds) ? obj.subjectIds : []) {
        for (const topic of (subject && Array.isArray(subject.topics)) ? subject.topics : []) {
            if (topic && topic._id) topicNameById.set(String(topic._id), topic.name)
        }
    }
    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => ({
        _id: id,
        topicName: topicNameById.get(String(id)) || null,
    }))
    return obj
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
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await PreviousYearPaperTest.countDocuments(filter)

    sendPaginated(res, docs.map(withResolvedTopics), { page: Number(page), limit: Number(limit), total })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await PreviousYearPaperTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('previousYearPaper')
        .populate('subjectIds')

    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, withResolvedTopics(doc))
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({
        subjectIds: [],
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

// Options for the test create/update form. Flow: paper -> mapped subjects ->
// each subject's embedded topics -> each topic's embedded chapters. Topics and
// chapters come from Subject.topics[].chapters[], NOT the standalone Topic collection.
const metadata = catchAsync(async (req, res) => {
    const { previousYearPaperId } = req.query
    if (!previousYearPaperId) throw new AppError('previousYearPaperId is required', 400, 'VALIDATION_ERROR')

    const paper = await PreviousYearPaper.findOne({ _id: previousYearPaperId, isDeleted: false }).lean()
    if (!paper) throw new AppError('Previous year paper not found', 404, 'NOT_FOUND')

    // Selected subjects to expand topics for. Accept repeated `subjectIds`, a CSV
    // string, or the legacy single `subjectId`.
    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    const allowedSubjectIds = Array.isArray(paper.subjectIds) ? paper.subjectIds : []

    const subjects = await Subject.find({
        _id: { $in: allowedSubjectIds },
        isDeleted: false,
        status: 'active',
    })
        .sort({ sortOrder: 1, createdAt: -1 })
        .lean()

    // Flatten embedded topics of the selected subjects (that are also mapped to the
    // paper) into topic options carrying their chapter names and parent subject.
    const selectedSet = new Set(selectedSubjectIds)
    const topicOptions = []
    for (const subject of subjects) {
        if (selectedSet.size && !selectedSet.has(String(subject._id))) continue
        const embeddedTopics = Array.isArray(subject.topics) ? subject.topics : []
        for (const topic of embeddedTopics) {
            topicOptions.push({
                _id: topic._id,
                topicName: topic.name,
                subjectId: subject._id,
                chapters: Array.isArray(topic.chapters)
                    ? topic.chapters.map((chapter) => chapter.name).filter(Boolean)
                    : [],
            })
        }
    }

    sendSuccess(res, {
        subjects,
        topics: topicOptions,
    })
})

module.exports = { list, getOne, create, update, remove, metadata }
