const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminOfferService = require('./admin-offer.service')

const list   = catchAsync(async (req, res) => { const r = await adminOfferService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminOfferService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminOfferService.createOffer(req.body, req.file)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminOfferService.updateOffer(req.params.id, req.body, req.file)) })
const remove = catchAsync(async (req, res) => { await adminOfferService.softDelete(req.params.id); sendSuccess(res, null, 'Offer deleted') })
const hardRemove = catchAsync(async (req, res) => { await adminOfferService.hardDelete(req.params.id); sendSuccess(res, null, 'Offer permanently deleted') })

module.exports = { list, getOne, create, update, remove, hardRemove }
