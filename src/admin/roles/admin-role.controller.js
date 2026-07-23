const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const Role = require('../../models/Role.model')
const { paginate } = require('../../core/paginate')

const list = catchAsync(async (req, res) => {
  const filter = { isDeleted: false }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive
  }

  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i')
    filter.$or = [{ name: rx }, { description: rx }]
  }

  const sortBy = req.query.sortBy || 'sortOrder'
  const sortDirection = req.query.order === 'desc' ? -1 : 1
  console.log('Query:', req.query, 'SortBy:', sortBy, 'SortDirection:', sortDirection)
  const { data: roles, pagination } = await paginate(Role, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { [sortBy]: sortDirection },
  })

  sendPaginated(res, roles, pagination)
})

const getOne = catchAsync(async (req, res) => {
  const role = await Role.findOne({ _id: req.params.id, isDeleted: false }).lean()

  if (!role) throw new AppError('Role not found', 404, 'NOT_FOUND')
  sendSuccess(res, { role })
})

const create = catchAsync(async (req, res) => {
  const role = await Role.create({ ...req.body })
  sendCreated(res, { role }, 'Role created')
})

const update = catchAsync(async (req, res) => {
  const role = await Role.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { ...req.body },
    { new: true, runValidators: true },
  )
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
