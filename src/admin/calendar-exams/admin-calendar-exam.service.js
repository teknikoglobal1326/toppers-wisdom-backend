const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const calendarExamRepository = require('../../modules/calendar-exam/calendar-exam.repository')

class AdminCalendarExamService extends BaseService {
  constructor() {
    super(calendarExamRepository, 'admin:calendar-exam')
  }

  buildFilter({ exam, exams, subExams, search } = {}) {
    const filter = { isDeleted: false }

    const targetExams = exams || exam
    if (targetExams) {
      const examsArr = Array.isArray(targetExams) ? targetExams : String(targetExams).split(',').map(e => e.trim())
      filter.exams = { $in: examsArr }
    }

    if (subExams) {
      const subExamsArr = Array.isArray(subExams) ? subExams : String(subExams).split(',').map(s => s.trim())
      filter.subExams = { $in: subExamsArr }
    }

    if (search) {
      filter.title = new RegExp(search, 'i')
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
        { path: 'exams', select: 'name' },
        { path: 'subExams', select: 'name' }
      ]
    })
  }

  async getOne(id) {
    const calendarExam = await calendarExamRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [
        { path: 'exams' },
        { path: 'subExams' }
      ] }
    )
    if (!calendarExam) throw new AppError('Calendar exam entry not found', 404, 'NOT_FOUND')
    return calendarExam
  }

  async processImage(file) {
    if (file) {
      const path = require('path')
      const { uploadFile } = require('../../lib/fileUpload')
      const ext = path.extname(file.originalname) || '.jpg'
      const timestamp = Date.now()
      const folder = `calendar-exams/new-${timestamp}`
      const filename = `image-${timestamp}${ext}`
      return uploadFile(file.buffer, filename, folder, file.mimetype)
    }
    return null
  }

  normalizePayload(data = {}) {
    const payload = { ...data }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    // Standardize exams
    let examList = []
    if (Array.isArray(payload.exams)) {
      examList = payload.exams.filter(Boolean)
    } else if (typeof payload.exams === 'string' && payload.exams) {
      examList = [payload.exams]
    }
    payload.exams = examList

    // Standardize subExams
    let subExamList = []
    if (Array.isArray(payload.subExams)) {
      subExamList = payload.subExams.filter(Boolean)
    } else if (typeof payload.subExams === 'string' && payload.subExams) {
      subExamList = [payload.subExams]
    }
    payload.subExams = subExamList

    return payload
  }

  async createCalendarExam(data, file) {
    const payload = this.normalizePayload(data)
    const processedImage = await this.processImage(file)
    if (processedImage) {
      payload.image = processedImage
    }
    return this.create(payload)
  }

  async updateCalendarExam(id, data, file) {
    const existing = await calendarExamRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Calendar exam entry not found', 404, 'NOT_FOUND')

    const payload = this.normalizePayload(data)
    const processedImage = await this.processImage(file)
    if (processedImage) {
      payload.image = processedImage
    }
    return calendarExamRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const existing = await calendarExamRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Calendar exam entry not found', 404, 'NOT_FOUND')

    return calendarExamRepository.updateById(id, {
      isDeleted: true,
      status: 'inactive'
    })
  }
}

module.exports = new AdminCalendarExamService()
