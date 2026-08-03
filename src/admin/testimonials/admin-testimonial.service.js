const BaseService = require('../../core/BaseService')
const Testimonial = require('../../models/Testimonial.model')
const AppError = require('../../core/AppError')

class AdminTestimonialService extends BaseService {
  constructor() {
    super(Testimonial, 'admin:testimonial')
  }

  async listTestimonials({ page, limit, search } = {}) {
    const filter = { isDeleted: false }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { exam: { $regex: search, $options: 'i' } },
        { reviewText: { $regex: search, $options: 'i' } }
      ]
    }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 20)
    const skip = (pageNum - 1) * limitNum

    const [total, data] = await Promise.all([
      Testimonial.countDocuments(filter),
      Testimonial.find(filter)
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ])

    return {
      data,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    }
  }

  async getTestimonial(id) {
    const testimonial = await Testimonial.findOne({ _id: id, isDeleted: false })
    if (!testimonial) throw new AppError('Testimonial not found', 404, 'NOT_FOUND')
    return testimonial
  }

  async createTestimonial(data, adminId) {
    const testimonial = await Testimonial.create({
      ...data,
      createdBy: adminId
    })
    return testimonial
  }

  async updateTestimonial(id, data, adminId) {
    const testimonial = await Testimonial.findOne({ _id: id, isDeleted: false })
    if (!testimonial) throw new AppError('Testimonial not found', 404, 'NOT_FOUND')

    Object.assign(testimonial, data)
    await testimonial.save()
    return testimonial
  }

  async deleteTestimonial(id) {
    const testimonial = await Testimonial.findOne({ _id: id, isDeleted: false })
    if (!testimonial) throw new AppError('Testimonial not found', 404, 'NOT_FOUND')

    testimonial.isDeleted = true
    await testimonial.save()
    return testimonial
  }
}

module.exports = new AdminTestimonialService()
