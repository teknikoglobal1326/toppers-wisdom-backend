const catchAsync = require('../../core/catchAsync')
const { sendPaginated } = require('../../core/response')
const faqService = require('./faq.service')

const list = catchAsync(async (req, res) => {
    const result = await faqService.listAll(req.query)
    sendPaginated(res, result.data, result.pagination)
})

module.exports = { list }
