const router = require('express').Router()
const controller = require('./admin-course.controller')
const { validate, validateQuery } = require('../../core/validate')
const { uploadCourseImages, parseFormData, uploadTimetableFile, parseTimetableForm } = require('./admin-course.upload')
const {
    createCourseSchema,
    updateCourseSchema,
    addLessonSchema,
    uploadUrlSchema,
    imageUploadSchema,
    listQuerySchema,
} = require('./admin-course.schema')

const { uploadPdf, upload } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('../pdfs/admin-pdf.service')
const { createPdfSchema, updatePdfSchema } = require('../pdfs/admin-pdf.schema')

const { attachUploadedFiles: attachTestUploadedFiles } = require('../course-tests/admin-course-test.service')
const { createCourseTestSchema, updateCourseTestSchema } = require('../course-tests/admin-course-test.schema')

const uploadPdfFields = uploadPdf.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

const uploadTestFields = upload.fields([
  { name: 'image', maxCount: 1 },
])

const parseArrays = (req, res, next) => {
  const arrayFields = ['subjects', 'topics', 'chapters', 'masterIds']
  for (const field of arrayFields) {
    if (req.body[field] && typeof req.body[field] === 'string') {
      try {
        req.body[field] = JSON.parse(req.body[field])
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${field} JSON format`
        })
      }
    }
  }
  next()
}

router.get('/', validateQuery(listQuerySchema), controller.listAll)
router.get('/purchases', validateQuery(listQuerySchema), controller.listPurchases)
router.post('/', uploadCourseImages, parseFormData, validate(createCourseSchema), controller.createCourse)
router.get('/associated-data', controller.getAssociatedData)
router.get('/:id', controller.getOne)
router.put('/:id', uploadCourseImages, parseFormData, validate(updateCourseSchema), controller.updateCourse)
router.delete('/:id', controller.deleteCourse)
router.patch('/:id/publish', controller.publish)
router.patch('/:id/faculties', controller.mapFaculties)
router.post('/:id/lessons', validate(addLessonSchema), controller.addLesson)
router.delete('/:id/lessons/:lessonId', controller.removeLesson)
router.post('/:id/lessons/:lessonId/upload-url', validate(uploadUrlSchema), controller.uploadUrl)
router.post('/:id/thumbnail-upload-url', validate(imageUploadSchema), controller.thumbnailUploadUrl)
router.post('/:id/banner-upload-url', validate(imageUploadSchema), controller.bannerUploadUrl)
router.put('/:id/timetable', uploadTimetableFile, parseTimetableForm, controller.updateTimetable)
router.post('/:id/pdfs', uploadPdfFields, parseArrays, attachUploadedFiles, validate(createPdfSchema), controller.uploadPdfForCourse)
router.get('/:id/pdfs', controller.listPdfsForCourse)
router.get('/:id/pdfs/:pdfId', controller.getPdfForCourse)
router.patch('/:id/pdfs/:pdfId', uploadPdfFields, parseArrays, attachUploadedFiles, validate(updatePdfSchema), controller.updatePdfForCourse)
router.delete('/:id/pdfs/:pdfId', controller.deletePdfForCourse)

router.post('/:id/tests', uploadTestFields, parseArrays, attachTestUploadedFiles, validate(createCourseTestSchema), controller.uploadTestForCourse)
router.get('/:id/tests', controller.listTestsForCourse)
router.get('/:id/tests/:testId', controller.getTestForCourse)
router.patch('/:id/tests/:testId', uploadTestFields, parseArrays, attachTestUploadedFiles, validate(updateCourseTestSchema), controller.updateTestForCourse)
router.delete('/:id/tests/:testId', controller.deleteTestForCourse)

module.exports = router

