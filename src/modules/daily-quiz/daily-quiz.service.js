const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')
const User = require('../../models/User.model')
const crypto = require('crypto')
const { groupQuestionsByLanguage, groupQuestionsBySubject, scoreAnswers } = require('../../lib/testQuestions')
const { htmlToPlainText } = require('../../lib/htmlText')
const dailyQuizRepository = require('./daily-quiz.repository')

const withResolvedSyllabus = (doc) => {
    if (!doc) return doc
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const chapterNameById = new Map()
    const topicNameById = new Map()

    const subjectList = Array.isArray(obj.subjectIds) ? obj.subjectIds : []
    for (const subject of subjectList) {
        if (subject && Array.isArray(subject.chapters)) {
            for (const chapter of subject.chapters) {
                if (chapter && chapter._id) {
                    chapterNameById.set(String(chapter._id), chapter.name)
                }
                if (chapter && Array.isArray(chapter.topics)) {
                    for (const topic of chapter.topics) {
                        if (topic && topic._id) {
                            topicNameById.set(String(topic._id), topic.name)
                        }
                    }
                }
            }
        }
    }

    obj.chapterIds = (Array.isArray(obj.chapterIds) ? obj.chapterIds : []).map((id) => {
        const name = chapterNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            chapterName: name,
        }
    })

    obj.topicIds = (Array.isArray(obj.topicIds) ? obj.topicIds : []).map((id) => {
        const name = topicNameById.get(String(id)) || null
        return {
            _id: id,
            name: name,
            topicName: name,
        }
    })

    obj.subjectIds = subjectList.map((subject) => {
        if (subject && typeof subject === 'object' && subject._id) {
            return {
                _id: subject._id,
                name: subject.name || null,
            }
        }
        return { _id: subject, name: null }
    })

    return obj
}

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
        if (examId) {
            filter.exam = examId
        }

        if (subExamIds.length) {
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
            sort: { createdAt: -1 },
            populate: [
                { path: 'exam', select: 'name' },
                { path: 'subExams', select: 'name' },
                { path: 'subjectIds', select: 'name chapters' }
            ]
        })

        const Question = require('../../models/Question.model')
        const DailyQuizAttempt = require('../../models/DailyQuizAttempt.model')

        const processedData = await Promise.all(quizzesResult.data.map(async (item) => {
            const id = item._id.toString()
            const questionCount = await Question.countDocuments({ test: id, isDeleted: false })
            const completedAttempt = await DailyQuizAttempt.findOne({ quiz: id, user: userId, status: 'completed' })
                .select('score totalMarks status attemptedAt sessionId')
                .sort({ attemptedAt: -1 })
                .lean()

            const latestAttempt = await DailyQuizAttempt.findOne({ quiz: id, user: userId })
                .select('sessionId status')
                .sort({ attemptedAt: -1 })
                .lean()

            const resolved = withResolvedSyllabus(item)
            delete resolved.description
            delete resolved.instructions
            delete resolved.instructionsNew
            delete resolved.thumbnail
            delete resolved.localizedContent

            return {
                ...resolved,
                mappedQuestions: questionCount,
                attemptStatus: completedAttempt ? 'attempted' : 'not_attempted',
                latestAttempt: completedAttempt || null,
                sessionId: latestAttempt?.sessionId || null,
            }
        }))

        return {
            data: processedData,
            pagination: quizzesResult.pagination
        }
    }

    async getQuizInstructions(quizId, _userId) {
        const quiz = await this.repository.getQuizById(quizId)
        if (!quiz) throw new AppError('Daily quiz not found', 404, 'NOT_FOUND')

        return {
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

        
        const questions = await this.repository.findQuestionsForQuiz(quizId)
        const userAnswers = attempt.answers || []

const sectionWise = new Map()
        const topicWise = new Map()

        // Initialize question mapping
        const marksPerQuestion = Number(quiz.marksPerQuestion || 1)
        const negativeMarks = Number(quiz.negativeMarks || 0)

        // Only process unique logical questions (by order)
        const processedOrders = new Set()

        for (const q of questions) {
            if (processedOrders.has(q.order)) continue
            processedOrders.add(q.order)

            // Calculate Marks logic for this logical question first
            const siblingQuestionIds = questions.filter(sq => sq.order === q.order).map(sq => String(sq._id))
            const ans = userAnswers.find(a => siblingQuestionIds.includes(String(a.questionId)))

            let isAttempted = false
            let isCorrect = false
            let marksObtained = 0

            if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
                isAttempted = true

                // Which specific question ID was answered?
                const answeredQ = questions.find(sq => String(sq._id) === String(ans.questionId))
                let correctIndex = -1
                if (answeredQ) {
                    if (answeredQ.en?.options) correctIndex = answeredQ.en.options.findIndex(opt => opt.isCorrect)
                    if (correctIndex === -1 && answeredQ.hi?.options) correctIndex = answeredQ.hi.options.findIndex(opt => opt.isCorrect)
                }

                if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
                    isCorrect = true
                    marksObtained = marksPerQuestion
                } else {
                    marksObtained = -negativeMarks
                }
            }

            const subjectsToProcess = q.subjectId ? [q.subjectId] : [null];
            const chaptersToProcess = q.chapterId ? [q.chapterId] : ['uncategorized'];
            const topicsToProcess = q.topicId ? [q.topicId] : ['uncategorized'];

            const subj = subjectsToProcess[0];
            const chapId = String(chaptersToProcess[0]);
            const topId = String(topicsToProcess[0]);

            let groupId = null;
            let groupType = null;
            let groupName = 'Uncategorized';

            if (subj && subj.chapters && chapId !== 'uncategorized') {
                const foundChapter = subj.chapters.find((c) => String(c._id) === chapId);
                if (foundChapter) {
                    if (topId !== 'uncategorized' && foundChapter.topics) {
                        const foundTopic = foundChapter.topics.find((t) => String(t._id) === topId);
                        if (foundTopic) {
                            groupId = topId;
                            groupType = 'topic';
                            groupName = foundTopic.name;
                        }
                    }
                    if (!groupId) {
                        groupId = chapId;
                        groupType = 'chapter';
                        groupName = foundChapter.name;
                    }
                }
            }

            if (groupId) {
                if (!topicWise.has(groupId)) {
                    topicWise.set(groupId, {
                        id: groupId,
                        type: groupType,
                        name: groupName,
                        totalQuestions: 0,
                        attempted: 0,
                        correct: 0,
                        wrong: 0,
                        skipped: 0,
                        unattempted: 0,
                    });
                }
                const twStats = topicWise.get(groupId);
                twStats.totalQuestions++;
                if (isAttempted) {
                    twStats.attempted++;
                    if (isCorrect) twStats.correct++;
                    else twStats.wrong++;
                } else if (ans && ans.status === 'skipped') {
                    twStats.skipped++;
                } else {
                    twStats.unattempted++;
                }
            }

            for (const subj of subjectsToProcess) {
                const subjectId = subj?._id ? String(subj._id) : (subj ? String(subj) : 'uncategorized');
                const subjectName = subj?.name || 'Uncategorized';

                if (!sectionWise.has(subjectId)) {
                    sectionWise.set(subjectId, {
                        subject: { _id: subjectId === 'uncategorized' ? null : subjectId, name: subjectName },
                        score: 0,
                        totalMarks: 0,
                        attempted: 0,
                        totalQuestions: 0,
                        correct: 0,
                        wrong: 0,
                        skipped: 0,
                        unattempted: 0,
                        chapters: new Map()
                    })
                }
                const sec = sectionWise.get(subjectId)
                sec.totalQuestions++
                sec.totalMarks += marksPerQuestion
                if (isAttempted) {
                    sec.attempted++
                    if (isCorrect) sec.correct++
                    else sec.wrong++
                    sec.score += marksObtained
                } else if (ans && ans.status === 'skipped') {
                    sec.skipped++
                } else {
                    sec.unattempted++
                }

                for (const chap of chaptersToProcess) {
                    const chapterId = String(chap);
                    let chapterName = 'Uncategorized';
                    if (subj && subj.chapters && chapterId !== 'uncategorized') {
                        const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
                        if (foundChapter) chapterName = foundChapter.name;
                    }

                    if (!sec.chapters.has(chapterId)) {
                        sec.chapters.set(chapterId, {
                            chapter: { _id: chapterId === 'uncategorized' ? null : chapterId, name: chapterName },
                            score: 0,
                            totalMarks: 0,
                            attempted: 0,
                            totalQuestions: 0,
                            correct: 0,
                            wrong: 0,
                            skipped: 0,
                            unattempted: 0,
                            topics: new Map()
                        })
                    }
                    const chapStats = sec.chapters.get(chapterId)
                    chapStats.totalQuestions++
                    chapStats.totalMarks += marksPerQuestion
                    if (isAttempted) {
                        chapStats.attempted++
                        if (isCorrect) chapStats.correct++
                        else chapStats.wrong++
                        chapStats.score += marksObtained
                    } else if (ans && ans.status === 'skipped') {
                        chapStats.skipped++
                    } else {
                        chapStats.unattempted++
                    }

                    for (const top of topicsToProcess) {
                        const topicId = String(top);
                        let topicName = 'Uncategorized';
                        if (subj && subj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
                            const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
                            if (foundChapter && foundChapter.topics) {
                                const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId);
                                if (foundTopic) topicName = foundTopic.name;
                            }
                        }

                        if (!chapStats.topics.has(topicId)) {
                            chapStats.topics.set(topicId, {
                                topic: { _id: topicId === 'uncategorized' ? null : topicId, name: topicName },
                                score: 0,
                                totalMarks: 0,
                                attempted: 0,
                                totalQuestions: 0,
                                correct: 0,
                                wrong: 0,
                                skipped: 0,
                                unattempted: 0,
                            })
                        }
                        const topStats = chapStats.topics.get(topicId)
                        topStats.totalQuestions++
                        topStats.totalMarks += marksPerQuestion
                        if (isAttempted) {
                            topStats.attempted++
                            if (isCorrect) topStats.correct++
                            else topStats.wrong++
                            topStats.score += marksObtained
                        } else if (ans && ans.status === 'skipped') {
                            topStats.skipped++
                        } else {
                            topStats.unattempted++
                        }
                    }
                }
            }
        }

        const sectionWisePerformance = Array.from(sectionWise.values()).map(sec => ({
            subject: sec.subject,
            score: sec.score,
            totalMarks: sec.totalMarks,
            attempted: sec.attempted,
            totalQuestions: sec.totalQuestions,
            correct: sec.correct,
            wrong: sec.wrong,
            skipped: sec.skipped,
            unattempted: sec.unattempted,
            accuracy: sec.attempted > 0 ? parseFloat(((sec.correct / sec.attempted) * 100).toFixed(2)) : 0,
            chapters: Array.from(sec.chapters.values()).map(chap => {
                const hasRealTopics = Array.from(chap.topics.values()).some(t => t.topic._id !== null);
                return {
                    chapter: chap.chapter,
                    score: chap.score,
                    totalMarks: chap.totalMarks,
                    attempted: chap.attempted,
                    totalQuestions: chap.totalQuestions,
                    correct: chap.correct,
                    wrong: chap.wrong,
                    skipped: chap.skipped,
                    unattempted: chap.unattempted,
                    ...(hasRealTopics ? {} : { isWeak: chap.totalQuestions > 0 ? (chap.correct / chap.totalQuestions) < 0.5 : false }),
                    percentage: chap.totalMarks > 0 ? parseFloat(((Math.max(0, chap.score) / chap.totalMarks) * 100).toFixed(2)) : 0,
                    topics: Array.from(chap.topics.values()).map(top => ({
                        topic: top.topic,
                        score: top.score,
                        totalMarks: top.totalMarks,
                        attempted: top.attempted,
                        totalQuestions: top.totalQuestions,
                        correct: top.correct,
                        wrong: top.wrong,
                        skipped: top.skipped,
                        unattempted: top.unattempted,
                        isWeak: top.totalQuestions > 0 ? (top.correct / top.totalQuestions) < 0.5 : false,
                        percentage: top.totalMarks > 0 ? parseFloat(((Math.max(0, top.score) / top.totalMarks) * 100).toFixed(2)) : 0
                    }))
                };
            })
        }))

        const percentile = 0 > 1
            ? parseFloat((((totalParticipants - 1) / (totalParticipants - 1)) * 100).toFixed(2))
            : 100.0;

        let expertComment = "Keep practicing!";
        if (percentile >= 90) expertComment = "Excellent Work! You have high chances of getting selected.";
        else if (percentile >= 75) expertComment = "Well Done! Good performance.";

        const topicAnalytics = Array.from(topicWise.values()).map(tw => ({
            id: tw.id,
            type: tw.type,
            name: tw.name,
            totalQuestions: tw.totalQuestions,
            attempted: tw.attempted,
            correct: tw.correct,
            wrong: tw.wrong,
            skipped: tw.skipped,
            unattempted: tw.unattempted,
            accuracy: tw.attempted > 0 ? parseFloat(((tw.correct / tw.attempted) * 100).toFixed(2)) : 0,
            isWeak: tw.totalQuestions > 0 ? (tw.correct / tw.totalQuestions) < 0.5 : false
        }))

        return {
            expertComment,
            overallPerformance: {
                score: attempt.score,
                totalMarks: attempt.totalMarks,
                accuracy: attempt.accuracy,
                percentile,
                attempted: attempt.correct + attempt.wrong,
                totalQuestions: quiz.totalQuestions,
                timeSpent: attempt.timeTaken ? parseFloat((attempt.timeTaken / 60).toFixed(2)) : 0
            },
            sectionWisePerformance,
            topicAnalytics,
            // Keeping backwards compatibility
            sessionId: attempt.sessionId,
            status: attempt.status,
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
