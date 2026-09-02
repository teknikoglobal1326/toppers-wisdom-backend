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
    delete baseCloneData.assignments

    // 3. Fetch original questions of this master test
    const Question = require('../../models/Question.model')
    const originalQuestions = await Question.find({ test: testMasterId, isDeleted: { $ne: true } }).lean()

    // Normalize payload to an array of assignments
    const assignments = Array.isArray(payload.assignments) ? payload.assignments : [payload];
    const results = [];
    const assignmentRecords = [];
    const adminQuestionService = require('../questions/admin-question.service');

    for (const assignment of assignments) {
      const { target, parentId, startDateTime, endDateTime } = assignment;
      const cloneData = { ...baseCloneData };

      // 4. Map to Target Model
      let TargetModel;
      let targetModelName;
      let moduleKey = 'test-series';
      let moduleName = 'Test Series';
      
      if (target === 'TestSeries') {
        TargetModel = require('../../models/TestSeriesTest.model')
        targetModelName = 'TestSeriesTest'
        moduleKey = 'test-series'
        moduleName = 'Test Series'
        if (!parentId) throw new AppError('parentId is required for TestSeries target', 400)
        cloneData.testSeries = parentId
      } else if (target === 'PreviousYearPaper') {
        TargetModel = require('../../models/PreviousYearPaperTest.model')
        targetModelName = 'PreviousYearPaperTest'
        moduleKey = 'previous-year-papers'
        moduleName = 'Previous Year Papers'
        if (!parentId) throw new AppError('parentId is required for PreviousYearPaper target', 400)
        cloneData.previousYearPaper = parentId
      } else if (target === 'SectionalTestSeries') {
        TargetModel = require('../../models/SectionalTestSeriesTest.model')
        targetModelName = 'SectionalTestSeriesTest'
        moduleKey = 'sectional-tests'
        moduleName = 'Sectional Tests'
        if (!parentId) throw new AppError('parentId is required for SectionalTestSeries target', 400)
        cloneData.sectionalTestSeries = parentId
      } else if (target === 'LiveTest') {
        TargetModel = require('../../models/LiveTest.model')
        targetModelName = 'LiveTest'
        moduleKey = 'live-tests'
        moduleName = 'Live Test'
        if (!startDateTime || !endDateTime) throw new AppError('startDateTime and endDateTime are required for LiveTest', 400)
        cloneData.startDateTime = startDateTime
        cloneData.endDateTime = endDateTime
        cloneData.examId = testMaster.exams?.[0] || null
        cloneData.subExamIds = testMaster.subExams || []
      } else if (target === 'DailyQuiz') {
        TargetModel = require('../../models/DailyQuiz.model')
        targetModelName = 'DailyQuiz'
        moduleKey = 'quiz'
        moduleName = 'Quiz'
        if (!startDateTime || !endDateTime) throw new AppError('startDateTime and endDateTime are required for DailyQuiz', 400)
        cloneData.startDateTime = startDateTime
        cloneData.endDateTime = endDateTime
        cloneData.exam = testMaster.exams?.[0] || null
        cloneData.subExams = testMaster.subExams || []
      } else if (target === 'AiTest') {
        moduleKey = 'ai-test'
        moduleName = 'AI Test'
      } else {
        throw new AppError(`Invalid assignment target: ${target}`, 400)
      }

      let targetDoc = null;
      if (TargetModel) {
        // Check if an assignment record for this target & parentId already exists
        const existingRecord = (testMaster.assignments || []).find(a => 
          a.target === target && 
          (parentId ? String(a.targetSeriesId) === String(parentId) : true) &&
          a.targetTestId
        );

        if (existingRecord && existingRecord.targetTestId) {
          targetDoc = await TargetModel.findById(existingRecord.targetTestId);
        }

        if (!targetDoc) {
          targetDoc = await TargetModel.create(cloneData);
        } else {
          await TargetModel.findByIdAndUpdate(targetDoc._id, cloneData);
        }

        // Clone questions for this target
        if (originalQuestions.length > 0) {
          // Clear existing cloned questions for this target document to avoid duplicates
          await Question.deleteMany({ test: targetDoc._id });

          const clonedQuestions = originalQuestions.map(q => {
            const clonedQ = { ...q }
            delete clonedQ._id
            delete clonedQ.createdAt
            delete clonedQ.updatedAt
            delete clonedQ.__v
            clonedQ.test = targetDoc._id
            clonedQ.testModel = targetModelName
            clonedQ.masterQuestionId = q._id
            return clonedQ
          })
          await Question.insertMany(clonedQuestions)
        }

        // Sync question count for the created target test document
        await adminQuestionService.syncQuestionCount(targetDoc._id);
        this.logger.info({ testMasterId, target, newTargetId: targetDoc._id, clonedQuestionsCount: originalQuestions.length }, 'TestMaster assigned successfully to target')
        results.push({ target, newTargetId: targetDoc._id });
      }

      assignmentRecords.push({
        moduleKey,
        moduleName,
        target,
        targetSeriesId: parentId || null,
        targetTestId: targetDoc ? targetDoc._id : null,
        liveStartDateTime: startDateTime || null,
        liveEndDateTime: endDateTime || null,
        assignedAt: new Date(),
        status: 'assigned',
      });
    }

    await testMasterRepository.model.findByIdAndUpdate(
      testMasterId,
      { assignments: assignmentRecords },
      { new: true }
    );

    return results
  }
}

module.exports = new AdminTestMasterService()