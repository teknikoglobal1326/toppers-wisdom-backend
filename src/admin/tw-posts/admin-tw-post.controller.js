const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminTWPostService = require('./admin-tw-post.service')

const list = catchAsync(async (req, res) => {
  const r = await adminTWPostService.listAll(req.query)
  
  const TWPost = require('../../models/TWPost.model')
  const [globalTotal, globalActive, globalInactive] = await Promise.all([
    TWPost.countDocuments({ isDeleted: false }),
    TWPost.countDocuments({ isDeleted: false, status: 'active' }),
    TWPost.countDocuments({ isDeleted: false, status: 'inactive' }),
  ])
  
  r.pagination.globalTotal = globalTotal
  r.pagination.globalActive = globalActive
  r.pagination.globalInactive = globalInactive
  
  sendPaginated(res, r.data, r.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminTWPostService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminTWPostService.createPost(payload, req.file))
})

const update = catchAsync(async (req, res) => {
  sendSuccess(res, await adminTWPostService.updatePost(req.params.id, req.body, req.file))
})

const remove = catchAsync(async (req, res) => {
  await adminTWPostService.softDelete(req.params.id)
  sendSuccess(res, null, 'TW Post deleted')
})

module.exports = { list, getOne, create, update, remove }
