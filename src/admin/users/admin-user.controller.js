const catchAsync     = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const BaseService    = require('../../core/BaseService')
const userRepository = require('../../modules/user/user.repository')
const { paginate }   = require('../../core/paginate')
const Order          = require('../../models/Order.model')
const TestAttempt    = require('../../models/TestAttempt.model')

class AdminUserService extends BaseService {
  constructor() { super(userRepository, 'admin:user') }

  async listAll(filters) {
    const filter = { role: 'user', isDeleted: { $ne: true } }
    if (filters.search) filter.$or = [
      { name:  { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
    ]
    return this.getAll(filter, {
      page:   filters.page,
      limit:  filters.limit,
      select: 'name phone qualification exam subExams profileCompletionState profileComplete createdAt',
    })
  }
}

const svc = new AdminUserService()

const listAll     = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne      = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const updateUser  = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })

const getUserOrders = catchAsync(async (req, res) => {
  const r = await paginate(Order, { user: req.params.id }, { page: req.query.page, limit: req.query.limit })
  sendPaginated(res, r.data, r.pagination)
})

const getUserAttempts = catchAsync(async (req, res) => {
  const r = await paginate(TestAttempt, { user: req.params.id }, { page: req.query.page, limit: req.query.limit, sort: { attemptedAt: -1 } })
  sendPaginated(res, r.data, r.pagination)
})

module.exports = { listAll, getOne, updateUser, getUserOrders, getUserAttempts }
