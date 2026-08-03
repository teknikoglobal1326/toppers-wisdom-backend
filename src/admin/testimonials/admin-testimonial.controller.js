const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminTestimonialService = require('./admin-testimonial.service')

const listTestimonials = catchAsync(async (req, res) => {
  const result = await adminTestimonialService.listTestimonials(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getTestimonial = catchAsync(async (req, res) => {
  const testimonial = await adminTestimonialService.getTestimonial(req.params.id)
  sendSuccess(res, testimonial)
})

const createTestimonial = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const testimonial = await adminTestimonialService.createTestimonial(req.body, adminId)
  sendCreated(res, testimonial, 'Testimonial created successfully')
})

const updateTestimonial = catchAsync(async (req, res) => {
  const adminId = req.admin?._id
  const testimonial = await adminTestimonialService.updateTestimonial(req.params.id, req.body, adminId)
  sendSuccess(res, testimonial, 'Testimonial updated successfully')
})

const deleteTestimonial = catchAsync(async (req, res) => {
  await adminTestimonialService.deleteTestimonial(req.params.id)
  sendSuccess(res, null, 'Testimonial deleted successfully')
})

module.exports = {
  listTestimonials,
  getTestimonial,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial
}
