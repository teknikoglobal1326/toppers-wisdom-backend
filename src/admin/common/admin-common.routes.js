const router               = require('express').Router()
const catchAsync           = require('../../core/catchAsync')
const { sendSuccess }      = require('../../core/response')
const qualificationService = require('../../modules/qualification/qualification.service')
const courseRepository = require('../../modules/course/course.repository')
const topicRepository = require('../../modules/topic/topic.repository')


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




module.exports = router
