const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const courseService = require('./course.service')

const listCourseSubjects = catchAsync(async (req, res) => {
  console.log("req.user========>", req.user);
  const result = await courseService.listCourseSubjects(req.user._id, req.query)

  if (result && result.length > 0) {
    result.unshift({ _id: 'all', name: 'All' });
  }

  sendSuccess(res, result)
})

const listCourses = catchAsync(async (req, res) => {
  const subjectParam = req.query.subject || req.query.subjectId;
  if (subjectParam && String(subjectParam).toLowerCase() === 'all') {
    delete req.query.subject;
    delete req.query.subjectId;
  }

  const result = await courseService.listCourses(req.user._id, [], req.query, req.lang)
  console.log("result========>", result);
  sendPaginated(res, result.data, result.pagination)
})

const myCourses = catchAsync(async (req, res) => {
  const result = await courseService.myCourses(req.user._id, req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getCourse(req.params.id, req.user._id))
})

const getVideoUrl = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getVideoUrl(req.params.id, req.params.lessonId, req.user._id))
})

const enrollFree = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.enrollFree(req.params.id, req.user._id), 'Enrolled successfully')
})

const addReview = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.addReview(req.params.id, req.user._id, req.body), 'Review submitted')
})

const getTimetable = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getTimetable(req.params.id))
})

const checkout = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.checkout(req.params.id, req.user._id))
})

const createRazorpayOrder = catchAsync(async (req, res) => {
  const { amount, discount, gstRate, gstAmount, grandTotal } = req.body;
  const amountDetails = { amount, discount, gstRate, gstAmount, grandTotal };
  sendSuccess(res, await courseService.createRazorpayOrder(req.params.id, req.user._id, amountDetails))
})

const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  sendSuccess(res, await courseService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature), 'Payment verified successfully')
})

module.exports = { listCourseSubjects, listCourses, myCourses, getCourse, getVideoUrl, enrollFree, addReview, getTimetable, checkout, createRazorpayOrder, verifyPayment }
