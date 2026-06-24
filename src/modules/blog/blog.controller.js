const catchAsync                     = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const blogService                    = require('./blog.service')

const listPosts = catchAsync(async (req, res) => {
  const r = await blogService.listPosts(req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getPost = catchAsync(async (req, res) => {
  sendSuccess(res, await blogService.getPost(req.params.slug))
})

module.exports = { listPosts, getPost }
