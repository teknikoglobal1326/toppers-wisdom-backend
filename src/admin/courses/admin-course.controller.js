const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCourseService = require('./admin-course.service')

const listAll      = catchAsync(async (req, res) => { const r = await adminCourseService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne       = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getById(req.params.id)) })
const createCourse = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.create({ ...req.body, createdBy: req.admin._id })) })
const updateCourse = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.update(req.params.id, req.body)) })
const deleteCourse = catchAsync(async (req, res) => { await adminCourseService.archive(req.params.id); sendSuccess(res, null, 'Course archived') })
const publish      = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.publish(req.params.id), 'Course published') })
const addLesson    = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.addLesson(req.params.id, req.body)) })
const removeLesson = catchAsync(async (req, res) => { await adminCourseService.removeLesson(req.params.id, req.params.lessonId); sendSuccess(res, null, 'Lesson removed') })
const uploadUrl         = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getLessonUploadUrl(req.params.id, req.params.lessonId, req.body.contentType)) })
const thumbnailUploadUrl = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getThumbnailUploadUrl(req.params.id, req.body.contentType)) })
const bannerUploadUrl    = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getBannerUploadUrl(req.params.id, req.body.contentType)) })
const updateTimetable    = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.updateTimetable(req.params.id, req.body), 'Timetable updated successfully') })

module.exports = { listAll, getOne, createCourse, updateCourse, deleteCourse, publish, addLesson, removeLesson, uploadUrl, thumbnailUploadUrl, bannerUploadUrl, updateTimetable }