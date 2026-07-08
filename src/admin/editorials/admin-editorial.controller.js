const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const service = require('./admin-editorial.service')

const list = catchAsync(async (req, res) => {
    const result = await service.listAll(req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
    sendSuccess(res, await service.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
    sendCreated(res, await service.createEditorial(req.body, req.admin?._id))
})

const update = catchAsync(async (req, res) => {
    sendSuccess(res, await service.updateEditorial(req.params.id, req.body, req.admin?._id))
})

const remove = catchAsync(async (req, res) => {
    await service.softDelete(req.params.id, req.admin?._id)
    sendSuccess(res, null, 'Editorial deleted')
})

module.exports = { list, getOne, create, update, remove }