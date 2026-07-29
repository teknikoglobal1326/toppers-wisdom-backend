const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminPdfService = require('./admin-pdf.service')

const list = catchAsync(async (req, res) => {
  const result = await adminPdfService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminPdfService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  console.log(req.body, "req.body")
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminPdfService.createPdf(payload))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminPdfService.updatePdf(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminPdfService.softDelete(req.params.id)
  sendSuccess(res, null, 'Pdf deleted')
})

const AppError = require('../../core/AppError')

const bulkCreate = catchAsync(async (req, res) => {
  if (req.files && req.files.file) {
    const file = req.files.file[0]
    const common = req.body || {}
    const adminId = req.admin?._id
    const created = await adminPdfService.bulkUpload(file, common, adminId, req.files)
    return sendCreated(res, created)
  }
  const payloadArray = req.body.map(item => ({ ...item, createdBy: req.admin?._id }))
  sendCreated(res, await adminPdfService.bulkCreatePdf(payloadArray))
})

const uploadForDocument = catchAsync(async (req, res) => {
  const { id } = req.params
  const payload = {}
  if (req.body.pdfFile) payload.pdfFile = req.body.pdfFile
  if (req.body.image) payload.image = req.body.image

  if (Object.keys(payload).length === 0) {
    throw new AppError('At least one file (pdfFile or image) must be uploaded', 400, 'VALIDATION_ERROR')
  }

  const updated = await adminPdfService.updatePdf(id, payload)
  sendSuccess(res, updated, 'Files uploaded and document updated successfully')
})

module.exports = { list, getOne, create, update, remove, bulkCreate, uploadForDocument }
