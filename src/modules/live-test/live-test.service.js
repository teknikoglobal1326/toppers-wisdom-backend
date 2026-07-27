const Subject = require('../../models/Subject.model')
const AppError = require('../../core/AppError')
const Question = require('../../models/Question.model')
const mongoose = require('mongoose')

class LiveTestService {
  async getSyllabus(examId) {
    if (!examId) throw new AppError('examId is required', 400, 'VALIDATION_ERROR')
    
    const filter = { isDeleted: false, status: 'active' }
    if (examId.includes(',')) {
      filter.examIds = { $in: examId.split(',') }
    } else {
      filter.examIds = examId
    }

    const subjects = await Subject.find(filter)
      .select('_id name sortOrder chapters')
      .sort({ sortOrder: 1, name: 1 })
      .lean()

    const subjectList = []
    const chapterList = []

    for (const subject of subjects) {
      subjectList.push({
        _id: subject._id,
        name: subject.name,
        sortOrder: subject.sortOrder
      })

      const embeddedChapters = Array.isArray(subject.chapters) ? subject.chapters : []
      for (const chapter of embeddedChapters) {
        chapterList.push({
          _id: chapter._id,
          chapterName: chapter.name,
          subjectId: subject._id,
          topics: Array.isArray(chapter.topics)
            ? chapter.topics.map(t => ({ _id: t._id, name: t.name }))
            : []
        })
      }
    }

    return {
      subjects: subjectList,
      chapters: chapterList
    }
  }

  async autoGenerateQuestions({ testId, subjectId, chapterIds, limit }) {
    if (!testId) throw new AppError('testId is required', 400, 'VALIDATION_ERROR')
    if (!subjectId) throw new AppError('subjectId is required', 400, 'VALIDATION_ERROR')

    // Parse and normalize chapterIds
    let parsedChapterIds = []
    if (Array.isArray(chapterIds)) {
      parsedChapterIds = chapterIds.map(id => new mongoose.Types.ObjectId(id))
    } else if (typeof chapterIds === 'string' && chapterIds) {
      parsedChapterIds = chapterIds.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
    }

    // Query active questions matching the filter
    const query = {
      subjectId: new mongoose.Types.ObjectId(subjectId),
      isDeleted: false,
      status: 'active'
    }

    if (parsedChapterIds.length > 0) {
      query.chapterId = { $in: parsedChapterIds }
    }

    // Exclude questions that are already mapped to this target test to avoid mapping duplicate questions
    query.test = { $ne: new mongoose.Types.ObjectId(testId) }

    const adminQuestionService = require('../../admin/questions/admin-question.service')
    const parentTest = await adminQuestionService.resolveParentTest(testId)
    if (!parentTest) throw new AppError('Target test not found', 404, 'NOT_FOUND')

    let maxLimit = Number(limit) || 100

    const existingQuestions = await Question.find(query)
      .limit(maxLimit)
      .lean()

    if (existingQuestions.length === 0) {
      return {
        mappedCount: 0,
        message: 'No matching questions found to map'
      }
    }

    // Determine starting order
    let currentOrder = await adminQuestionService.nextOrder(testId)

    // Build the cloned questions payload
    const clonedQuestions = existingQuestions.map(q => {
      const cloned = {
        ...q,
        test: new mongoose.Types.ObjectId(testId),
        order: currentOrder++,
        sortOrder: q.sortOrder || 0,
        perQuestionTime: parentTest.isPerQuestionTime !== false ? (q.perQuestionTime || 60) : null
      }
      
      delete cloned._id
      delete cloned.createdAt
      delete cloned.updatedAt
      delete cloned.__v

      return cloned
    })

    // Insert cloned questions
    const createdDocs = await Question.insertMany(clonedQuestions)

    // Sync question count on the parent test
    await adminQuestionService.syncQuestionCount(testId)

    return {
      mappedCount: createdDocs.length,
      message: `${createdDocs.length} questions mapped successfully`
    }
  }
}

module.exports = new LiveTestService()
