const path = require('path')
const BaseService = require('../../core/BaseService')
const pdfRepository = require('../../modules/pdf/pdf.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

class AdminPdfService extends BaseService {
  constructor() {
    super(pdfRepository, 'admin:pdf')
  }

  async listAll({ page, limit, status, course, subject, topic, chapter, search, sortOrder } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (course) filter.course = course
    if (subject) filter.subjects = subject
    if (topic) filter.topics = topic
    if (chapter) filter.chapters = chapter

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const direction = sortOrder === 'desc' ? -1 : 1

    return this.getAll(filter, {
      page,
      limit,
      sort: { sortOrder: direction, createdAt: -1 },
      populate: [
        { path: 'course', select: 'title slug' },
        { path: 'subjects' },
      ],
    })
  }

  async getOne(id) {
    const pdf = await pdfRepository.findOne(
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'course', select: 'title slug' },
          { path: 'subjects' },
        ],
      }
    )
    if (!pdf) throw new AppError('Pdf not found', 404, 'NOT_FOUND')
    return pdf
  }

  buildPayload(data = {}) {
    const payload = { ...data }
    if (payload.courseId && !payload.course) payload.course = payload.courseId
    delete payload.courseId
    if (payload.pdfFile === '') delete payload.pdfFile
    if (payload.image === '') delete payload.image
    return payload
  }

  async createPdf(data) {
    const payload = this.buildPayload(data)
    // console.log('Creating PDF with payload:', payload) // Debugging line
    const created = await pdfRepository.create(payload)
    return created
  }

  async bulkCreatePdf(payloadArray) {
    const builtPayloads = payloadArray.map(data => this.buildPayload(data))
    const created = await pdfRepository.insertMany(builtPayloads)
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

const adminPdfService = new AdminPdfService()

adminPdfService.attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `pdfs/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.pdfFile?.[0]) {
      const file = req.files.pdfFile[0]
      const ext = path.extname(file.originalname) || '.pdf'
      req.body.pdfFile = await uploadFile(file.buffer, `pdfFile${ext}`, folder, file.mimetype)
    }

    if (req.files?.image?.[0]) {
      const file = req.files.image[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.image = await uploadFile(file.buffer, `image${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = adminPdfService
