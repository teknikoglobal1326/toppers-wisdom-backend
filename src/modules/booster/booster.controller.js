const catchAsync     = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const boosterService = require('./booster.service')

const listBoosters = catchAsync(async (req, res) => {
  const r = await boosterService.listBoosters(req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getBooster = catchAsync(async (req, res) => {
  sendSuccess(res, await boosterService.getBooster(req.params.id, req.user._id))
})

module.exports = { listBoosters, getBooster }
