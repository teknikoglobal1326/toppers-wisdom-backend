const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const qualificationService = require('../../modules/qualification/qualification.service')
const courseRepository = require('../../modules/course/course.repository')
const topicRepository = require('../../modules/topic/topic.repository')
const examRepository = require('../../modules/exam/exam.repository')
const subexamRepository = require('../../modules/subexam/subexam.repository')
const vocabularyRepository = require('../../modules/vocabulary/vocabulary.repository')
const editorialRepository = require('../../modules/editorial/editorial.repository')
const testSeriesRepository = require('../../modules/test-series/test-series.repository')
const shortCategoryRepository = require('../../modules/short-category/short-category.repository')
const previousYearPaperRepository = require('../../modules/previous-year-paper/previous-year-paper.repository')
const subjectRepository = require('../../modules/subject/subject.repository')
const Role = require('../../models/Role.model')

// GET /api/v1/admin/common/short-categories
router.get('/short-categories', catchAsync(async (req, res) => {
  const categories = await shortCategoryRepository.findAll(
    { isDeleted: false, status: 'active' },
    { sort: { createdAt: -1 }, select: '_id name' }
  )
  sendSuccess(res, categories)
}))


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

// GET /api/v1/admin/common/subjects
router.get('/subjects', catchAsync(async (req, res) => {
  const subjects = await subjectRepository.findAll(
    { isDeleted: false, status: 'active' },
    { sort: { sortOrder: 1, createdAt: -1 }, select: '_id name sortOrder' }
  );
  sendSuccess(res, subjects);
}));

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
    { _id: topicId, isDeleted: false, },
    { select: 'chapters', });
  if (!topic) {
    return res.status(404).json({
      success: false,
      message: 'Topic not found',
    });
  }
  sendSuccess(res, topic.chapters);
})
);

// GET /api/v1/admin/common/all-exams
router.get('/all-exams', catchAsync(async (req, res) => {
  const exams = await examRepository.findAll(
    { status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id' }
  )
  sendSuccess(res, exams)
}))

// GET /api/v1/admin/common/all-subexams
router.get('/all-subexams', catchAsync(async (req, res) => {
  const subexams = await subexamRepository.findAll(
    { status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id examId' }
  )
  sendSuccess(res, subexams)
}))

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

// GET /api/v1/admin/common/vocabularies
router.get('/vocabularies', catchAsync(async (req, res) => {
  const vocabularies = await vocabularyRepository.findAll(
    { status: 'active', isDeleted: false },
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, vocabularies)
}))

// GET /api/v1/admin/common/editorials
router.get('/editorials', catchAsync(async (req, res) => {
  const editorials = await editorialRepository.findAll(
    { status: 'published', isDeleted: false },
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, editorials)
}))

// GET /api/v1/admin/common/test-series
router.get('/test-series', catchAsync(async (req, res) => {
  const testSeries = await testSeriesRepository.findAll(
    { status: 'active', isDeleted: false },
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, testSeries)
}))

// GET /api/v1/admin/common/previous-year-papers
router.get('/previous-year-papers', catchAsync(async (req, res) => {
  const papers = await previousYearPaperRepository.findAll(
    { status: 'active', isDeleted: false },
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, papers)
}))
// GET /api/v1/admin/common/roles
router.get('/roles', catchAsync(async (_req, res) => {
  const roles = await Role.find({ isDeleted: false, isActive: true })
    .select('_id name')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  sendSuccess(res, roles)
}))


module.exports = router
