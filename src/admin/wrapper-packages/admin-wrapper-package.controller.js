const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminWrapperPackageService = require('./admin-wrapper-package.service')

const list   = catchAsync(async (req, res) => { const r = await adminWrapperPackageService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminWrapperPackageService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminWrapperPackageService.createPackage(req.body, req.file)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminWrapperPackageService.updatePackage(req.params.id, req.body, req.file)) })
const remove = catchAsync(async (req, res) => { await adminWrapperPackageService.softDelete(req.params.id); sendSuccess(res, null, 'Wrapper package deleted') })

module.exports = { list, getOne, create, update, remove }
