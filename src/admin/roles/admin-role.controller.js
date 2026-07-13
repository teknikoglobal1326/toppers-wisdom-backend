const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated } = require('../../core/response')
const AppError = require('../../core/AppError')
const Role = require('../../models/Role.model')
const Permission = require('../../models/Permission.model')

const ensurePermissionsExist = async (permissionIds = []) => {
  if (!permissionIds.length) return

  const existing = await Permission.countDocuments({
    _id: { $in: permissionIds },
    isDeleted: false,
    isActive: true,
  })

  if (existing !== permissionIds.length) {
    throw new AppError('One or more permissions are invalid or inactive', 400, 'BAD_REQUEST')
  }
}

const list = catchAsync(async (req, res) => {
  const filter = { isDeleted: false }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive
  }

  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i')
    filter.$or = [{ name: rx }, { description: rx }]
  }

  const roles = await Role.find(filter)
    .populate({ path: 'permissions', select: 'module action key', match: { isDeleted: false } })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  sendSuccess(res, { roles })
})

const getOne = catchAsync(async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, isDeleted: false })
    .populate({ path: 'permissions', select: 'module action key', match: { isDeleted: false } })
    .lean()

  if (!role) throw new AppError('Role not found', 404, 'NOT_FOUND')
  sendSuccess(res, { role })
})

const create = catchAsync(async (req, res) => {
  const payload = { ...req.body }
  await ensurePermissionsExist(payload.permissions || [])

  const role = await Role.create(payload)
  const roleData = await Role.findById(role._id)
    .populate({ path: 'permissions', select: 'module action key', match: { isDeleted: false } })
    .lean()

  sendCreated(res, { role: roleData }, 'Role created')
})

const update = catchAsync(async (req, res) => {
  const payload = { ...req.body }

  if (payload.permissions) {
    await ensurePermissionsExist(payload.permissions)
  }

  const role = await Role.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    payload,
    { new: true, runValidators: true },
  )
    .populate({ path: 'permissions', select: 'module action key', match: { isDeleted: false } })
    .lean()

  if (!role) throw new AppError('Role not found', 404, 'NOT_FOUND')
  sendSuccess(res, { role }, 'Role updated')
})

const remove = catchAsync(async (req, res) => {
  const role = await Role.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, isActive: false },
    { new: true },
  ).lean()

  if (!role) throw new AppError('Role not found', 404, 'NOT_FOUND')
  sendSuccess(res, null, 'Role deleted')
})

module.exports = { list, getOne, create, update, remove }
