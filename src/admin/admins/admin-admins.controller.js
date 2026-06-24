const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const Admin    = require('../../models/Admin.model')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

const logger = createLogger('admin:admins')

const list = catchAsync(async (req, res) => {
  const admins = await Admin.find().select('-password').sort({ createdAt: -1 }).lean()
  sendSuccess(res, { admins })
})

const getOne = catchAsync(async (req, res) => {
  const admin = await Admin.findById(req.params.id).select('-password').lean()
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND')
  sendSuccess(res, { admin })
})

const create = catchAsync(async (req, res) => {
  const { name, email, password, role, permissions } = req.body

  const exists = await Admin.exists({ email })
  if (exists) throw new AppError('Email already in use', 409, 'CONFLICT')

  const admin = await Admin.create({
    name, email, password, role,
    permissions: permissions || [],
    createdBy:   req.admin._id,
  })

  const adminObj = admin.toObject()
  delete adminObj.password
  logger.info({ createdBy: req.admin._id, newAdminId: admin._id }, 'Admin created')
  sendSuccess(res, { admin: adminObj }, 'Admin created', 201)
})

const update = catchAsync(async (req, res) => {
  const { role, permissions, isActive, name } = req.body

  if (req.params.id === req.admin._id.toString() && isActive === false) {
    throw new AppError('Cannot deactivate your own account', 400, 'BAD_REQUEST')
  }

  const admin = await Admin.findById(req.params.id)
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND')

  if (name        !== undefined) admin.name        = name
  if (role        !== undefined) admin.role        = role
  if (permissions !== undefined) admin.permissions = permissions
  if (isActive    !== undefined) admin.isActive    = isActive

  await admin.save()
  logger.info({ updatedBy: req.admin._id, adminId: admin._id }, 'Admin updated')

  const adminObj = admin.toObject()
  delete adminObj.password
  sendSuccess(res, { admin: adminObj }, 'Admin updated')
})

const remove = catchAsync(async (req, res) => {
  if (req.params.id === req.admin._id.toString()) {
    throw new AppError('Cannot delete your own account', 400, 'BAD_REQUEST')
  }

  const admin = await Admin.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).lean()
  if (!admin) throw new AppError('Admin not found', 404, 'NOT_FOUND')

  logger.info({ deactivatedBy: req.admin._id, adminId: req.params.id }, 'Admin deactivated')
  sendSuccess(res, null, 'Admin deactivated')
})

module.exports = { list, getOne, create, update, remove }