const BaseService = require('../../core/BaseService')
const aiTestRepository = require('./ai-test.repository')
const SubjectModel = require('../../models/Subject.model')
const QuestionModel = require('../../models/Question.model')
const mongoose = require('mongoose')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class AiTestService extends BaseService {
  constructor() {
    super(aiTestRepository, 'ai-test')
    this.logger = createLogger('ai-test:service')
  }

  async getSubjects(user, query = {}) {
    this.logger.info({ userId: user._id, query }, 'Retrieving syllabus subjects')
    const filter = { isDeleted: false, status: 'active' }

    const examId = query.examId || (user.exam && user.exam._id)
    if (examId) {
      filter.$or = [
        { examIds: examId },
        { subExamIds: examId }
      ]
    }

    let subjects = await this.repository.getActiveSubjects(filter)

    // Fallback if filtering by exam returned no subjects
    if ((!subjects || subjects.length === 0) && examId) {
      this.logger.warn({ examId }, 'No active subjects found for exam filter; falling back to all active subjects')
      subjects = await this.repository.getActiveSubjects({})
    }

    return (subjects || []).map(subj => ({
      _id: subj._id,
      name: subj.name,
      sortOrder: subj.sortOrder,
    }))
  }

  async getChapters(subjectId, user) {
    this.logger.info({ subjectId, userId: user._id }, 'Retrieving chapters for subject')
    const subject = await SubjectModel.findOne({ _id: subjectId, isDeleted: false, status: 'active' }).lean()
    if (!subject) {
      throw new AppError('Subject not found', 404, 'NOT_FOUND')
    }

    const chapters = subject.chapters || []
    return chapters.map(c => ({
      _id: c._id,
      name: c.name,
      sortOrder: c.sortOrder || 0
    })).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getTopics(subjectId, chapterId, user) {
    this.logger.info({ subjectId, chapterId, userId: user._id }, 'Retrieving topics for chapter')
    const subject = await SubjectModel.findOne({ _id: subjectId, isDeleted: false, status: 'active' }).lean()
    if (!subject) {
      throw new AppError('Subject not found', 404, 'NOT_FOUND')
    }

    const chapters = subject.chapters || []
    const chapter = chapters.find(c => c._id.toString() === chapterId.toString())
    if (!chapter) {
      throw new AppError('Chapter not found', 404, 'NOT_FOUND')
    }

    const topics = chapter.topics || []
    return topics.map(t => ({
      _id: t._id,
      name: t.name,
      sortOrder: t.sortOrder || 0
    })).sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async generateAiTest(userId, payload) {
    const { name, subjectIds, chapterIds, topicIds, totalQuestions, duration } = payload
    this.logger.info({ userId, subjectIds, totalQuestions }, 'Generating AI Test')

    const subjects = await SubjectModel.find({ _id: { $in: subjectIds }, isDeleted: false }).lean()
    if (!subjects || subjects.length === 0) {
      throw new AppError('None of the selected subjects were found', 400, 'VALIDATION_ERROR')
    }

    const orConditions = []
    const topicIdStrings = (topicIds || []).map(String)
    const chapterIdStrings = (chapterIds || []).map(String)

    for (const subj of subjects) {
      const subjChapters = subj.chapters || []

      // Find which of the passed chapterIds belong to this subject
      const matchedChapterIds = subjChapters
        .filter(c => chapterIdStrings.includes(c._id.toString()))
        .map(c => c._id.toString())

      // Find which of the passed topicIds belong to chapters of this subject
      const matchedTopicIds = []
      for (const ch of subjChapters) {
        const chTopics = ch.topics || []
        const matched = chTopics
          .filter(t => topicIdStrings.includes(t._id.toString()))
          .map(t => t._id.toString())
        matchedTopicIds.push(...matched)
      }

      if (matchedTopicIds.length > 0) {
        orConditions.push({
          subjectId: subj._id,
          topicId: { $in: matchedTopicIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
      } else if (matchedChapterIds.length > 0) {
        orConditions.push({
          subjectId: subj._id,
          chapterId: { $in: matchedChapterIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
      } else {
        orConditions.push({
          subjectId: subj._id
        })
      }
    }

    const query = { isDeleted: false, status: 'active' }
    if (orConditions.length > 0) {
      query.$or = orConditions
    } else {
      query.subjectId = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) }
    }

    const totalMatchingQuestions = await QuestionModel.countDocuments(query)
    if (totalMatchingQuestions === 0) {
      throw new AppError('No questions found matching the selected criteria. Please select different subjects, chapters, or topics.', 404, 'NOT_FOUND')
    }

    const resolvedName = name || `AI Test - ${subjects.map(s => s.name).join(', ')} (${new Date().toLocaleDateString()})`

    const aiTest = await this.repository.create({
      user: userId,
      name: resolvedName,
      subjects: subjectIds,
      chapters: chapterIds,
      topics: topicIds,
      duration: Number(duration),
      totalQuestions: Number(totalQuestions),
    })

    const matchedChapters = []
    const matchedTopics = []

    for (const subj of subjects) {
      const subjChapters = subj.chapters || []
      for (const ch of subjChapters) {
        if (chapterIdStrings.includes(ch._id.toString())) {
          matchedChapters.push({
            _id: ch._id,
            name: ch.name
          })
        }
        const chTopics = ch.topics || []
        for (const t of chTopics) {
          if (topicIdStrings.includes(t._id.toString())) {
            matchedTopics.push({
              _id: t._id,
              name: t.name
            })
          }
        }
      }
    }

    return {
      _id: aiTest._id,
      name: aiTest.name,
      duration: aiTest.duration,
      totalQuestions: aiTest.totalQuestions,
      subjects: subjects.map(s => ({ _id: s._id, name: s.name })),
      chapters: matchedChapters,
      topics: matchedTopics,
      createdAt: aiTest.createdAt,
    }
  }

  async _buildQuestionQuery(aiTest) {
    const subjectIds = aiTest.subjects || []
    const chapterIds = aiTest.chapters || []
    const topicIds = aiTest.topics || []

    const subjects = await SubjectModel.find({ _id: { $in: subjectIds }, isDeleted: false }).lean()
    const orConditions = []
    const topicIdStrings = topicIds.map(String)
    const chapterIdStrings = chapterIds.map(String)

    for (const subj of subjects) {
      const subjChapters = subj.chapters || []
      const matchedChapterIds = subjChapters
        .filter(c => chapterIdStrings.includes(c._id.toString()))
        .map(c => c._id.toString())

      const matchedTopicIds = []
      for (const ch of subjChapters) {
        const chTopics = ch.topics || []
        const matched = chTopics
          .filter(t => topicIdStrings.includes(t._id.toString()))
          .map(t => t._id.toString())
        matchedTopicIds.push(...matched)
      }

      if (matchedTopicIds.length > 0) {
        orConditions.push({
          subjectId: subj._id,
          topicId: { $in: matchedTopicIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
      } else if (matchedChapterIds.length > 0) {
        orConditions.push({
          subjectId: subj._id,
          chapterId: { $in: matchedChapterIds.map(id => new mongoose.Types.ObjectId(id)) }
        })
      } else {
        orConditions.push({
          subjectId: subj._id
        })
      }
    }

    const query = { isDeleted: false, status: 'active' }
    if (orConditions.length > 0) {
      query.$or = orConditions
    } else {
      query.subjectId = { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) }
    }

    return query
  }

  async getQuestions(testId, userId) {
    this.logger.info({ testId, userId }, 'Fetching questions for AI Test')
    const aiTest = await this.getById(testId)
    if (!aiTest || aiTest.isDeleted) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    if (aiTest.user.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403, 'FORBIDDEN')
    }

    const query = await this._buildQuestionQuery(aiTest)
    const totalQuestions = aiTest.totalQuestions || 10
    const questions = await QuestionModel.find(query).limit(Number(totalQuestions)).lean()

    const { sanitizeQuestion } = require('../../lib/testQuestions')
    const groupedQuestions = {}

    for (const q of questions) {
      const idStr = q._id.toString()
      const enSanitized = sanitizeQuestion(q, 'en')
      const hiSanitized = sanitizeQuestion(q, 'hi')

      enSanitized.subjectId = q.subjectId || null
      enSanitized.chapterId = q.chapterId || null
      enSanitized.topicId = q.topicId || null

      hiSanitized.subjectId = q.subjectId || null
      hiSanitized.chapterId = q.chapterId || null
      hiSanitized.topicId = q.topicId || null

      groupedQuestions[idStr] = {
        en: enSanitized,
        hi: hiSanitized,
        subjectId: q.subjectId || null,
        chapterId: q.chapterId || null,
        topicId: q.topicId || null,
      }
    }

    return {
      test: {
        _id: aiTest._id,
        name: aiTest.name,
        duration: aiTest.duration,
        totalQuestions: aiTest.totalQuestions,
        questionsFound: questions.length,
      },
      questions: groupedQuestions
    }
  }

  async startSession(testId, userId) {
    this.logger.info({ testId, userId }, 'Starting attempt session for AI Test')
    const aiTest = await this.getById(testId)
    if (!aiTest || aiTest.isDeleted) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    if (aiTest.user.toString() !== userId.toString()) {
      throw new AppError('Access denied', 403, 'FORBIDDEN')
    }

    const query = await this._buildQuestionQuery(aiTest)
    const totalQuestions = aiTest.totalQuestions || 10
    const questions = await QuestionModel.find(query).limit(Number(totalQuestions)).lean()

    if (!questions.length) {
      throw new AppError('No questions found for this test', 400, 'VALIDATION_ERROR')
    }

    const sessionId = require('crypto').randomUUID()
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0)

    await this.repository.createAttempt({
      user: userId,
      aiTest: aiTest._id,
      sessionId,
      totalMarks,
      status: 'started',
      answers: []
    })

    const { sanitizeQuestion } = require('../../lib/testQuestions')
    const groupedQuestions = {}

    for (const q of questions) {
      const idStr = q._id.toString()
      const enSanitized = sanitizeQuestion(q, 'en')
      const hiSanitized = sanitizeQuestion(q, 'hi')

      enSanitized.subjectId = q.subjectId || null
      enSanitized.chapterId = q.chapterId || null
      enSanitized.topicId = q.topicId || null

      hiSanitized.subjectId = q.subjectId || null
      hiSanitized.chapterId = q.chapterId || null
      hiSanitized.topicId = q.topicId || null

      groupedQuestions[idStr] = {
        en: enSanitized,
        hi: hiSanitized,
        subjectId: q.subjectId || null,
        chapterId: q.chapterId || null,
        topicId: q.topicId || null,
      }
    }

    return {
      sessionId,
      test: {
        _id: aiTest._id,
        name: aiTest.name,
        duration: aiTest.duration,
        totalQuestions: aiTest.totalQuestions,
        totalQuestionsFound: questions.length,
        questionsFound: questions.length,
      },
      questions: groupedQuestions
    }
  }

  async updateSession(testId, sessionId, userId, payload = {}) {
    this.logger.info({ testId, sessionId, userId }, 'Updating attempt session for AI Test')
    const aiTest = await this.getById(testId)
    if (!aiTest || aiTest.isDeleted) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    const attempt = await this.repository.getAttemptBySession(sessionId, userId)
    if (!attempt) {
      throw new AppError('Session not found', 404, 'NOT_FOUND')
    }

    if (attempt.status === 'completed' || attempt.status === 'abandoned') {
      throw new AppError('Session already finalized', 400, 'VALIDATION_ERROR')
    }

    const updatedAnswers = attempt.answers || []

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

    const query = await this._buildQuestionQuery(aiTest)
    const totalQuestionsLimit = aiTest.totalQuestions || 10
    const questions = await QuestionModel.find(query).limit(Number(totalQuestionsLimit)).lean()

    const { scoreAnswers } = require('../../lib/testQuestions')
    const mockTestObj = {
      marksPerQuestion: 1,
      negativeMarks: 0,
    }

    const { score, correct, wrong, skipped, unattempted, totalQuestions } = scoreAnswers(questions, updatedAnswers, mockTestObj)
    const totalMarks = questions.reduce((acc, q) => acc + (q.marks || 1), 0)
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
      accuracy,
      timeTaken,
      correct,
      wrong,
      skipped,
      unattempted,
      totalQuestions,
    }
  }

  async getSessionAnalytics(testId, sessionId, userId) {
    this.logger.info({ testId, sessionId, userId }, 'Retrieving analytics for AI Test attempt')
    const attempt = await this.repository.getAttemptBySession(sessionId, userId)
    if (!attempt) {
      throw new AppError('Attempt session not found', 404, 'NOT_FOUND')
    }

    const aiTest = await this.getById(attempt.aiTest)
    const totalQuestions = aiTest ? aiTest.totalQuestions : 0

    return {
      attemptId: attempt._id,
      sessionId: attempt.sessionId,
      status: attempt.status,
      score: attempt.score,
      accuracy: attempt.accuracy,
      timeTaken: attempt.timeTaken,
      correct: attempt.correct,
      wrong: attempt.wrong,
      skipped: attempt.skipped,
      unattempted: attempt.unattempted,
      totalQuestions,
      attemptedAt: attempt.attemptedAt,
    }
  }
}

module.exports = new AiTestService()
