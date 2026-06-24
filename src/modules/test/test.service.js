const BaseService    = require('../../core/BaseService')
const testRepository = require('./test.repository')
const { checkAccess } = require('../../lib/access')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class TestService extends BaseService {
  constructor() {
    super(testRepository, 'test')
    this.logger = createLogger('test:service')
  }

  async listTests(userId, subExamId, filters) {
    const filter = { subExam: subExamId, status: 'published' }
    if (filters.type)  filter.type  = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: '-subTests.questions' })
  }

  async getTest(testId, userId) {
    const test      = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) return { ...test, subTests: test.subTests.map((s) => ({ ...s, questions: [] })), hasAccess: false }
    return { ...test, hasAccess: true }
  }

  async startSubTest(testId, subTestId, userId) {
    this.logger.info({ testId, subTestId, userId }, 'Sub-test started')
    const test = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) throw new AppError('Please purchase this test', 403, 'FORBIDDEN')

    const subTest = test.subTests.find((s) => s._id.toString() === subTestId)
    if (!subTest) throw new AppError('Sub-test not found', 404)

    // Return questions without correct answers
    return { ...subTest, questions: subTest.questions.map(({ correctOption, explanation, ...rest }) => rest) }
  }

  async submitAttempt(testId, subTestId, userId, answers, timeTaken) {
    this.logger.info({ testId, subTestId, userId }, 'Scoring attempt')
    const test = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) throw new AppError('Please purchase this test', 403, 'FORBIDDEN')

    const subTest = test.subTests.find((s) => s._id.toString() === subTestId)
    if (!subTest) throw new AppError('Sub-test not found', 404)

    let score = 0, correct = 0, wrong = 0, unattempted = 0

    for (const q of subTest.questions) {
      const ans = answers.find((a) => a.questionId.toString() === q._id.toString())
      if (!ans || ans.selectedOption == null) { unattempted++; continue }
      if (ans.selectedOption === q.correctOption) { score += q.marks; correct++ }
      else { if (test.negativeMarking) score -= q.negativeMarks; wrong++ }
    }

    const accuracy = subTest.questions.length > 0
      ? parseFloat(((correct / subTest.questions.length) * 100).toFixed(2)) : 0

    const attempt = await testRepository.createAttempt({
      user: userId, test: testId, subTestId,
      answers, score, totalMarks: subTest.totalMarks,
      accuracy, timeTaken, correct, wrong, unattempted, status: 'completed',
    })

    const { rankQueue } = require('../../jobs/queue')
    await rankQueue.add('calculate-rank', { attemptId: attempt._id, testId, subTestId })

    this.logger.info({ userId, testId, score, accuracy }, 'Attempt scored')
    return { score, totalMarks: subTest.totalMarks, accuracy, correct, wrong, unattempted }
  }

  async getLeaderboard(testId) { return testRepository.getLeaderboard(testId) }
  async getMyAttempts(userId, opts) { return testRepository.getAttemptsByUser(userId, opts) }
}

module.exports = new TestService()