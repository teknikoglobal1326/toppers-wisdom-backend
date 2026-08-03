const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const crypto = require('crypto')
const { groupQuestionsByLanguage, groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const dailyQuizRepository = require('./daily-quiz.repository')

class DailyQuizService extends BaseService {
    constructor() {
        super(dailyQuizRepository, 'daily-quiz')
        this.logger = createLogger('daily-quiz:service')
    }

    async listQuizzes(userId, query = {}) {
        const user = await User.findById(userId).select('exam subExams language').lean()
        const subExamIds = (user?.subExams || []).map((item) => item._id)
        const examId = user?.exam?._id || (typeof user?.exam === 'object' ? user?.exam?._id : user?.exam)

        const filter = { isDeleted: false, status: query.status || 'active' }
        if (query.examId) {
            filter.exam = query.examId
        } else if (examId) {
            filter.exam = examId
        }

        if (query.subExamId) {
            filter.subExams = query.subExamId
        } else if (subExamIds.length && !query.examId) {
            filter.$or = [
                { subExams: { $exists: false } },
                { subExams: { $size: 0 } },
                { subExams: { $in: subExamIds } },
            ]
        }

        if (query.q) {
            filter.$or = [
                { title: { $regex: query.q, $options: 'i' } },
                { description: { $regex: query.q, $options: 'i' } },
            ]
        }

        if (query.date !== 'all') {
            const dateStr = query.date || new Date().toISOString().split('T')[0]
            const startOfDay = new Date(dateStr)
            startOfDay.setUTCHours(0, 0, 0, 0)
            const endOfDay = new Date(dateStr)
            endOfDay.setUTCHours(23, 59, 59, 999)
            filter.scheduleAt = { $gte: startOfDay, $lte: endOfDay }
        }

        const quizzesResult = await this.repository.findMany(filter, {
            page: query.page,
            limit: query.limit,
            sort: { createdAt: -1 }
        })

        const Question = require('../../models/Question.model')
        const DailyQuizAttempt = require('../../models/DailyQuizAttempt.model')

        const processedData = await Promise.all(quizzesResult.data.map(async (item) => {
            const id = item._id.toString()
            const questionCount = await Question.countDocuments({ test: id, isDeleted: false })
            const attempt = await DailyQuizAttempt.findOne({ quiz: id, user: userId, status: 'completed' })
                .select('score totalMarks status attemptedAt')
                .sort({ attemptedAt: -1 })
                .lean()

            return {
                ...item,
                description: htmlToPlainText(item.description || ''),
                mappedQuestions: questionCount,
                attemptStatus: attempt ? 'attempted' : 'not_attempted',
                latestAttempt: attempt || null,
            }
        }))

        return {
            data: processedData,
            pagination: quizzesResult.pagination
        }
    }

    async getQuizInstructions(quizId, userId) {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

        return {
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                duration: quiz.duration,
                totalQuestions: quiz.totalQuestions,
                totalMarks: quiz.totalMarks,
                marksPerQuestion: quiz.marksPerQuestion,
                negativeMarks: quiz.negativeMarks,
                passingMarks: quiz.passingMarks,
                instructions: quiz.instructions,
                instructionsNew: quiz.instructionsNew,
                localizedContent: quiz.localizedContent
            }
        }
    }

    async startSession(quizId, userId, language = 'hi') {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz || quiz.status !== 'active') {
            throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')
        }

        const hasAccess = !quiz.isPaid
        if (!hasAccess) throw new AppError('Please purchase this test to access', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForQuiz(quizId)
        if (!questions.length) throw new AppError('No questions mapped for this quiz', 400, 'VALIDATION_ERROR')

        const sessionId = crypto.randomUUID()
        const totalQuestions = new Set(questions.map(q => q.order)).size
        const totalMarks = Number(quiz.totalMarks || totalQuestions * Number(quiz.marksPerQuestion || 1))

        await this.repository.createAttempt({
            user: userId,
            quiz: quiz._id,
            sessionId,
            totalTime: quiz.duration * 60,
            totalMarks,
            status: 'started',
            answers: []
        })

        const groupedQuestions = groupQuestionsBySubject(questions)
        return {
            sessionId,
            quiz: {
                _id: quiz._id,
                title: quiz.title,
                duration: quiz.duration,
                totalQuestions: quiz.totalQuestions,
                totalMarks,
                passingMarks: quiz.passingMarks,
                negativeMarks: quiz.negativeMarks,
            },
            questionsBySubject: groupedQuestions,
        }
    }

    async updateSession(quizId, sessionId, userId, payload = {}) {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz || quiz.status !== 'active') {
            throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        if (attempt.status === 'completed' || attempt.status === 'abandoned') {
            throw new AppError('Session already closed', 400, 'VALIDATION_ERROR')
        }

        let updatedAnswers = attempt.answers || []

        if (payload.answer && payload.answer.questionId) {
            const index = updatedAnswers.findIndex(a => a.questionId.toString() === payload.answer.questionId.toString())
            if (index !== -1) {
                updatedAnswers[index] = payload.answer
            } else {
                updatedAnswers.push(payload.answer)
            }
        } else if (payload.answers && Array.isArray(payload.answers)) {
            payload.answers.forEach(newAns => {
                const index = updatedAnswers.findIndex(a => a.questionId.toString() === newAns.questionId.toString())
                if (index !== -1) {
                    updatedAnswers[index] = newAns
                } else {
                    updatedAnswers.push(newAns)
                }
            })
        }

        const questions = await this.repository.findQuestionsForQuiz(quizId)
        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, updatedAnswers, quiz)

        const totalMarks = Number(quiz.totalMarks || totalQuestions * Number(quiz.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0 ? parseFloat(((correct / totalQuestions) * 100).toFixed(2)) : 0
        const timeTaken = updatedAnswers.reduce((acc, ans) => acc + (ans.timeTaken || 0), 0)

        const status = payload.status || 'ongoing'

        attempt.answers = updatedAnswers
        attempt.score = score
        attempt.totalMarks = totalMarks
        attempt.accuracy = accuracy
        attempt.timeTaken = timeTaken
        attempt.correct = correct
        attempt.wrong = wrong
        attempt.skipped = skipped
        attempt.unattempted = unattempted
        attempt.status = status
        if (status === 'completed') {
            attempt.attemptedAt = new Date()
        }

        await attempt.save()

        return {
            attemptId: attempt._id,
            sessionId,
            status,
            score,
            totalMarks,
            passingMarks: Number(quiz.passingMarks || 0),
            isPassed: score >= Number(quiz.passingMarks || 0),
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted
        }
    }

    async getSessionAnalytics(quizId, sessionId, userId) {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) throw new AppError('Session not found', 404, 'NOT_FOUND')

        return {
            sessionId: attempt.sessionId,
            status: attempt.status,
            score: attempt.score,
            totalMarks: attempt.totalMarks,
            accuracy: attempt.accuracy,
            timeTaken: attempt.timeTaken,
            totalTime: attempt.totalTime,
            correct: attempt.correct,
            wrong: attempt.wrong,
            skipped: attempt.skipped,
            unattempted: attempt.unattempted,
            passingMarks: Number(quiz.passingMarks || 0),
            isPassed: attempt.score >= Number(quiz.passingMarks || 0),
        }
    }

    async getSessionSolution(quizId, sessionId, userId) {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz || quiz.isDeleted || quiz.status !== 'active') {
            throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const questions = await require('../../models/Question.model').find({
            test: quizId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime en hi exam subExams')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        const answersByQuestionId = {}
        for (const ans of (attempt.answers || [])) {
            if (ans && ans.questionId) {
                answersByQuestionId[ans.questionId.toString()] = ans
            }
        }

        const groupedQuestions = {}
        for (const q of questions) {
            const orderKey = String(q.order)
            if (!groupedQuestions[orderKey]) groupedQuestions[orderKey] = { en: {}, hi: {} }

            let langs = []
            if (q.en && (q.en.question?.text || q.en.options?.length)) langs.push('en')
            if (q.hi && (q.hi.question?.text || q.hi.options?.length)) langs.push('hi')
            if (langs.length === 0) {
                langs = q.language === 'both' ? ['en', 'hi'] : [q.language || 'en']
            }

            const userAnswer = answersByQuestionId[q._id.toString()] || null

            for (const lang of langs) {
                if (lang !== 'en' && lang !== 'hi') continue

                const langObj = q[lang] || {}
                const questionData = langObj.question || q.question || {}
                const explanationData = langObj.explanation || q.explanation || {}
                const optionsData = (langObj.options && langObj.options.length > 0) ? langObj.options : (q.options || [])

                const correctIndex = optionsData.findIndex(opt => opt && opt.isCorrect)
                const isAttempted = !!(userAnswer && userAnswer.status !== 'skipped' && userAnswer.selectedOption !== null && userAnswer.selectedOption !== undefined)
                const isCorrect = isAttempted && correctIndex !== -1 ? (userAnswer.selectedOption === correctIndex) : false

                groupedQuestions[orderKey][lang] = {
                    _id: q._id,
                    exam: q.exam || null,
                    subExams: q.subExams || [],
                    question: { text: htmlToPlainText(questionData.text || ''), image: questionData.image || '' },
                    options: optionsData.map((opt) => ({
                        text: htmlToPlainText(opt.text || ''),
                        image: opt.image || '',
                        isCorrect: !!opt.isCorrect,
                    })),
                    explanation: { text: htmlToPlainText(explanationData.text || ''), image: explanationData.image || '' },
                    order: q.order,
                    sortOrder: q.sortOrder,
                    perQuestionTime: q.perQuestionTime,
                    userAnswer: userAnswer ? {
                        selectedOption: userAnswer.selectedOption,
                        status: userAnswer.status,
                        timeTaken: userAnswer.timeTaken,
                    } : null,
                    status: userAnswer?.status || 'unattempted',
                    timeTaken: userAnswer?.timeTaken || 0,
                    isCorrect,
                }
            }
        }

        return Object.values(groupedQuestions)
    }

    async listMyAttempts(userId, query = {}) {
        const filter = {}
        if (query.quizId) filter.quiz = query.quizId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }
}

module.exports = new DailyQuizService()
