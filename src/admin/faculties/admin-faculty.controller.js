const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminFacultyService = require('./admin-faculty.service')

const list = catchAsync(async (req, res) => {
  const result = await adminFacultyService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const faculty = await adminFacultyService.getOne(req.params.id)
  sendSuccess(res, faculty)
})

const create = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const faculty = await adminFacultyService.createFaculty(req.body, req.file, adminId)
  sendCreated(res, faculty, 'Faculty member created successfully')
})

const update = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const faculty = await adminFacultyService.updateFaculty(req.params.id, req.body, req.file, adminId)
  sendSuccess(res, faculty, 'Faculty member updated successfully')
})

const remove = catchAsync(async (req, res) => {
  await adminFacultyService.softDelete(req.params.id)
  sendSuccess(res, null, 'Faculty member deleted successfully')
})

const hardRemove = catchAsync(async (req, res) => {
  await adminFacultyService.hardDelete(req.params.id)
  sendSuccess(res, null, 'Faculty member permanently deleted')
})

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  hardRemove
}
