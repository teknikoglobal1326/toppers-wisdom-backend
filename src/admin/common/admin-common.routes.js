const router               = require('express').Router()
const catchAsync           = require('../../core/catchAsync')
const { sendSuccess }      = require('../../core/response')
const qualificationService = require('../../modules/qualification/qualification.service')
const courseRepository = require('../../modules/course/course.repository')
const topicRepository = require('../../modules/topic/topic.repository')
const examRepository = require('../../modules/exam/exam.repository')
const subexamRepository = require('../../modules/subexam/subexam.repository')
const Role = require('../../models/Role.model')


// GET /api/v1/admin/common/qualifications
router.get('/qualifications', catchAsync(async (_req, res) => {
  const qualifications = await qualificationService.listPublic()
  sendSuccess(res, qualifications)
}))

// GET /api/v1/admin/common/courses
router.get('/courses', catchAsync(async (req, res) => {
    const courses = await courseRepository.findAll({ isDeleted: false },
      { sort: { sortOrder: 1, createdAt: -1 }, select: '_id title sortOrder', });
    sendSuccess(res, courses);
  })
);

// GET /api/v1/admin/common/topics/:courseId
router.get('/topics/:courseId', catchAsync(async (req, res) => {
  const { courseId } = req.params
  const topics = await topicRepository.findAll({ course: courseId }, { sort: { createdAt: -1 }, select: '_id topicName' })
  sendSuccess(res, topics)
}))

// GET /api/v1/admin/common/chapters/:topicId
router.get('/chapters/:topicId', catchAsync(async (req, res) => {
    const { topicId } = req.params;
    const topic = await topicRepository.findOne(
      {_id: topicId, isDeleted: false, },
      { select: 'chapters', } );
    if (!topic) {
      return res.status(404).json({
        success: false,
        message: 'Topic not found',
      });
    }
    sendSuccess(res, topic.chapters);
  })
);

// GET /api/v1/admin/common/exams/:qualificationId
router.get('/exams/:qualificationId', catchAsync(async (req, res) => {
  const { qualificationId } = req.params
  const exams = await examRepository.findAll(
    { qualification: qualificationId, status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id' }
  )
  sendSuccess(res, exams)
}))

// GET /api/v1/admin/common/subexams/:examId
router.get('/subexams/:examId', catchAsync(async (req, res) => {
  const { examId } = req.params
  const subexams = await subexamRepository.findAll(
    { examId, status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id' }
  )
  sendSuccess(res, subexams)
}))

// GET /api/v1/admin/common/roles
router.get('/roles', catchAsync(async (_req, res) => {
  const roles = await Role.find({ isDeleted: false, isActive: true })
    .select('_id name permissions sortOrder')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  sendSuccess(res, roles)
}))


module.exports = router
