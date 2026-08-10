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

        console.log("test check===============>", test);
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
                instructionsNew: test.instructionsNew
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

        console.log("test check===============>", test);
        console.log("groupedQuestions =============>", groupedQuestions);
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
                instructionsNew: test.instructionsNew
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
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        // Fetch the absolute latest attempt for this test and user
        const attempt = await require('../../models/CourseTestAttempt.model').findOne({ test: testId, user: userId }).sort({ attemptedAt: -1 })
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        const { rank, totalParticipants } = await this.repository.getAttemptRank(testId, attempt.score || 0, attempt.timeTaken || 0)

        const questions = await this.repository.findQuestionsForTest(testId)
        const userAnswers = attempt.answers || []

        const sectionWise = new Map()
        const topicWise = new Map()

        // Initialize question mapping
        const marksPerQuestion = Number(test.marksPerQuestion || 1)
        const negativeMarks = Number(test.negativeMarks || 0)

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

        const percentile = totalParticipants > 1
            ? parseFloat((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(2))
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
                rank,
                accuracy: attempt.accuracy,
                percentile,
                attempted: attempt.correct + attempt.wrong,
                totalQuestions: test.totalQuestions,
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
            passingMarks: Number(test.passingMarks || 0),
            isPassed: attempt.score >= Number(test.passingMarks || 0),
        }
    }

    /**
     * GET /course-tests/:testId/session/:sessionId/solution
     * Returns questions with correct answers and explanations.
     */
    async getSessionSolution(testId, sessionId, userId) {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || test.status !== 'active') {
            throw new AppError('Test not found', 404, 'NOT_FOUND')
        }

        const attempt = await this.repository.getAttemptBySession(sessionId, userId)
        if (!attempt) {
            throw new AppError('Session not found', 404, 'NOT_FOUND')
        }

        // Fetch questions with explanations
        const questions = await require('../../models/Question.model').find({
            test: testId,
            isDeleted: false,
            status: 'active',
        })
            .select('language question options.text options.image options.isCorrect explanation order sortOrder perQuestionTime en hi')
            .sort({ sortOrder: 1, order: 1, createdAt: 1 })
            .lean()

        // Map user answers by questionId for quick lookup
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

            // Determine available languages
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

    /**
     * GET /course-tests/:testId/instruction
     * Returns test instructions and basic details without questions.
     */
    async getInstruction(testId, userId, language = 'hi') {
        const test = await this.repository.getCourseTestById(testId)
        if (!test || test.isDeleted || !['active'].includes(test.status)) {
            throw new AppError('Course test not found', 404, 'NOT_FOUND')
        }

        const hasAccess = await checkAccess(userId, 'course', test.course)
        if (!hasAccess) throw new AppError('Please purchase this course to access the test', 403, 'FORBIDDEN')

        const localizedInstruction =
            test.localizedContent?.[language]?.instructions ||
            test.localizedContent?.en?.instructions ||
            test.instruction ||
            ''

        return {
            _id: test._id,
            title: test.title,
            slug: test.slug,
            description: test.description,
            duration: test.duration,
            totalQuestions: test.totalQuestions,
            totalMarks: test.totalMarks,
            passingMarks: test.passingMarks,
            marksPerQuestion: test.marksPerQuestion,
            negativeMarks: test.negativeMarks,
            maxAttempts: test.maxAttempts,
            difficulty: test.difficulty,
            language: test.language,
            instruction: localizedInstruction,
            instructionsNew: test.instructionsNew
        }
    }
}

module.exports = new CourseTestService()
