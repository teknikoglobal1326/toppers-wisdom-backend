const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminBannerService = require('./admin-banner.service')

const list   = catchAsync(async (req, res) => { const r = await adminBannerService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminBannerService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminBannerService.createBanner(req.body, req.file)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminBannerService.updateBanner(req.params.id, req.body, req.file)) })
const remove = catchAsync(async (req, res) => { await adminBannerService.softDelete(req.params.id); sendSuccess(res, null, 'Banner deleted') })

module.exports = { list, getOne, create, update, remove }