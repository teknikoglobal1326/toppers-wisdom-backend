const path = require('path')
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const AppError = require('../../core/AppError')
const Member = require('../../models/Member.model')
const Role = require('../../models/Role.model')
const { uploadFile } = require('../../lib/fileUpload')
const { paginate } = require('../../core/paginate')

const ensureRoleExists = async (roleId) => {
  const role = await Role.findOne({ _id: roleId, isDeleted: false, isActive: true }).lean()
  if (!role) throw new AppError('Role not found or inactive', 400, 'BAD_REQUEST')
}

const uploadProfileImage = async (file) => {
  if (!file) return null
  const ext = path.extname(file.originalname) || '.jpg'
  const filename = `member-${Date.now()}${ext}`
  return uploadFile(file.buffer, filename, 'users', file.mimetype)
}

const list = catchAsync(async (req, res) => {
  const filter = { isDeleted: false }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive
  }

  if (req.query.role) {
    filter.role = req.query.role
  }

  if (req.query.search) {
    const rx = new RegExp(req.query.search, 'i')
    filter.$or = [{ name: rx }, { email: rx }]
  }

  const sortBy = req.query.sortBy || 'sortOrder'
  const sortDirection = req.query.order === 'desc' ? -1 : 1
  console.log('Query:', req.query, 'SortBy:', sortBy, 'SortDirection:', sortDirection)

  const { data: members, pagination } = await paginate(Member, filter, {
    page: req.query.page,
    limit: req.query.limit,
    sort: { [sortBy]: sortDirection },
    select: '-password',
    populate: { path: 'role', select: 'name permissions', match: { isDeleted: false } },
  })

  sendPaginated(res, members, pagination)
})

const getOne = catchAsync(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.id, isDeleted: false })
    .select('-password')
    .populate({ path: 'role', select: 'name permissions', match: { isDeleted: false } })
    .lean()

  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND')
  sendSuccess(res, { member })
})

const create = catchAsync(async (req, res) => {
  await ensureRoleExists(req.body.role)

  const payload = { ...req.body }
  const imageUrl = await uploadProfileImage(req.file)
  if (imageUrl) {
    payload.profileImage = imageUrl
  }

  const member = await Member.create(payload)
  const memberData = await Member.findById(member._id)
    .select('-password')
    .populate({ path: 'role', select: 'name permissions', match: { isDeleted: false } })
    .lean()

  sendCreated(res, { member: memberData }, 'Member created')
})

const update = catchAsync(async (req, res) => {
  const member = await Member.findOne({ _id: req.params.id, isDeleted: false })
  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND')

  if (req.body.role !== undefined) {
    await ensureRoleExists(req.body.role)
  }

  if (req.body.name !== undefined) member.name = req.body.name
  if (req.body.email !== undefined) member.email = req.body.email
  if (req.body.phone !== undefined) member.phone = req.body.phone
  if (req.body.password !== undefined) member.password = req.body.password
  if (req.body.role !== undefined) member.role = req.body.role
  if (req.body.sortOrder !== undefined) member.sortOrder = req.body.sortOrder
  if (req.body.isActive !== undefined) member.isActive = req.body.isActive

  const imageUrl = await uploadProfileImage(req.file)
  if (imageUrl) member.profileImage = imageUrl

  await member.save()

  const memberData = await Member.findById(member._id)
    .select('-password')
    .populate({ path: 'role', select: 'name permissions', match: { isDeleted: false } })
    .lean()

  sendSuccess(res, { member: memberData }, 'Member updated')
})

const remove = catchAsync(async (req, res) => {
  const member = await Member.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true, isActive: false },
    { new: true },
  ).lean()

  if (!member) throw new AppError('Member not found', 404, 'NOT_FOUND')
  sendSuccess(res, null, 'Member deleted')
})

module.exports = { list, getOne, create, update, remove }
