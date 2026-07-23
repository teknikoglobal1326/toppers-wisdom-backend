const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const offerService = require('./offer.service')

const list = catchAsync(async (req, res) => {
    // Get only the single latest record directly using findOne
    const latestRecord = await offerService.getLatest(req.query)
    sendSuccess(res, latestRecord)
})
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await offerService.getOne(req.params.id)) })

module.exports = { list, getOne }
