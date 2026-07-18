const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminShortCategoryService = require('./admin-short-category.service')

const list   = catchAsync(async (req, res) => { const r = await adminShortCategoryService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminShortCategoryService.getOne(req.params.id)) })
const create = catchAsync(async (req, res) => { sendCreated(res, await adminShortCategoryService.createCategory(req.body, req.files)) })
const update = catchAsync(async (req, res) => { sendSuccess(res, await adminShortCategoryService.updateCategory(req.params.id, req.body, req.files)) })
const remove = catchAsync(async (req, res) => { await adminShortCategoryService.softDelete(req.params.id); sendSuccess(res, null, 'Short category deleted') })

module.exports = { list, getOne, create, update, remove }
