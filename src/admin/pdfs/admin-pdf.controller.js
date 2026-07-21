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

const bulkCreate = catchAsync(async (req, res) => {
  const payloadArray = req.body.map(item => ({ ...item, createdBy: req.admin?._id }))
  sendCreated(res, await adminPdfService.bulkCreatePdf(payloadArray))
})

module.exports = { list, getOne, create, update, remove, bulkCreate }
