const BaseService      = require('../../core/BaseService')
const testMasterRepository = require('../../modules/test-master/test-master.repository')
const AppError         = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class AdminTestMasterService extends BaseService {
  constructor() {
    super(testMasterRepository, 'admin:test-master')
    this.logger = createLogger('admin:test-master:service')
  }

  normalizePayload(data = {}) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    return payload
  }

  async listAll(filters) {
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.exams)   filter.exams   = filters.exams
    if (filters.subExams) filter.subExams = filters.subExams
    if (filters.type)    filter.type    = filters.type
    const direction = filters.sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: { sortOrder: direction, createdAt: -1 },
    })
  }

  async create(data) {
    return super.create(this.normalizePayload(data))
  }

  async update(id, data) {
    return super.update(id, this.normalizePayload(data))
  }

  async publish(testMasterId) {
    this.logger.info({ testMasterId }, 'Publishing test master')
    return this.update(testMasterId, { status: 'published' })
  }

  async assignTest(testMasterId, payload) {
    // 1. Fetch TestMaster
    const testMaster = await testMasterRepository.model.findById(testMasterId).lean()
    if (!testMaster) throw new AppError('Test master not found', 404)

    // 2. Prepare base cloned data
    const baseCloneData = { ...testMaster }
    delete baseCloneData._id
    delete baseCloneData.createdAt
    delete baseCloneData.updatedAt
    delete baseCloneData.__v
    delete baseCloneData.exams
    delete baseCloneData.subExams

    // 3. Fetch original questions
    const Question = require('../../models/Question.model')
    const originalQuestions = await Question.find({ test: testMasterId, testModel: 'TestMaster' }).lean()

    // Normalize payload to an array of assignments
    const assignments = Array.isArray(payload.assignments) ? payload.assignments : [payload];
    const results = [];

    for (const assignment of assignments) {
      const { target, parentId, startDateTime, endDateTime } = assignment;
      const cloneData = { ...baseCloneData };

      // 4. Map to Target Model
      let TargetModel;
      let targetModelName;
      
      if (target === 'TestSeries') {
        TargetModel = require('../../models/TestSeriesTest.model')
        targetModelName = 'TestSeriesTest'
        if (!parentId) throw new AppError('parentId is required for TestSeries target', 400)
        cloneData.testSeries = parentId
      } else if (target === 'PreviousYearPaper') {
        TargetModel = require('../../models/PreviousYearPaperTest.model')
        targetModelName = 'PreviousYearPaperTest'
        if (!parentId) throw new AppError('parentId is required for PreviousYearPaper target', 400)
        cloneData.previousYearPaper = parentId
      } else if (target === 'SectionalTestSeries') {
        TargetModel = require('../../models/SectionalTestSeriesTest.model')
        targetModelName = 'SectionalTestSeriesTest'
        if (!parentId) throw new AppError('parentId is required for SectionalTestSeries target', 400)
        cloneData.sectionalTestSeries = parentId
      } else if (target === 'LiveTest') {
        TargetModel = require('../../models/LiveTest.model')
        targetModelName = 'LiveTest'
        if (!startDateTime || !endDateTime) throw new AppError('startDateTime and endDateTime are required for LiveTest', 400)
        cloneData.startDateTime = startDateTime
        cloneData.endDateTime = endDateTime
        cloneData.examId = testMaster.exams?.[0] || null
        cloneData.subExamIds = testMaster.subExams || []
      } else if (target === 'DailyQuiz') {
        TargetModel = require('../../models/DailyQuiz.model')
        targetModelName = 'DailyQuiz'
        if (!startDateTime || !endDateTime) throw new AppError('startDateTime and endDateTime are required for DailyQuiz', 400)
        cloneData.startDateTime = startDateTime
        cloneData.endDateTime = endDateTime
        cloneData.exam = testMaster.exams?.[0] || null
        cloneData.subExams = testMaster.subExams || []
      } else {
        throw new AppError(`Invalid assignment target: ${target}`, 400)
      }

      // 5. Create target document
      const newTargetDoc = await TargetModel.create(cloneData)

      // 6. Clone questions for this target
      if (originalQuestions.length > 0) {
        const clonedQuestions = originalQuestions.map(q => {
          const clonedQ = { ...q }
          delete clonedQ._id
          delete clonedQ.createdAt
          delete clonedQ.updatedAt
          delete clonedQ.__v
          clonedQ.test = newTargetDoc._id
          clonedQ.testModel = targetModelName
          return clonedQ
        })
        await Question.insertMany(clonedQuestions)
      }

      this.logger.info({ testMasterId, target, newTargetId: newTargetDoc._id, clonedQuestionsCount: originalQuestions.length }, 'TestMaster assigned successfully to target')
      results.push({ target, newTargetId: newTargetDoc._id });
    }
    
    return results
  }
}

module.exports = new AdminTestMasterService()
