const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const homeService = require('./home.service')

const getHome = catchAsync(async (req, res) => {
  sendSuccess(res, await homeService.getHome(req.user.examId))
})

module.exports = { getHome }
