const BaseService = require('../../core/BaseService')
const pdfRepository = require('../../modules/pdf/pdf.repository')
const AppError = require('../../core/AppError')

class AdminPdfService extends BaseService {
  constructor() {
    super(pdfRepository, 'admin:pdf')
  }

  async listAll({ page, limit, status, course, topic, search } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (topic) filter.topic = topic

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    return this.getAll(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'topic', select: 'topicName' },
      ],
    })
  }

  async getOne(id) {
    const pdf = await pdfRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'topic', select: 'topicName chapters' },
        ],
      }
    )
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    return pdf
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    if (payload.topicId && !payload.topic) payload.topic = payload.topicId
    delete payload.courseId
    delete payload.topicId
    if (payload.pdfFile === '') delete payload.pdfFile
    if (payload.image === '') delete payload.image
    return payload
  }

  async createPdf(data) {
    const payload = this.buildPayload(data)
    const created = await pdfRepository.create(payload)
    return created
  }

  async updatePdf(id, data) {
    const pdf = await pdfRepository.findOne({ _id: id, isDeleted: false })
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    const updated = await pdfRepository.updateById(id, this.buildPayload(data))
    return updated
  }

  async softDelete(id) {
    const pdf = await pdfRepository.findOne({ _id: id, isDeleted: false })
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    await pdfRepository.updateById(id, { isDeleted: true })
    this.logger.info({ pdfId: id }, 'Pdf soft deleted')
  }
}

module.exports = new AdminPdfService()
