const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const { groupQuestionsByLanguage, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const { checkAccess } = require('../../lib/access')
const courseTestRepository = require('./course-test.repository')
const crypto = require('crypto')

class CourseTestService extends BaseService {
    constructor() {
        super(courseTestRepository, 'course-test')
        this.logger = createLogger('course-test:service')
    }

    /**
     * GET /course-tests/:testId/start
     * Returns test instructions, metadata, and questions (grouped by language).
     * Mirrors test-series startTest response shape.
     */
    async startTest(testId, userId, language = 'hi') {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await checkAccess(userId, 'course', test.course)
        if (!hasAccess) throw new AppError('Please purchase this course to access the test', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const groupedQuestions = groupQuestionsByLanguage(questions)

        // Build localized instruction text
        const localizedInstruction =
            test.localizedContent?.[language]?.instructions ||
            test.localizedContent?.en?.instructions ||
            test.instruction ||
            ''

        const localizedTitle =
            test.localizedContent?.[language]?.title ||
            test.localizedContent?.en?.title ||
            test.title ||
            ''

        const localizedDescription =
            test.localizedContent?.[language]?.description ||
            test.localizedContent?.en?.description ||
            test.description ||
            ''

        this.logger.info({ userId, testId, count: questions.length }, 'Starting course test')

        return {
            test: {
                _id: test._id,
                title: localizedTitle,
                description: htmlToPlainText(localizedDescription),
                instruction: htmlToPlainText(localizedInstruction),
                image: test.image,
                duration: test.duration,
                isPerQuestionTime: test.isPerQuestionTime !== false,
                totalQuestions: test.totalQuestions,
                totalMappedQuestions: questions.length,
                totalMarks: test.totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
                marksPerQuestion: test.marksPerQuestion,
                maxAttempts: test.maxAttempts,
                difficulty: test.difficulty,
                language: test.language,
            },
            hasAccess,
            questions: groupedQuestions,
        }
    }

    /**
     * POST /course-tests/:testId/submit
     * Simple (legacy) one-shot submit — no persistent session.
     */
    async submitTest(testId, userId, payload = {}, language = 'hi') {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await checkAccess(userId, 'course', test.course)
        if (!hasAccess) throw new AppError('Please purchase this course to access the test', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, payload.answers, test)

        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0
            ? parseFloat(((correct / totalQuestions) * 100).toFixed(2))
            : 0

        const sessionId = crypto.randomUUID()
        const attempt = await this.repository.createAttempt({
            user: userId,
            course: test.course,
            courseTest: test._id,
            sessionId,
            answers: payload.answers,
            score,
            totalMarks,
            accuracy,
            timeTaken: payload.timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
            status: 'completed',
        })

        this.logger.info({ userId, testId, score, accuracy }, 'Submitted course test')

        return {
            attemptId: attempt._id,
            score,
            totalMarks,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: score >= Number(test.passingMarks || 0),
            accuracy,
            correct,
            wrong,
            skipped,
            unattempted,
        }
    }

    /**
     * GET /course-tests/:testId/start-session
     * Creates a persistent attempt session — returns questions + sessionId.
     */
    async startSession(testId, userId, language = 'hi') {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await checkAccess(userId, 'course', test.course)
        if (!hasAccess) throw new AppError('Please purchase this course to access the test', 403, 'FORBIDDEN')

        const questions = await this.repository.findQuestionsForTest(testId)
        if (!questions.length) throw new AppError('No questions mapped for this test', 400, 'VALIDATION_ERROR')

        const sessionId = crypto.randomUUID()
        const totalQuestions = new Set(questions.map(q => q.order)).size
        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))

        const attempt = await this.repository.createAttempt({
            user: userId,
            course: test.course,
            courseTest: test._id,
            sessionId,
            totalTime: test.duration * 60,
            totalMarks,
            status: 'started',
            answers: []
        })

        const groupedQuestions = groupQuestionsByLanguage(questions)

        // Localized fields
        const localizedInstruction =
            test.localizedContent?.[language]?.instructions ||
            test.localizedContent?.en?.instructions ||
            test.instruction || ''

        const localizedTitle =
            test.localizedContent?.[language]?.title ||
            test.localizedContent?.en?.title ||
            test.title || ''

        this.logger.info({ userId, testId, sessionId }, 'Course test session started')

        return {
            sessionId,
            test: {
                _id: test._id,
                title: localizedTitle,
                instruction: htmlToPlainText(localizedInstruction),
                image: test.image,
                duration: test.duration,
                isPerQuestionTime: test.isPerQuestionTime !== false,
                totalQuestions: test.totalQuestions,
                totalMarks,
                passingMarks: test.passingMarks,
                negativeMarks: test.negativeMarks,
                marksPerQuestion: test.marksPerQuestion,
                difficulty: test.difficulty,
            },
            hasAccess,
            questions: groupedQuestions,
        }
    }

    /**
     * PUT /course-tests/:testId/session/:sessionId/update
     * Update answers incrementally or finalise the session.
     */
    async updateSession(testId, sessionId, userId, payload = {}) {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
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

        const questions = await this.repository.findQuestionsForTest(testId)
        const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, updatedAnswers, test)

        const totalMarks = Number(test.totalMarks || totalQuestions * Number(test.marksPerQuestion || 1))
        const accuracy = totalQuestions > 0
            ? parseFloat(((correct / totalQuestions) * 100).toFixed(2))
            : 0

        const timeTaken = updatedAnswers.reduce((acc, ans) => acc + (ans.timeTaken || 0), 0)
        const status = payload.status || 'ongoing'

        const updatedAttempt = await this.repository.updateAttemptBySession(sessionId, userId, {
            answers: updatedAnswers,
            score,
            totalMarks,
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
            status,
        })

        return {
            attemptId: updatedAttempt._id,
            sessionId,
            status,
            score,
            totalMarks,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: score >= Number(test.passingMarks || 0),
            accuracy,
            timeTaken,
            correct,
            wrong,
            skipped,
            unattempted,
        }
    }

    /**
     * GET /course-tests/:testId/session/:sessionId/analytics
     * Returns result analytics for a completed/ongoing session.
     */
    async getSessionAnalytics(testId, sessionId, userId) {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const { rank, totalParticipants } = await this.repository.getAttemptRank(testId, attempt.score || 0, attempt.timeTaken || 0)

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
            rank,
            totalParticipants,
            passingMarks: Number(test.passingMarks || 0),
            isPassed: attempt.score >= Number(test.passingMarks || 0),
            test: {
                _id: test._id,
                title: test.title,
                duration: test.duration,
                totalQuestions: test.totalQuestions,
                difficulty: test.difficulty,
            }
        }
    }

    /**
     * GET /course-tests/:testId/session/:sessionId/solution
     * Returns questions with correct answers and explanations.
     */
    async getSessionSolution(testId, sessionId, userId) {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const questions = await require('../../models/Question.model').find({
            test: testId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        // Map user answers by question _id for quick lookup
        const answersByQuestionId = {}
        for (const ans of (attempt.answers || [])) {
            answersByQuestionId[ans.questionId.toString()] = ans
        }

        const groupedQuestions = {}
        for (const q of questions) {
            const orderKey = String(q.order)
            if (!groupedQuestions[orderKey]) groupedQuestions[orderKey] = { en: {}, hi: {} }
            const langs = q.language === 'both' ? ['en', 'hi'] : [q.language]

            const correctIndex = (q.options || []).findIndex(opt => opt.isCorrect)
            const userAnswer = answersByQuestionId[q._id.toString()] || null
            const isCorrect = userAnswer ? userAnswer.selectedOption === correctIndex : null

            for (const lang of langs) {
                if (lang !== 'en' && lang !== 'hi') continue
                groupedQuestions[orderKey][lang] = {
                    _id: q._id,
                    question: { text: htmlToPlainText(q.question?.text), image: q.question?.image },
                    options: (q.options || []).map(opt => ({
                        text: htmlToPlainText(opt.text),
                        image: opt.image,
                        isCorrect: opt.isCorrect,
                    })),
                    explanation: { text: htmlToPlainText(q.explanation?.text), image: q.explanation?.image },
                    order: q.order,
                    sortOrder: q.sortOrder,
                    perQuestionTime: q.perQuestionTime,
                    userAnswer: userAnswer ? {
                        selectedOption: userAnswer.selectedOption,
                        status: userAnswer.status,
                        timeTaken: userAnswer.timeTaken,
                    } : null,
                    isCorrect,
                }
            }
        }

        return Object.values(groupedQuestions)
    }

    /**
     * GET /course-tests/attempts
     * List the logged-in user's past attempts.
     */
    async listMyAttempts(userId, query = {}) {
        const filter = {}
        if (query.courseId) filter.course = query.courseId
        if (query.testId) filter.courseTest = query.testId

        return this.repository.listAttemptsByUser(userId, filter, {
            page: query.page,
            limit: query.limit,
        })
    }
}

module.exports = new CourseTestService()
