const router               = require('express').Router()
const catchAsync           = require('../../core/catchAsync')
const { sendSuccess }      = require('../../core/response')
const qualificationService = require('../../modules/qualification/qualification.service')
const courseRepository = require('../../modules/course/course.repository')

// GET /api/v1/admin/common/qualifications
router.get('/qualifications', catchAsync(async (_req, res) => {
  const qualifications = await qualificationService.listPublic()
  sendSuccess(res, qualifications)
}))

// GET /api/v1/admin/common/courses
router.get('/courses',catchAsync(async (req, res) => {
    const courses = await courseRepository.findAll({},
      { sort: { createdAt: -1 }, select: '_id title', });
    sendSuccess(res, courses);
  })
);


module.exports = router
