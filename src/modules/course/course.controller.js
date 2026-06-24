const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const courseService = require('./course.service')

const listCourses = catchAsync(async (req, res) => {
  const result = await courseService.listCourses(req.user._id, req.user.subExamId, req.query, req.lang)
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

module.exports = { listCourses, getCourse, getVideoUrl, enrollFree, addReview, getTimetable }