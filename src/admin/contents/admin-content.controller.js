const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminContentService = require('./admin-content.service')

const list = catchAsync(async (req, res) => {
  const result = await adminContentService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const listLiveClasses = catchAsync(async (req, res) => {
  const result = await adminContentService.listLiveClasses(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminContentService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminContentService.createContent(payload))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminContentService.updateContent(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminContentService.softDelete(req.params.id)
  sendSuccess(res, null, 'Content deleted')
})

const createLiveClass = catchAsync(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.admin?._id,
    isLive: true,
    agoraChannel: `channel_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  }
  sendCreated(res, await adminContentService.createContent(payload))
})

const goLive = catchAsync(async (req, res) => {
  sendSuccess(res, await adminContentService.goLive(req.params.id))
})

const endLive = catchAsync(async (req, res) => {
  sendSuccess(res, await adminContentService.endLive(req.params.id))
})

module.exports = { list, listLiveClasses, getOne, create, update, remove, createLiveClass, goLive, endLive }
