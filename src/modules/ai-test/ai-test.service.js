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
    const questions = await QuestionModel.find(query)
      .limit(Number(totalQuestions))
      .populate('subjectId', 'name chapters')
      .lean()

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

    const { groupQuestionsBySubject } = require('../../lib/testQuestions')
    const groupedQuestions = groupQuestionsBySubject(questions)

    // Map questions to include subject, chapter, and topic details
    const questionInfoMap = new Map(
      questions.map(q => [
        q._id.toString(),
        {
          subjectId: q.subjectId?._id || q.subjectId || null,
          chapterId: q.chapterId || null,
          topicId: q.topicId || null
        }
      ])
    )

    for (const group of groupedQuestions) {
      for (const questionId of Object.keys(group.questions)) {
        const info = questionInfoMap.get(questionId)
        if (info) {
          group.questions[questionId].subjectId = info.subjectId
          group.questions[questionId].chapterId = info.chapterId
          group.questions[questionId].topicId = info.topicId
        }
      }
    }

    return {
      sessionId,
      test: {
        _id: aiTest._id,
        name: aiTest.name,
        duration: aiTest.duration,
        totalQuestions: aiTest.totalQuestions,
        questionsFound: questions.length,
      },
      questionsBySubject: groupedQuestions
    }
  }

  async updateSession(testId, sessionId, userId, payload = {}) {
    console.log("AI Test updateSession payload:", payload)
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
    const status = payload.status || 'ongoing'
    let timeTaken = payload.timeTaken !== undefined ? payload.timeTaken : updatedAnswers.reduce((acc, ans) => acc + (ans.timeTaken || 0), 0)
    if (timeTaken === 0 && status === 'completed') {
      const elapsed = Math.round((new Date() - new Date(attempt.createdAt)) / 1000)
      if (elapsed > 0) {
        timeTaken = elapsed
      }
    }

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
      try {
        const rewardsService = require('../rewards/rewards.service')
        await rewardsService.logActivity(userId, 'ai_test')
      } catch (err) {
        this.logger.error({ err }, 'Failed to log daily activity for ai_test')
      }
    }

    await attempt.save()

    return {
      attemptId: attempt._id,
      sessionId,
      status,
      score: 0,
      accuracy,
      timeTaken,
      correct,
      wrong,
      skipped,
      unattempted,
      totalQuestions: 0,
    }
  }

  async getSessionAnalytics(testId, sessionId, userId) {
    this.logger.info({ testId, sessionId, userId }, 'Retrieving analytics for AI Test attempt')
    const attempt = await this.repository.getAttemptBySession(sessionId, userId)
    if (!attempt) {
      throw new AppError('Attempt session not found', 404, 'NOT_FOUND')
    }

    const aiTest = await this.getById(attempt.aiTest)
    if (!aiTest) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    // Calculate Rank
    const AiTestAttempt = require('../../models/AiTestAttempt.model')
    const totalParticipants = await AiTestAttempt.countDocuments({ aiTest: aiTest._id, status: 'completed' })
    const betterAttempts = await AiTestAttempt.countDocuments({
      aiTest: aiTest._id,
      status: 'completed',
      $or: [
        { score: { $gt: attempt.score || 0 } },
        { score: attempt.score || 0, timeTaken: { $lt: attempt.timeTaken || 0 } }
      ]
    })
    const rank = betterAttempts + 1

    const percentile = totalParticipants > 1
      ? parseFloat((((totalParticipants - rank) / (totalParticipants - 1)) * 100).toFixed(2))
      : 100.0

    // Fetch questions to build metrics
    const query = await this._buildQuestionQuery(aiTest)
    const totalQuestionsLimit = aiTest.totalQuestions || 10
    const questions = await QuestionModel.find(query)
      .limit(Number(totalQuestionsLimit))
      .populate('subjectId', 'name chapters')
      .lean()

    const userAnswers = attempt.answers || []
    const sectionWise = new Map()
    const topicWise = new Map()

    const marksPerQuestion = 1
    const negativeMarks = 0

    const { htmlToPlainText } = require('../../lib/htmlText')

    for (const q of questions) {
      const ans = userAnswers.find(a => String(a.questionId) === String(q._id))

      let isAttempted = false
      let isCorrect = false
      let marksObtained = 0

      if (ans && ans.status !== 'skipped' && ans.selectedOption !== null && ans.selectedOption !== undefined) {
        isAttempted = true

        let correctIndex = -1
        if (q.en?.options) correctIndex = q.en.options.findIndex(opt => opt.isCorrect)
        if (correctIndex === -1 && q.hi?.options) correctIndex = q.hi.options.findIndex(opt => opt.isCorrect)
        if (correctIndex === -1 && q.options) correctIndex = q.options.findIndex(opt => opt.isCorrect)

        if (correctIndex !== -1 && ans.selectedOption === correctIndex) {
          isCorrect = true
          marksObtained = marksPerQuestion
        } else {
          marksObtained = -negativeMarks
        }
      }

      const subjectsToProcess = q.subjectId ? [q.subjectId] : [null]
      const chaptersToProcess = q.chapterId ? [q.chapterId] : ['uncategorized']
      const topicsToProcess = q.topicId ? [q.topicId] : ['uncategorized']

      const subj = subjectsToProcess[0]
      const chapId = String(chaptersToProcess[0])
      const topId = String(topicsToProcess[0])

      let groupId = null
      let groupType = null
      let groupName = 'Uncategorized'

      if (subj && subj.chapters && chapId !== 'uncategorized') {
        const foundChapter = subj.chapters.find((c) => String(c._id) === chapId)
        if (foundChapter) {
          if (topId !== 'uncategorized' && foundChapter.topics) {
            const foundTopic = foundChapter.topics.find((t) => String(t._id) === topId)
            if (foundTopic) {
              groupId = topId
              groupType = 'topic'
              groupName = foundTopic.name
            }
          }
          if (!groupId) {
            groupId = chapId
            groupType = 'chapter'
            groupName = foundChapter.name
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
          })
        }
        const twStats = topicWise.get(groupId)
        twStats.totalQuestions++
        if (isAttempted) {
          twStats.attempted++
          if (isCorrect) twStats.correct++
          else twStats.wrong++
        } else if (ans && ans.status === 'skipped') {
          twStats.skipped++
        } else {
          twStats.unattempted++
        }
      }

      for (const subj of subjectsToProcess) {
        const subjectId = subj?._id ? String(subj._id) : (subj ? String(subj) : 'uncategorized')
        const subjectName = subj?.name || 'Uncategorized'

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
          const chapterId = String(chap)
          let chapterName = 'Uncategorized'
          if (subj && subj.chapters && chapterId !== 'uncategorized') {
            const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId)
            if (foundChapter) chapterName = foundChapter.name
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
            const topicId = String(top)
            let topicName = 'Uncategorized'
            if (subj && subj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
              const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId)
              if (foundChapter && foundChapter.topics) {
                const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId)
                if (foundTopic) topicName = foundTopic.name
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
      score: 0,
      totalMarks: 0,
      attempted: sec.attempted,
      totalQuestions: sec.totalQuestions,
      correct: sec.correct,
      wrong: sec.wrong,
      skipped: sec.skipped,
      unattempted: sec.unattempted,
      accuracy: sec.attempted > 0 ? parseFloat(((sec.correct / sec.attempted) * 100).toFixed(2)) : 0,
      chapters: Array.from(sec.chapters.values()).map(chap => {
        const hasRealTopics = Array.from(chap.topics.values()).some(t => t.topic._id !== null)
        return {
          chapter: chap.chapter,
          score: 0,
          totalMarks: 0,
          attempted: chap.attempted,
          totalQuestions: chap.totalQuestions,
          correct: chap.correct,
          wrong: chap.wrong,
          skipped: chap.skipped,
          unattempted: chap.unattempted,
          ...(hasRealTopics ? {} : { isWeak: chap.totalQuestions > 0 ? (chap.correct / chap.totalQuestions) < 0.5 : false }),
          percentage: 0,
          topics: Array.from(chap.topics.values()).map(top => ({
            topic: top.topic,
            score: 0,
            totalMarks: 0,
            attempted: top.attempted,
            totalQuestions: top.totalQuestions,
            correct: top.correct,
            wrong: top.wrong,
            skipped: top.skipped,
            unattempted: top.unattempted,
            isWeak: top.totalQuestions > 0 ? (top.correct / top.totalQuestions) < 0.5 : false,
            percentage: 0
          }))
        }
      })
    }))

    const topicAnalytics = Array.from(topicWise.values()).map(tw => {
      const isWeak = tw.totalQuestions > 0 ? (tw.correct / tw.totalQuestions) < 0.5 : false
      return {
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
        isWeak,
        is_week: isWeak
      }
    })

    let expertComment = "Keep practicing!"
    if (percentile >= 90) expertComment = "Excellent Work! You have high chances of getting selected."
    else if (percentile >= 75) expertComment = "Well Done! Good performance."

    console.log("AI Test Analysis - attempt.timeTaken (seconds):", attempt.timeTaken)

    return {
      attemptId: attempt._id,
      sessionId: attempt.sessionId,
      status: attempt.status,
      expertComment,
      overallPerformance: {
        score: 0,
        totalMarks: 0,
        rank,
        percentile,
        accuracy: attempt.accuracy,
        attempted: attempt.correct + attempt.wrong,
        skipped: attempt.skipped,
        unattempted: attempt.unattempted,
        totalQuestions: totalQuestionsLimit,
        duration: aiTest.duration,
        timeSpent: attempt.timeTaken ? `${parseFloat((attempt.timeTaken / 60).toFixed(2))} min` : '0 min'
      },
      sectionWisePerformance,
      topicAnalytics,
      correct: attempt.correct,
      wrong: attempt.wrong,
      skipped: attempt.skipped,
      unattempted: attempt.unattempted,
      attemptedAt: attempt.attemptedAt,
    }
  }

  async getSessionSolution(testId, sessionId, userId) {
    this.logger.info({ testId, sessionId, userId }, 'Retrieving solution for AI Test attempt')
    const attempt = await this.repository.getAttemptBySession(sessionId, userId)
    if (!attempt) {
      throw new AppError('Attempt session not found', 404, 'NOT_FOUND')
    }

    const aiTest = await this.getById(attempt.aiTest)
    if (!aiTest) {
      throw new AppError('AI Test not found', 404, 'NOT_FOUND')
    }

    // Fetch questions to build solutions
    const query = await this._buildQuestionQuery(aiTest)
    const totalQuestionsLimit = aiTest.totalQuestions || 10
    const questions = await QuestionModel.find(query)
      .limit(Number(totalQuestionsLimit))
      .populate('subjectId', 'name chapters')
      .lean()

    const answersByQuestionId = {}
    for (const ans of (attempt.answers || [])) {
      if (ans && ans.questionId) {
        answersByQuestionId[ans.questionId.toString()] = ans
      }
    }

    const { htmlToPlainText } = require('../../lib/htmlText')

    const groupedQuestions = {}
    questions.forEach((q, idx) => {
      const key = q._id.toString()
      if (!groupedQuestions[key]) groupedQuestions[key] = { en: {}, hi: {} }

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

        groupedQuestions[key][lang] = {
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
          order: q.order || (idx + 1),
          sortOrder: q.sortOrder || (idx + 1),
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
    })

    return Object.values(groupedQuestions)
  }
}

module.exports = new AiTestService()
