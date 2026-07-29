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

const bulkCreate = catchAsync(async (req, res) => {
  const common = req.body || {}
  const file = req.files && req.files.file ? req.files.file[0] : (req.file || null)
  const adminId = req.admin?._id || req.user?._id || req.user?.id

  const created = await adminCourseTestService.bulkUpload(file, common, adminId)
  sendCreated(res, created)
})

module.exports = { list, getOne, create, update, remove, bulkCreate }
