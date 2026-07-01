const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCourseTestService = require('./admin-course-test.service')

const list = catchAsync(async (req, res) => {
  const result = await adminCourseTestService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  sendSuccess(res, await adminCourseTestService.getOne(req.params.id))
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendCreated(res, await adminCourseTestService.createCourseTest(payload))
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body, createdBy: req.admin?._id }
  sendSuccess(res, await adminCourseTestService.updateCourseTest(req.params.id, payload))
})

const remove = catchAsync(async (req, res) => {
  await adminCourseTestService.softDelete(req.params.id)
  sendSuccess(res, null, 'Course test deleted')
})

module.exports = { list, getOne, create, update, remove }
