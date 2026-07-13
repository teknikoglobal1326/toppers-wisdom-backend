const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated } = require('../../core/response')
const AppError = require('../../core/AppError')
const Permission = require('../../models/Permission.model')

const list = catchAsync(async (req, res) => {
  const filter = { isDeleted: false }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive
  }

  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i')
    filter.$or = [
      { module: rx },
      { action: rx },
      { key: rx },
      { description: rx },
    ]
  }

  const permissions = await Permission.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean()
  sendSuccess(res, { permissions })
})

const getOne = catchAsync(async (req, res) => {
  const permission = await Permission.findOne({ _id: req.params.id, isDeleted: false }).lean()
  if (!permission) throw new AppError('Permission not found', 404, 'NOT_FOUND')
  sendSuccess(res, { permission })
})

const create = catchAsync(async (req, res) => {
  const permission = await Permission.create(req.body)
  sendCreated(res, { permission }, 'Permission created')
})

const update = catchAsync(async (req, res) => {
  const permission = await Permission.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    req.body,
    { new: true, runValidators: true },
  ).lean()

  if (!permission) throw new AppError('Permission not found', 404, 'NOT_FOUND')
  sendSuccess(res, { permission }, 'Permission updated')
})

const remove = catchAsync(async (req, res) => {
  const permission = await Permission.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, isActive: false },
    { new: true },
  ).lean()

  if (!permission) throw new AppError('Permission not found', 404, 'NOT_FOUND')
  sendSuccess(res, null, 'Permission deleted')
})

module.exports = { list, getOne, create, update, remove }
