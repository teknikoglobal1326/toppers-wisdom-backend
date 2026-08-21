const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialRepository = require('../../modules/editorial/editorial.repository')

const makeSlug = (value = '') => value
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/[\s_]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '')

class AdminEditorialService extends BaseService {
  constructor() {
    super(editorialRepository, 'admin:editorial')
  }

  buildFilter({ type, status, isFree, editorialTest, editorialTopic, search, examId, exam, subexamId, subExam } = {}) {
    const filter = { isDeleted: false }
    if (type) filter.type = type
    if (status) filter.status = status
    if (typeof isFree === 'boolean') filter.isFree = isFree
    if (editorialTest) filter.editorialTest = editorialTest
    if (editorialTopic) filter.editorialTopic = editorialTopic

    const targetExam = examId || exam
    if (targetExam) {
      if (Array.isArray(targetExam)) {
        filter.$or = [{ exam: { $in: targetExam } }, { examIds: { $in: targetExam } }]
      } else if (typeof targetExam === 'string') {
        const examsArr = targetExam.includes(',') ? targetExam.split(',') : [targetExam]
        filter.$or = [{ exam: { $in: examsArr } }, { examIds: { $in: examsArr } }]
      }
    }

    const targetSubExam = subexamId || subExam
    if (targetSubExam) {
      if (Array.isArray(targetSubExam)) {
        filter.$or = [{ subExam: { $in: targetSubExam } }, { subexamIds: { $in: targetSubExam } }]
      } else if (typeof targetSubExam === 'string') {
        const subExamsArr = targetSubExam.includes(',') ? targetSubExam.split(',') : [targetSubExam]
        filter.$or = [{ subExam: { $in: subExamsArr } }, { subexamIds: { $in: subExamsArr } }]
      }
    }

    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { title: rx },
        { shortDescription: rx },
        { description: rx },
      ]
    }

    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
      populate: [
        { path: 'editorialTest', select: 'title status' },
        'exam',
        'examIds',
        'subExam',
        'subexamIds',
        'subjectIds',
        'subjects',
        { path: 'editorialTopic', select: 'name status' }
      ],
    })
  }

  async getOne(id) {
    const editorial = await editorialRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [
        { path: 'editorialTest', select: 'title status' },
        'exam',
        'examIds',
        'subExam',
        'subexamIds',
        'subjectIds',
        'subjects',
        { path: 'editorialTopic', select: 'name status' }
      ] }
    )
    if (!editorial) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    return editorial
  }

  normalizePayload(data = {}, adminId) {
    const payload = { ...data, updatedBy: adminId }

    if (!payload.slug && payload.title) {
      payload.slug = `${makeSlug(payload.title)}-${Date.now().toString(36)}`
    }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }
    if (payload.editorialTest === '') payload.editorialTest = null
    if (payload.editorialTopic === '') payload.editorialTopic = null

    // Standardize exams / examIds
    let examList = []
    if (Array.isArray(payload.examIds)) {
      examList = payload.examIds.filter(Boolean)
    } else if (Array.isArray(payload.exam)) {
      examList = payload.exam.filter(Boolean)
    } else if (typeof payload.examIds === 'string' && payload.examIds) {
      examList = [payload.examIds]
    } else if (typeof payload.exam === 'string' && payload.exam) {
      examList = [payload.exam]
    }
    payload.exam = examList
    payload.examIds = examList

    // Standardize subExam / subexamIds
    let subExamList = []
    if (Array.isArray(payload.subexamIds)) {
      subExamList = payload.subexamIds.filter(Boolean)
    } else if (Array.isArray(payload.subExam)) {
      subExamList = payload.subExam.filter(Boolean)
    } else if (typeof payload.subexamIds === 'string' && payload.subexamIds) {
      subExamList = [payload.subexamIds]
    } else if (typeof payload.subExam === 'string' && payload.subExam) {
      subExamList = [payload.subExam]
    }
    payload.subExam = subExamList
    payload.subexamIds = subExamList

    // Standardize subjects / subjectIds
    let subjectList = []
    if (Array.isArray(payload.subjectIds)) {
      subjectList = payload.subjectIds.filter(Boolean)
    } else if (Array.isArray(payload.subjects)) {
      subjectList = payload.subjects.filter(Boolean)
    } else if (typeof payload.subjectIds === 'string' && payload.subjectIds) {
      subjectList = [payload.subjectIds]
    } else if (typeof payload.subjects === 'string' && payload.subjects) {
      subjectList = [payload.subjects]
    }
    payload.subjectIds = subjectList
    payload.subjects = subjectList

    return payload
  }

  async createEditorial(data, adminId) {
    const payload = this.normalizePayload(data, adminId)
    payload.createdBy = adminId
    return this.create(payload)
  }

  async updateEditorial(id, data, adminId) {
    const existing = await editorialRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    return editorialRepository.updateById(id, this.normalizePayload(data, adminId))
  }

  async softDelete(id, adminId) {
    const existing = await editorialRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    return editorialRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
  }

  async listTransactions(query = {}) {
    const { paginate } = require('../../core/paginate')
    const EditorialPurchase = require('../../models/EditorialPurchase.model')
    const User = require('../../models/User.model')

    const filter = {}

    if (query.status) {
      filter.status = query.status
    }

    if (query.search) {
      const rx = new RegExp(query.search, 'i')
      const users = await User.find({
        $or: [
          { name: rx },
          { phone: rx },
          { email: rx }
        ]
      }).select('_id').lean()
      const userIds = users.map(u => u._id)
      filter.user = { $in: userIds }
    }

    const options = {
      page: query.page,
      limit: query.limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'name phone email avatar' },
        { path: 'plan', select: 'title price discountPrice' }
      ]
    }

    return paginate(EditorialPurchase, filter, options)
  }

  async getPlan() {
    const EditorialPlan = require('../../models/EditorialPlan.model')
    return EditorialPlan.findOne().lean()
  }

  async upsertPlan(data, adminId) {
    const EditorialPlan = require('../../models/EditorialPlan.model')
    let plan = await EditorialPlan.findOne()

    const planData = {
      title: data.title,
      description: data.description,
      price: Number(data.price || 0),
      discountPrice: Number(data.discountPrice || 0),
      validityInMonths: Number(data.validityInMonths || 12),
      status: data.status || 'active'
    }

    if (plan) {
      Object.assign(plan, planData)
      await plan.save()
    } else {
      plan = await EditorialPlan.create(planData)
    }
    return plan
  }
}

module.exports = new AdminEditorialService()