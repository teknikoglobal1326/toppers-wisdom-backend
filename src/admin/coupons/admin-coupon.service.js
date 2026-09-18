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

  async getUsages(id) {
    const coupon = await this.getOne(id)
    const CourseOrder = require('../../models/CourseOrder.model')
    const SubscriptionOrder = require('../../models/SubscriptionOrder.model')

    const couponFilter = {
      $or: [
        { 'couponApplied.couponId': coupon._id },
        { 'couponApplied.code': coupon.code }
      ]
    }

    const courseOrders = await CourseOrder.find(couponFilter)
      .populate('user', 'name email phone avatar')
      .sort({ createdAt: -1 })
      .lean()

    const subOrders = await SubscriptionOrder.find(couponFilter)
      .populate('user', 'name email phone avatar')
      .populate('subscription', 'title price')
      .sort({ createdAt: -1 })
      .lean()

    const usages = []

    courseOrders.forEach(o => {
      const itemNames = (o.items || []).map(i => i.title || `${i.itemType}`).join(', ') || 'Course'
      const itemType = (o.items && o.items[0]?.itemType) || 'course'
      const originalAmt = (Number(o.totalAmount || o.grandTotal || 0)) + (Number(o.discount || o.couponApplied?.discountAmount || 0))
      const discountAmt = Number(o.couponApplied?.discountAmount || o.discount || 0)
      const paidAmt = Number(o.grandTotal || o.totalAmount || 0)

      usages.push({
        id: o._id,
        orderType: itemType,
        orderId: o.razorpayOrderId || String(o._id),
        paymentId: o.razorpayPaymentId || 'N/A',
        user: {
          _id: o.user?._id || o.userId,
          name: o.user?.name || o.userName || 'Student',
          email: o.user?.email || o.userEmail || 'N/A',
          phone: o.user?.phone || o.userPhone || '',
          avatar: o.user?.avatar
        },
        purchasedItem: itemNames,
        itemType: itemType.toUpperCase(),
        originalAmount: originalAmt,
        discountAmount: discountAmt,
        paidAmount: paidAmt,
        status: (o.status || 'paid').toLowerCase(),
        usedAt: o.paidAt || o.createdAt
      })
    })

    subOrders.forEach(s => {
      const subTitle = s.subscription?.title || s.subscriptionDetails?.title || 'Subscription Plan'
      const discountAmt = Number(s.couponApplied?.discountAmount || 0)
      const paidAmt = Number(s.amount || s.grandTotal || 0)
      const originalAmt = paidAmt + discountAmt

      usages.push({
        id: s._id,
        orderType: 'subscription',
        orderId: s.razorpayOrderId || String(s._id),
        paymentId: s.razorpayPaymentId || 'N/A',
        user: {
          _id: s.user?._id || s.userId,
          name: s.user?.name || s.userName || 'Student',
          email: s.user?.email || s.userEmail || 'N/A',
          phone: s.user?.phone || s.userPhone || '',
          avatar: s.user?.avatar
        },
        purchasedItem: subTitle,
        itemType: 'SUBSCRIPTION',
        originalAmount: originalAmt,
        discountAmount: discountAmt,
        paidAmount: paidAmt,
        status: (s.status || (s.isActive ? 'paid' : 'inactive')).toLowerCase(),
        usedAt: s.paidAt || s.createdAt
      })
    })

    usages.sort((a, b) => new Date(b.usedAt || 0).getTime() - new Date(a.usedAt || 0).getTime())

    const totalUsages = usages.length
    const uniqueStudents = new Set(usages.map(u => String(u.user._id || u.user.phone || u.user.email || u.user.name))).size
    const totalDiscountGiven = usages.reduce((acc, u) => acc + u.discountAmount, 0)
    const totalRevenueGenerated = usages.reduce((acc, u) => acc + u.paidAmount, 0)

    return {
      coupon,
      stats: {
        totalUsages,
        uniqueStudents,
        totalDiscountGiven,
        totalRevenueGenerated
      },
      usages
    }
  }

  async createCoupon(data, adminId) {
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