const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCourseService = require('./admin-course.service')

const listAll = catchAsync(async (req, res) => { const r = await adminCourseService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const listPurchases = catchAsync(async (req, res) => { const r = await adminCourseService.listPurchases(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getById(req.params.id)) })
const createCourse = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.create({ ...req.body, createdBy: req.admin._id })) })
const updateCourse = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.update(req.params.id, req.body)) })
const deleteCourse = catchAsync(async (req, res) => { await adminCourseService.archive(req.params.id); sendSuccess(res, null, 'Course archived') })
const publish = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.publish(req.params.id), 'Course published') })
const mapFaculties = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.mapFaculties(req.params.id, req.body.faculties), 'Faculties mapped successfully') })
const addLesson = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.addLesson(req.params.id, req.body)) })
const removeLesson = catchAsync(async (req, res) => { await adminCourseService.removeLesson(req.params.id, req.params.lessonId); sendSuccess(res, null, 'Lesson removed') })
const uploadUrl = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getLessonUploadUrl(req.params.id, req.params.lessonId, req.body.contentType)) })
const thumbnailUploadUrl = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getThumbnailUploadUrl(req.params.id, req.body.contentType)) })
const bannerUploadUrl = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getBannerUploadUrl(req.params.id, req.body.contentType)) })
const updateTimetable = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.updateTimetable(req.params.id, req.body), 'Timetable updated successfully') })
const getAssociatedData = catchAsync(async (req, res) => {
  const { courseId, type } = req.query
  if (!courseId || !type) {
    return res.status(400).json({ success: false, message: 'courseId and type are required' })
  }
  sendSuccess(res, await adminCourseService.getAssociatedData(courseId, type,testId))
})

const uploadPdfForCourse = catchAsync(async (req, res) => {
  const result = await adminCourseService.uploadPdfForCourse(req.params.id, {
    ...req.body,
    createdBy: req.admin._id
  })
  sendCreated(res, result, 'PDF uploaded successfully')
})

const listPdfsForCourse = catchAsync(async (req, res) => {
  const result = await adminCourseService.listPdfsForCourse(req.params.id, req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getPdfForCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await adminCourseService.getPdfForCourse(req.params.id, req.params.pdfId))
})

const updatePdfForCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await adminCourseService.updatePdfForCourse(req.params.id, req.params.pdfId, req.body))
})

const deletePdfForCourse = catchAsync(async (req, res) => {
  await adminCourseService.deletePdfForCourse(req.params.id, req.params.pdfId)
  sendSuccess(res, null, 'PDF deleted successfully')
})

const uploadTestForCourse = catchAsync(async (req, res) => {
  const result = await adminCourseService.uploadTestForCourse(req.params.id, {
    ...req.body,
    createdBy: req.admin._id
  })
  sendCreated(res, result, 'Test uploaded successfully')
})

const listTestsForCourse = catchAsync(async (req, res) => {
  const result = await adminCourseService.listTestsForCourse(req.params.id, req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getTestForCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await adminCourseService.getTestForCourse(req.params.id, req.params.testId))
})

const updateTestForCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await adminCourseService.updateTestForCourse(req.params.id, req.params.testId, req.body))
})

const deleteTestForCourse = catchAsync(async (req, res) => {
  await adminCourseService.deleteTestForCourse(req.params.id, req.params.testId)
  sendSuccess(res, null, 'Test deleted successfully')
})

module.exports = { listAll, listPurchases, getOne, createCourse, updateCourse, deleteCourse, publish, mapFaculties, addLesson, removeLesson, uploadUrl, thumbnailUploadUrl, bannerUploadUrl, updateTimetable, getAssociatedData, uploadPdfForCourse, listPdfsForCourse, getPdfForCourse, updatePdfForCourse, deletePdfForCourse, uploadTestForCourse, listTestsForCourse, getTestForCourse, updateTestForCourse, deleteTestForCourse }
