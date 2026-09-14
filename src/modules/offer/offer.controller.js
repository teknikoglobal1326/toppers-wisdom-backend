const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const offerService = require('./offer.service')

const list = catchAsync(async (req, res) => {
    const latestRecord = await offerService.getLatest(req.query, req.user)
    sendSuccess(res, latestRecord)
})
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await offerService.getOne(req.params.id)) })

module.exports = { list, getOne }
