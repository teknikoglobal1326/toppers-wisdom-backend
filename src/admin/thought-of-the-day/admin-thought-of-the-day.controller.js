const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminThoughtOfTheDayService = require('./admin-thought-of-the-day.service')

const list = catchAsync(async (req, res) => {
  const r = await adminThoughtOfTheDayService.listAll(req.query)
  
  const ThoughtOfTheDay = require('../../models/ThoughtOfTheDay.model')
  const [globalTotal, globalActive, globalInactive] = await Promise.all([
    ThoughtOfTheDay.countDocuments({ isDeleted: false }),
    ThoughtOfTheDay.countDocuments({ isDeleted: false, status: 'active' }),
    ThoughtOfTheDay.countDocuments({ isDeleted: false, status: 'inactive' }),
  ])
  
  r.pagination.globalTotal = globalTotal
  r.pagination.globalActive = globalActive
  r.pagination.globalInactive = globalInactive
  
  sendPaginated(res, r.data, r.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminThoughtOfTheDayService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminThoughtOfTheDayService.createThought(payload, req.file))
})

const update = catchAsync(async (req, res) => {
  sendSuccess(res, await adminThoughtOfTheDayService.updateThought(req.params.id, req.body, req.file))
})

const remove = catchAsync(async (req, res) => {
  await adminThoughtOfTheDayService.softDelete(req.params.id)
  sendSuccess(res, null, 'Thought of the day deleted')
})

module.exports = { list, getOne, create, update, remove }
