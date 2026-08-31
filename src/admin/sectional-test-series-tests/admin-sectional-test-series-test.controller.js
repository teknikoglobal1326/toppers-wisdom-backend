const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const SectionalTestSeriesTest = require('../../models/SectionalTestSeriesTest.model')
const SectionalTestSeries = require('../../models/SectionalTestSeries.model')
const Subject = require('../../models/Subject.model')

const normalizePayload = (data = {}, existing = null) => {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'sectionalTestSeriesId')) {
        payload.sectionalTestSeries = payload.sectionalTestSeriesId || null
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

    const flatBlock = {
        title: payload.title || null,
        description: payload.description || null,
        instructions: payload.instructions || null,
    }
    const primaryLang = languages.includes('en') ? 'en' : languages[0]

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
        if (!languages.includes(lang)) localizedContent[lang] = null
    }

    payload.localizedContent = localizedContent

    const primary = localizedContent[primaryLang] || localizedContent.en || localizedContent.hi
    if (primary) {
        payload.title = primary.title || ''
        payload.description = primary.description || null
        payload.instructions = primary.instructions || null
    }

    delete payload.en
    delete payload.hi
    delete payload.language
    delete payload.sectionalTestSeriesId
    return payload
}

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
    const { status, page = 1, limit = 10, q, sectionalTestSeriesId } = req.query
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (sectionalTestSeriesId) filter.sectionalTestSeries = sectionalTestSeriesId
    if (q) {
        filter.$or = [
            { title: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
        ]
    }

    const skip = (page - 1) * limit
    const docs = await SectionalTestSeriesTest.find(filter)
        .populate('sectionalTestSeries')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

    const total = await SectionalTestSeriesTest.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        SectionalTestSeriesTest.countDocuments({ isDeleted: false }),
        SectionalTestSeriesTest.countDocuments({ isDeleted: false, status: 'active' }),
        SectionalTestSeriesTest.countDocuments({ isDeleted: false, status: 'inactive' }),
    ])

    sendPaginated(res, docs.map(withResolvedSyllabus), { 
        page: Number(page), 
        limit: Number(limit), 
        total,
        globalTotal,
        globalActive,
        globalInactive
    })
})

const getOne = catchAsync(async (req, res) => {
    const doc = await SectionalTestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
        .populate('sectionalTestSeries')
        .populate('subjectIds')

    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')
    sendSuccess(res, withResolvedSyllabus(doc))
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({
        subjectIds: [],
        chapterIds: [],
        topicIds: [],
        ...req.body,
        createdBy: req.admin?._id || null,
    })
    sendCreated(res, await SectionalTestSeriesTest.create(payload))
})

const update = catchAsync(async (req, res) => {
    const doc = await SectionalTestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    Object.assign(doc, normalizePayload(req.body, doc))
    doc.markModified('localizedContent')
    await doc.save()

    sendSuccess(res, doc)
})

const remove = catchAsync(async (req, res) => {
    const doc = await SectionalTestSeriesTest.findOne({ _id: req.params.id, isDeleted: false })
    if (!doc) throw new AppError('Test not found', 404, 'NOT_FOUND')

    doc.isDeleted = true
    await doc.save()

    sendSuccess(res, null, 'Test deleted')
})

const metadata = catchAsync(async (req, res) => {
    const { sectionalTestSeriesId } = req.query
    if (!sectionalTestSeriesId) throw new AppError('sectionalTestSeriesId is required', 400, 'VALIDATION_ERROR')

    const series = await SectionalTestSeries.findOne({ _id: sectionalTestSeriesId, isDeleted: false }).lean()
    if (!series) throw new AppError('Sectional test series not found', 404, 'NOT_FOUND')

    const rawSubjectIds = req.query.subjectIds ?? req.query.subjectId
    const selectedSubjectIds = (Array.isArray(rawSubjectIds)
        ? rawSubjectIds
        : typeof rawSubjectIds === 'string'
            ? rawSubjectIds.split(',')
            : [])
        .map((id) => String(id).trim())
        .filter(Boolean)

    const examId = series.exam
    if (!examId) throw new AppError('No exam associated with this sectional test series', 400, 'VALIDATION_ERROR')

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

const getTestAnalytics = catchAsync(async (req, res) => {
    const testId = req.params.id
    const SectionalTestSeriesAttempt = require('../../models/SectionalTestSeriesAttempt.model')
    
    const test = await SectionalTestSeriesTest.findOne({ _id: testId, isDeleted: false }).lean()
    if (!test) throw new AppError('Test not found', 404, 'NOT_FOUND')

    const attempts = await SectionalTestSeriesAttempt.find({ test: testId, status: 'completed' })
        .populate('user', 'name email phone avatar')
        .lean()

    const bestAttemptsMap = new Map()
    attempts.forEach(att => {
        if (!att.user) return
        const userIdStr = att.user._id.toString()
        const existing = bestAttemptsMap.get(userIdStr)
        if (!existing) {
            bestAttemptsMap.set(userIdStr, att)
        } else {
            if (att.score > existing.score || (att.score === existing.score && (att.timeTaken || 0) < (existing.timeTaken || 0))) {
                bestAttemptsMap.set(userIdStr, att)
            }
        }
    })
    const uniqueAttempts = Array.from(bestAttemptsMap.values())

    const totalParticipants = uniqueAttempts.length

    let totalScore = 0
    let maxScore = 0
    let minScore = totalParticipants > 0 ? uniqueAttempts[0].score : 0
    let totalAccuracy = 0
    let totalTimeTaken = 0

    const distribution = {
        "0-20%": 0,
        "21-40%": 0,
        "41-60%": 0,
        "61-80%": 0,
        "81-100%": 0
    }

    uniqueAttempts.forEach(att => {
        totalScore += att.score
        if (att.score > maxScore) maxScore = att.score
        if (att.score < minScore) minScore = att.score
        totalAccuracy += (att.accuracy || 0)
        totalTimeTaken += (att.timeTaken || 0)

        const percentage = att.totalMarks > 0 ? (att.score / att.totalMarks) * 100 : 0
        if (percentage <= 20) distribution["0-20%"]++
        else if (percentage <= 40) distribution["21-40%"]++
        else if (percentage <= 60) distribution["41-60%"]++
        else if (percentage <= 80) distribution["61-80%"]++
        else distribution["81-100%"]++
    })

    const averageScore = totalParticipants > 0 ? parseFloat((totalScore / totalParticipants).toFixed(2)) : 0
    const averageAccuracy = totalParticipants > 0 ? parseFloat((totalAccuracy / totalParticipants).toFixed(2)) : 0
    const averageTimeTaken = totalParticipants > 0 ? parseFloat((totalTimeTaken / totalParticipants).toFixed(2)) : 0

    const sortedAttempts = [...uniqueAttempts].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return a.timeTaken - b.timeTaken
    })

    const topPerformers = sortedAttempts.slice(0, 3).map((att, idx) => ({
        rank: idx + 1,
        name: att.user?.name || 'Student',
        email: att.user?.email || '',
        phone: att.user?.phone || '',
        score: att.score,
        totalMarks: att.totalMarks,
        accuracy: att.accuracy,
        timeTaken: att.timeTaken
    }))

    const speedVsAccuracy = uniqueAttempts.map(att => ({
        name: att.user?.name || 'Student',
        speed: att.timeTaken || 0,
        accuracy: att.accuracy || 0,
        score: att.score || 0
    }))

    const allStudents = sortedAttempts.map((att, idx) => ({
        rank: idx + 1,
        name: att.user?.name || 'Student',
        email: att.user?.email || '',
        phone: att.user?.phone || '',
        score: att.score,
        totalMarks: att.totalMarks,
        accuracy: att.accuracy,
        timeTaken: att.timeTaken,
        attemptedAt: att.attemptedAt
    }))

    sendSuccess(res, {
        test: {
            _id: test._id,
            title: test.title,
            totalMarks: test.totalMarks,
            totalQuestions: test.totalQuestions
        },
        overview: {
            totalParticipants,
            maxScore,
            minScore,
            averageScore,
            averageAccuracy,
            averageTimeTaken
        },
        topPerformers,
        scoreDistribution: distribution,
        speedVsAccuracy,
        allStudents
    })
})

module.exports = { list, getOne, create, update, remove, metadata, getTestAnalytics }
