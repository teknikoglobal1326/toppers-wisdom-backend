const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialQuestionRepository = require('../../modules/editorial-question/editorial-question.repository')

class AdminEditorialQuestionService extends BaseService {
  constructor() {
    super(editorialQuestionRepository, 'admin:editorial-question')
  }

  buildFilter({ test, testId, subject, subjectId, chapter, chapterId, topic, topicId, status, search } = {}) {
    const filter = { isDeleted: false, testModel: 'EditorialTest' }
    const targetTest = test || testId
    if (targetTest) filter.test = targetTest

    const targetSubject = subject || subjectId
    if (targetSubject) filter.subjectId = targetSubject

    const targetChapter = chapter || chapterId
    if (targetChapter) filter.chapterId = targetChapter

    const targetTopic = topic || topicId
    if (targetTopic) filter.topicId = targetTopic

    if (status) filter.status = status
    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { 'en.question.text': rx },
        { 'hi.question.text': rx },
        { 'en.explanation.text': rx },
        { 'hi.explanation.text': rx },
      ]
    }
    return filter
  }

  formatQuestion(item) {
    if (!item) return item
    const doc = item.toObject ? item.toObject() : { ...item }

    const en = doc.en || {}
    const hi = doc.hi || {}

    let correctOption = 0
    if (Array.isArray(en.options)) {
      const idx = en.options.findIndex((o) => o && o.isCorrect)
      if (idx !== -1) correctOption = idx
    } else if (Array.isArray(hi.options)) {
      const idx = hi.options.findIndex((o) => o && o.isCorrect)
      if (idx !== -1) correctOption = idx
    }

    const question = {
      en: { text: en.question?.text || '', image: en.question?.image || '' },
      hi: { text: hi.question?.text || '', image: hi.question?.image || '' },
    }

    const explanation = {
      en: { text: en.explanation?.text || '', image: en.explanation?.image || '' },
      hi: { text: hi.explanation?.text || '', image: hi.explanation?.image || '' },
    }

    const options = [0, 1, 2, 3].map((i) => ({
      en: { text: en.options?.[i]?.text || '', image: en.options?.[i]?.image || '' },
      hi: { text: hi.options?.[i]?.text || '', image: hi.options?.[i]?.image || '' },
    }))

    return {
      ...doc,
      subject: doc.subjectId,
      chapter: doc.chapterId,
      topic: doc.topicId,
      correctOption,
      question,
      explanation,
      options,
    }
  }

  mapByLang(item, lang) {
    if (!lang) return this.formatQuestion(item)

    const formatted = this.formatQuestion(item)
    const langData = lang === 'hi' ? formatted.hi : formatted.en
    return {
      ...formatted,
      question: langData?.question || { text: '', image: '' },
      explanation: langData?.explanation || { text: '', image: '' },
      options: Array.isArray(langData?.options)
        ? langData.options.map((option) => ({ text: option.text || '', image: option.image || '' }))
        : [],
    }
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'
    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
      populate: [
        { path: 'test', select: 'title status' },
        { path: 'subjectId', select: 'name' },
      ],
    })

    return {
      ...result,
      data: result.data.map((item) => this.mapByLang(item, query.lang)),
    }
  }

  normalizePayload(data = {}, adminId) {
    const payload = { ...data, updatedBy: adminId, testModel: 'EditorialTest' }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }
    if (payload.order === undefined || payload.order === null) {
      payload.order = payload.sortOrder || 1
    }

    // Map test/testId to test
    const tId = payload.test || payload.testId || null
    if (tId !== undefined) payload.test = tId === '' ? null : tId

    const eId = payload.exam || payload.examId || null
    if (eId !== undefined) payload.exam = eId === '' ? null : eId

    // Map subExams/subExamIds
    const subExamsVal = payload.subExams || payload.subExamIds
    if (subExamsVal !== undefined) {
      payload.subExams = Array.isArray(subExamsVal) ? subExamsVal : [subExamsVal].filter(Boolean)
    }

    // Map subject/subjectId
    const sId = payload.subject || payload.subjectId || null
    if (sId !== undefined) payload.subjectId = sId === '' ? null : sId

    // Map chapter/chapterId
    const cId = payload.chapter || payload.chapterId || null
    if (cId !== undefined) payload.chapterId = cId === '' ? null : cId

    // Map topic/topicId
    const tpId = payload.topic || payload.topicId || null
    if (tpId !== undefined) payload.topicId = tpId === '' ? null : tpId

    // Numbers & Enums
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }
    if (payload.order !== undefined && payload.order !== null && payload.order !== '') {
      const parsed = Number(payload.order)
      if (!Number.isNaN(parsed)) payload.order = parsed
    } else if (payload.sortOrder !== undefined) {
      payload.order = payload.sortOrder || 1
    }

    if (payload.marks !== undefined && payload.marks !== null && payload.marks !== '') {
      const parsed = Number(payload.marks)
      if (!Number.isNaN(parsed)) payload.marks = parsed
    } else {
      payload.marks = 1
    }

    if (payload.negativeMarks !== undefined && payload.negativeMarks !== null && payload.negativeMarks !== '') {
      const parsed = Number(payload.negativeMarks)
      if (!Number.isNaN(parsed)) payload.negativeMarks = parsed
    } else {
      payload.negativeMarks = 0
    }

    if (payload.perQuestionTime !== undefined) {
      if (payload.perQuestionTime === '' || payload.perQuestionTime === null) {
        payload.perQuestionTime = null
      } else {
        const parsed = Number(payload.perQuestionTime)
        if (!Number.isNaN(parsed)) payload.perQuestionTime = parsed
      }
    }

    if (payload.difficulty && ['easy', 'medium', 'hard'].includes(payload.difficulty)) {
      // Keep valid difficulty
    } else {
      payload.difficulty = 'medium'
    }

    // Ensure en and hi are set for Question.model schema
    if (!payload.en || !payload.hi || !payload.en.question) {
      const correctOptIdx = Number(payload.correctOption || 0)
      const rawOptions = Array.isArray(payload.options) ? payload.options : []

      const enOptions = [0, 1, 2, 3].map((idx) => {
        const opt = rawOptions[idx] || {}
        return {
          text: (typeof opt.en === 'object' ? opt.en?.text : opt.en) || '',
          image: opt.en?.image || '',
          isCorrect: idx === correctOptIdx,
        }
      })

      const hiOptions = [0, 1, 2, 3].map((idx) => {
        const opt = rawOptions[idx] || {}
        return {
          text: (typeof opt.hi === 'object' ? opt.hi?.text : opt.hi) || '',
          image: opt.hi?.image || '',
          isCorrect: idx === correctOptIdx,
        }
      })

      payload.en = {
        question: {
          text: payload.question?.en?.text || (typeof payload.question?.en === 'string' ? payload.question.en : ''),
          image: payload.question?.en?.image || '',
        },
        options: enOptions,
        explanation: {
          text: payload.explanation?.en?.text || (typeof payload.explanation?.en === 'string' ? payload.explanation.en : ''),
          image: payload.explanation?.en?.image || '',
        },
      }

      payload.hi = {
        question: {
          text: payload.question?.hi?.text || (typeof payload.question?.hi === 'string' ? payload.question.hi : ''),
          image: payload.question?.hi?.image || '',
        },
        options: hiOptions,
        explanation: {
          text: payload.explanation?.hi?.text || (typeof payload.explanation?.hi === 'string' ? payload.explanation.hi : ''),
          image: payload.explanation?.hi?.image || '',
        },
      }
    }

    delete payload.testId
    delete payload.examId
    delete payload.subExamIds
    delete payload.subject
    delete payload.chapter
    delete payload.topic
    delete payload.correctOption

    return payload
  }

  async getOne(id, lang) {
    const question = await editorialQuestionRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'test', select: 'title status' },
          { path: 'subjectId', select: 'name' },
        ],
      }
    )
    if (!question) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    return this.mapByLang(question, lang)
  }

  async syncEditorialTestQuestionCount(testId) {
    if (!testId) return
    const count = await editorialQuestionRepository.count({
      test: testId,
      isDeleted: false,
    })
    const EditorialTest = require('../../models/EditorialTest.model')
    await EditorialTest.findOneAndUpdate(
      { _id: testId, isDeleted: false },
      { totalQuestions: count, totalMappedQuestions: count, mappedQuestions: count }
    )
  }

  async createEditorialQuestion(data, adminId) {
    const payload = this.normalizePayload(data, adminId)
    payload.createdBy = adminId
    const created = await this.create(payload)
    if (created.test) await this.syncEditorialTestQuestionCount(created.test)
    return this.mapByLang(created)
  }

  async updateEditorialQuestion(id, data, adminId) {
    const existing = await editorialQuestionRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    const updated = await editorialQuestionRepository.updateById(id, this.normalizePayload(data, adminId))
    if (existing.test) await this.syncEditorialTestQuestionCount(existing.test)
    if (updated.test && String(updated.test) !== String(existing.test)) {
      await this.syncEditorialTestQuestionCount(updated.test)
    }
    return this.mapByLang(updated)
  }

  async softDelete(id, adminId) {
    const existing = await editorialQuestionRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial question not found', 404, 'NOT_FOUND')
    const updated = await editorialQuestionRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
    if (existing.test) await this.syncEditorialTestQuestionCount(existing.test)
    return updated
  }
}

module.exports = new AdminEditorialQuestionService()