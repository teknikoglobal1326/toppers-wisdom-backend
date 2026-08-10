const catchAsync = require('../../core/catchAsync')
const { sendPaginated } = require('../../core/response')
const thoughtOfTheDayService = require('./thought-of-the-day.service')

const listFeed = catchAsync(async (req, res) => {
  const result = await thoughtOfTheDayService.listFeed(req.query)
  sendPaginated(res, result.data, result.pagination)
})

module.exports = { listFeed }
