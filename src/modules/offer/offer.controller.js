const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const offerService = require('./offer.service')

const list   = catchAsync(async (req, res) => { const r = await offerService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await offerService.getOne(req.params.id)) })

module.exports = { list, getOne }
