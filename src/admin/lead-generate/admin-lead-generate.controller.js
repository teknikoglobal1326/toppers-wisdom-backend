const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const adminLeadGenerateService = require('./admin-lead-generate.service')

const list = catchAsync(async (req, res) => {
  const result = await adminLeadGenerateService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const update = catchAsync(async (req, res) => {
  const result = await adminLeadGenerateService.updateLead(req.params.id, req.body)
  sendSuccess(res, result, 'Lead updated successfully')
})

module.exports = { list, update }
