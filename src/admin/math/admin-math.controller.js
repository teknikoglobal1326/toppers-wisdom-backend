const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const MathModel = require('../../models/Math.model')
const MathTest = require('../../models/MathTest.model')

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

const attachTestCounts = async (docs) => {
    if (!docs || docs.length === 0) return docs

    const mathIds = docs.map(d => d._id)

    const testCounts = await MathTest.aggregate([
        { $match: { math: { $in: mathIds }, isDeleted: false } },
        { $group: { _id: '$math', count: { $sum: 1 } } }
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
    const docs = await MathModel.find(filter)
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

    const enrichedDocs = await attachTestCounts(docs)
    const total = await MathModel.countDocuments(filter)

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
        MathModel.countDocuments({ isDeleted: false }),
        MathModel.countDocuments({ isDeleted: false, status: 'active' }),
        MathModel.countDocuments({ isDeleted: false, status: 'inactive' }),
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
    const math = await MathModel.findOne({ _id: req.params.id, isDeleted: false })
        .populate('exam')
        .populate('subExams')
        .populate('subjectIds')
        .lean()

    if (!math) throw new AppError('Math series not found', 404, 'NOT_FOUND')

    const [enriched] = await attachTestCounts([math])
    sendSuccess(res, enriched)
})

const create = catchAsync(async (req, res) => {
    const payload = normalizePayload({ ...req.body, createdBy: req.admin?._id || null })
    sendCreated(res, await MathModel.create(payload))
})

const update = catchAsync(async (req, res) => {
    const math = await MathModel.findOne({ _id: req.params.id, isDeleted: false })
    if (!math) throw new AppError('Math series not found', 404, 'NOT_FOUND')

    Object.assign(math, normalizePayload(req.body))
    await math.save()

    sendSuccess(res, math)
})

const remove = catchAsync(async (req, res) => {
    const math = await MathModel.findOne({ _id: req.params.id, isDeleted: false })
    if (!math) throw new AppError('Math series not found', 404, 'NOT_FOUND')

    math.isDeleted = true
    await math.save()

    sendSuccess(res, null, 'Math series deleted')
})

const seedTestData = catchAsync(async (req, res) => {
    const mongoose = require('mongoose')
    const Question = require('../../models/Question.model')

    const examId = '6a435c9972415c8784247406'
    const subExams = ['6a435ca872415c878424740a', '6a6addf20d37dfcff07ea644']
    const subjectIds = ['6a71a6db737e91294c29864b', '6a71a67b737e91294c2985db', '6a71a5fb737e91294c29855c']
    const chapterIds = ['6a71a6db737e91294c29864c', '6a71a6db737e91294c29864f', '6a71a67b737e91294c2985dc', '6a71a67b737e91294c2985df', '6a71a5fb737e91294c29855d']
    const topicIds = [
        '6a71a6db737e91294c29864d', '6a71a6db737e91294c29864e', '6a71a6db737e91294c298650', '6a71a6db737e91294c298651',
        '6a71a67b737e91294c2985dd', '6a71a67b737e91294c2985de', '6a71a67b737e91294c2985e0', '6a71a67b737e91294c2985e1',
        '6a71a5fb737e91294c29855e', '6a71a5fb737e91294c298561', '6a71a5fb737e91294c29855f', '6a71a5fb737e91294c298562'
    ]

    // 4. Create Math Package Series
    const mathSeries = await MathModel.create({
        title: 'Advanced Mathematics for Staff Selection',
        description: 'Special math series for SSC CGL containing Algebra, Trigonometry, and Arithmetic.',
        exam: examId,
        subExams: subExams,
        subjectIds: subjectIds,
        chapterIds: chapterIds,
        topicIds: topicIds,
        isPaid: false,
        status: 'active',
        isDeleted: false,
        createdBy: req.admin?._id || null
    })

    // 5. Create Math Test
    const mathTest = await MathTest.create({
        math: mathSeries._id,
        subjectIds: subjectIds,
        chapterIds: chapterIds,
        topicIds: topicIds,
        title: 'Algebra Foundations Test',
        description: '5 basic questions to check algebraic equation concepts.',
        duration: 10,
        isPerQuestionTime: false,
        totalQuestions: 5,
        totalMappedQuestions: 5,
        totalMarks: 10,
        marksPerQuestion: 2,
        negativeMarks: 0.5,
        passingMarks: 4,
        isPaid: false,
        status: 'active',
        languages: ['en', 'hi'],
        localizedContent: {
            en: {
                title: 'Algebra Foundations Test',
                description: '5 basic questions.'
            },
            hi: {
                title: 'बीजगणित बुनियादी परीक्षण',
                description: '5 बुनियादी प्रश्न।'
            }
        },
        createdBy: req.admin?._id || null
    })

    // 6. Create 5 Questions
    const questionsData = [
        {
            test: mathTest._id,
            testModel: 'CourseTest',
            exam: examId,
            subExams: subExams,
            subjectId: subjectIds[0],
            chapterId: chapterIds[0],
            topicId: topicIds[0],
            order: 1,
            marks: 2,
            negativeMarks: 0.5,
            status: 'active',
            difficulty: 'easy',
            en: {
                question: { text: 'Solve for x: 2x + 5 = 15' },
                options: [{ text: '5' }, { text: '10' }, { text: '7.5' }, { text: '15' }],
                correctOption: 0,
                explanation: { text: '2x = 15 - 5 => 2x = 10 => x = 5' }
            },
            hi: {
                question: { text: 'x का मान ज्ञात करें: 2x + 5 = 15' },
                options: [{ text: '5' }, { text: '10' }, { text: '7.5' }, { text: '15' }],
                correctOption: 0,
                explanation: { text: '2x = 15 - 5 => 2x = 10 => x = 5' }
            }
        },
        {
            test: mathTest._id,
            testModel: 'CourseTest',
            exam: examId,
            subExams: subExams,
            subjectId: subjectIds[0],
            chapterId: chapterIds[0],
            topicId: topicIds[0],
            order: 2,
            marks: 2,
            negativeMarks: 0.5,
            status: 'active',
            difficulty: 'easy',
            en: {
                question: { text: 'If x + y = 10 and x - y = 4, find x.' },
                options: [{ text: '7' }, { text: '3' }, { text: '6' }, { text: '14' }],
                correctOption: 0,
                explanation: { text: 'Adding equations: 2x = 14 => x = 7' }
            },
            hi: {
                question: { text: 'यदि x + y = 10 और x - y = 4, तो x का मान ज्ञात करें।' },
                options: [{ text: '7' }, { text: '3' }, { text: '6' }, { text: '14' }],
                correctOption: 0,
                explanation: { text: 'समीकरण जोड़ने पर: 2x = 14 => x = 7' }
            }
        },
        {
            test: mathTest._id,
            testModel: 'CourseTest',
            exam: examId,
            subExams: subExams,
            subjectId: subjectIds[0],
            chapterId: chapterIds[0],
            topicId: topicIds[0],
            order: 3,
            marks: 2,
            negativeMarks: 0.5,
            status: 'active',
            difficulty: 'medium',
            en: {
                question: { text: 'Solve for x: x^2 - 5x + 6 = 0' },
                options: [{ text: 'x = 2, 3' }, { text: 'x = -2, -3' }, { text: 'x = 1, 6' }, { text: 'x = 2, -3' }],
                correctOption: 0,
                explanation: { text: '(x-2)(x-3) = 0 => x = 2, 3' }
            },
            hi: {
                question: { text: 'हल करें: x^2 - 5x + 6 = 0' },
                options: [{ text: 'x = 2, 3' }, { text: 'x = -2, -3' }, { text: 'x = 1, 6' }, { text: 'x = 2, -3' }],
                correctOption: 0,
                explanation: { text: '(x-2)(x-3) = 0 => x = 2, 3' }
            }
        },
        {
            test: mathTest._id,
            testModel: 'CourseTest',
            exam: examId,
            subExams: subExams,
            subjectId: subjectIds[0],
            chapterId: chapterIds[0],
            topicId: topicIds[0],
            order: 4,
            marks: 2,
            negativeMarks: 0.5,
            status: 'active',
            difficulty: 'medium',
            en: {
                question: { text: 'What is the degree of the polynomial 4x^3 + 2x^2 + 5?' },
                options: [{ text: '3' }, { text: '2' }, { text: '1' }, { text: '0' }],
                correctOption: 0,
                explanation: { text: 'The highest power of x is 3.' }
            },
            hi: {
                question: { text: 'बहुपद 4x^3 + 2x^2 + 5 की घात क्या है?' },
                options: [{ text: '3' }, { text: '2' }, { text: '1' }, { text: '0' }],
                correctOption: 0,
                explanation: { text: 'x की उच्चतम घात 3 है।' }
            }
        },
        {
            test: mathTest._id,
            testModel: 'CourseTest',
            exam: examId,
            subExams: subExams,
            subjectId: subjectIds[0],
            chapterId: chapterIds[0],
            topicId: topicIds[0],
            order: 5,
            marks: 2,
            negativeMarks: 0.5,
            status: 'active',
            difficulty: 'hard',
            en: {
                question: { text: 'If x + 1/x = 5, find the value of x^2 + 1/x^2.' },
                options: [{ text: '23' }, { text: '25' }, { text: '27' }, { text: '21' }],
                correctOption: 0,
                explanation: { text: '(x + 1/x)^2 = 25 => x^2 + 1/x^2 + 2 = 25 => x^2 + 1/x^2 = 23' }
            },
            hi: {
                question: { text: 'यदि x + 1/x = 5, तो x^2 + 1/x^2 का मान ज्ञात करें।' },
                options: [{ text: '23' }, { text: '25' }, { text: '27' }, { text: '21' }],
                correctOption: 0,
                explanation: { text: '(x + 1/x)^2 = 25 => x^2 + 1/x^2 + 2 = 25 => x^2 + 1/x^2 = 23' }
            }
        }
    ]

    const createdQuestions = await Question.insertMany(questionsData)

    sendSuccess(res, {
        examId,
        subExams,
        subjectIds,
        mathSeries,
        mathTest,
        questionsCount: createdQuestions.length
    }, 'Seed data created successfully')
})

module.exports = { list, getOne, create, update, remove, seedTestData }
