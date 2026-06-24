const catchAsync      = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const boosterService  = require('./booster.service')

const listBoosters = catchAsync(async (req, res) => {
  const r = await boosterService.listBoosters(req.user.subExamId, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getBooster  = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.getBooster(req.params.id, req.user._id)) })
const getAudioUrl = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.getAudioUrl(req.params.id, req.params.itemId, req.user._id)) })
const saveItem    = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.saveItem(req.user._id, req.params.id, req.params.itemId)) })
const reportItem  = catchAsync(async (req, res) => { sendSuccess(res, await boosterService.reportItem(req.user._id, req.params.id, req.params.itemId, req.body.reason)) })

module.exports = { listBoosters, getBooster, getAudioUrl, saveItem, reportItem }
