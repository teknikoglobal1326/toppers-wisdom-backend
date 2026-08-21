const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const couponRepository = require('../../modules/coupon/coupon.repository')

class AdminCouponService extends BaseService {
  constructor() {
    super(couponRepository, 'admin:coupon')
  }

  buildFilter({ status, search } = {}) {
    const filter = { isDeleted: false }

    if (status) filter.status = status

    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { code: rx },
        { description: rx }
      ]
    }

    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder !== undefined ? Number(query.sortOrder) : -1
    const sortBy = query.sortBy || 'createdAt'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction }
    })
  }

  async getOne(id) {
    const coupon = await couponRepository.findOne({ _id: id, isDeleted: false })
    if (!coupon) throw new AppError('Coupon not found', 404, 'NOT_FOUND')
    return coupon
  }

  async createCoupon(data, adminId) {
    // Check if coupon code already exists (active or inactive, not deleted)
    const existing = await couponRepository.findOne({ 
      code: data.code.toUpperCase(), 
      isDeleted: false 
    })
    if (existing) {
      throw new AppError('Coupon code already exists', 400, 'DUPLICATE_ERROR')
    }

    const payload = { 
      ...data, 
      code: data.code.toUpperCase(), 
      createdBy: adminId, 
      updatedBy: adminId 
    }
    return this.create(payload)
  }

  async updateCoupon(id, data, adminId) {
    const existing = await couponRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Coupon not found', 404, 'NOT_FOUND')

    if (data.code) {
      const codeCheck = await couponRepository.findOne({
        _id: { $ne: id },
        code: data.code.toUpperCase(),
        isDeleted: false
      })
      if (codeCheck) {
        throw new AppError('Coupon code already exists', 400, 'DUPLICATE_ERROR')
      }
    }

    const payload = { ...data, updatedBy: adminId }
    if (payload.code) payload.code = payload.code.toUpperCase()

    return couponRepository.updateById(id, payload)
  }

  async softDelete(id, adminId) {
    const existing = await couponRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Coupon not found', 404, 'NOT_FOUND')

    return couponRepository.updateById(id, {
      isDeleted: true,
      status: 'inactive',
      updatedBy: adminId,
    })
  }
}

module.exports = new AdminCouponService()
