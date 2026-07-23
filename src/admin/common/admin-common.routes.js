const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendError } = require('../../core/response')
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
const Subject = require('../../models/Subject.model')
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
  const { examId } = req.query;
  const filter = { isDeleted: false, status: 'active' };

  if (examId) {
    if (examId.includes(',')) {
      filter.examIds = { $in: examId.split(',') };
    } else {
      filter.examIds = examId;
    }
  }

  const subjects = await Subject.find(filter)
    .select('_id name sortOrder examIds chapters')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  sendSuccess(res, subjects);
}));
// GET /api/v1/admin/common/subjects/:courseId
router.get('/subjects/:courseId', catchAsync(async (req, res) => {
  const { courseId } = req.params

  const course = await courseRepository.findById(courseId, {
    select: 'subjects'
  })

  if (!course) {
    return sendError(res, 'Course not found', 404)
  }

  const subjectIds = course.subjects.map(item => item.subject)

  const subjects = await subjectRepository.findAll(
    {
      _id: { $in: subjectIds },
      isDeleted: false,
      status: 'active'
    },
    {
      sort: { sortOrder: 1, createdAt: -1 },
      select: '_id name sortOrder'
    }
  )

  sendSuccess(res, subjects)
}))

// GET /api/v1/admin/common/chapters/:courseId
router.get('/chapters/:courseId', catchAsync(async (req, res) => {
  const { courseId } = req.params;
  const { subjectId } = req.query;

  if (subjectId) {
    const subject = await subjectRepository.findOne({ _id: subjectId, isDeleted: false });
    if (!subject) {
      return sendSuccess(res, []);
    }
    const chapters = (subject.chapters || []).map(ch => ({
      _id: ch._id,
      title: ch.name
    }));
    return sendSuccess(res, chapters);
  }

  const query = { course: courseId, isDeleted: false, status: 'active' };
  const mappings = await topicRepository.findAll(query, { sort: { createdAt: -1 }, select: '_id chapters' });
  sendSuccess(res, mappings);
}))

// GET /api/v1/admin/common/topics/:chapterId
router.get('/topics/:chapterId', catchAsync(async (req, res) => {
  const { chapterId } = req.params;

  // Find the chapter inside a subject's nested chapters array
  const subject = await subjectRepository.findOne({ "chapters._id": chapterId, isDeleted: false });
  if (subject) {
    const nestedChapter = subject.chapters.find(ch => ch._id.toString() === chapterId);
    if (nestedChapter) {
      const formattedTopics = (nestedChapter.topics || []).map(t => ({
        _id: t._id,
        topicName: t.name
      }));
      return sendSuccess(res, formattedTopics);
    }
  }

  return res.status(404).json({
    success: false,
    message: 'Chapter not found',
  });
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

// GET /api/v1/admin/common/exams
router.get('/exams', catchAsync(async (req, res) => {
  const exams = await examRepository.findAll(
    { status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id' }
  )
  sendSuccess(res, exams)
}))

// GET /api/v1/admin/common/subexams
router.get('/subexams', catchAsync(async (req, res) => {
  const subexams = await subexamRepository.findAll(
    { status: 'active', is_deleted: false },
    { sort: { name: 1 }, select: 'name _id' }
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
// GET /api/v1/admin/common/exam-subjects-chapters?examId=xxx
// Returns subjects for the given exam, with each subject's embedded chapters and topics.
router.get('/exam-subjects-chapters', catchAsync(async (req, res) => {
  const { examId } = req.query
  const filter = { isDeleted: false, status: 'active' }
  if (examId) filter.examIds = examId

  const subjects = await Subject.find(filter)
    .select('_id name chapters')
    .sort({ sortOrder: 1, name: 1 })
    .lean()

  sendSuccess(res, subjects)
}))

// GET /api/v1/admin/common/test-exam-subjects-chapters?testId=xxx
// Returns subjects (with embedded chapters/topics) for the exam associated with the given test ID.
router.get('/test-exam-subjects-chapters', catchAsync(async (req, res) => {
  const { testId } = req.query
  if (!testId) {
    return res.status(400).json({ success: false, message: 'testId is required' })
  }

  const TestSeriesTest = require('../../models/TestSeriesTest.model')
  const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
  const LiveTest = require('../../models/LiveTest.model')
  const CourseTest = require('../../models/CourseTest.model')
  const TestSeries = require('../../models/TestSeries.model')
  const PreviousYearPaper = require('../../models/PreviousYearPaper.model')
  const Course = require('../../models/Course.model')

  let examId = null

  const getExamIds = (val) => {
    if (!val) return null
    if (Array.isArray(val)) {
      const clean = val.filter(Boolean)
      return clean.length > 0 ? clean : null
    }
    return val
  }

  // 1. Try TestSeriesTest
  const seriesTest = await TestSeriesTest.findOne({ _id: testId, isDeleted: false }).lean()
  if (seriesTest) {
    const series = await TestSeries.findOne({ _id: seriesTest.testSeries, isDeleted: false }).lean()
    if (series) examId = getExamIds(series.exam || series.examIds)
  }

  // 2. Try PreviousYearPaperTest
  if (!examId) {
    const pypTest = await PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false }).lean()
    if (pypTest) {
      const paper = await PreviousYearPaper.findOne({ _id: pypTest.previousYearPaper, isDeleted: false }).lean()
      if (paper) examId = getExamIds(paper.exam || paper.examIds)
    }
  }

  // 3. Try LiveTest
  if (!examId) {
    const liveTest = await LiveTest.findOne({ _id: testId, isDeleted: false }).lean()
    if (liveTest) examId = getExamIds(liveTest.examId || liveTest.examIds || liveTest.exam)
  }

  // 4. Try CourseTest
  if (!examId) {
    const courseTest = await CourseTest.findOne({ _id: testId, isDeleted: false }).lean()
    if (courseTest) {
      const course = await Course.findOne({ _id: courseTest.course, isDeleted: false }).lean()
      if (course) examId = getExamIds(course.exam || course.exams || course.examIds)
    }
  }

  if (!examId) {
    return res.status(404).json({ success: false, message: 'Exam ID not found for this test' })
  }

  const filter = { isDeleted: false, status: 'active' }
  filter.examIds = { $in: examId }
  // if (Array.isArray(examId)) {
  // } else {
  //   filter.examIds = examId
  // }

  const subjects = await Subject.find(filter)
    .select('_id name chapters')
    .sort({ sortOrder: 1, name: 1 })
    .lean()

  sendSuccess(res, subjects)
}))

// GET /api/v1/admin/common/roles
router.get('/roles', catchAsync(async (_req, res) => {
  const roles = await Role.find({ isDeleted: false, isActive: true })
    .select('_id name')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  sendSuccess(res, roles)
}))

// GET /api/v1/admin/common/test-subjects-chapters?testId=xxx
// Returns subjects, chapters, and topics mapped to a specific test (supports TestSeriesTest, PreviousYearPaperTest, LiveTest, CourseTest).
router.get('/test-subjects-chapters', catchAsync(async (req, res) => {
  const { testId } = req.query
  if (!testId) {
    return res.status(400).json({ success: false, message: 'testId is required' })
  }

  const TestSeriesTest = require('../../models/TestSeriesTest.model')
  const PreviousYearPaperTest = require('../../models/PreviousYearPaperTest.model')
  const LiveTest = require('../../models/LiveTest.model')
  const CourseTest = require('../../models/CourseTest.model')

  let test = await TestSeriesTest.findOne({ _id: testId, isDeleted: false }).populate('subjectIds').lean()
  let isCourseTest = false

  if (!test) {
    test = await PreviousYearPaperTest.findOne({ _id: testId, isDeleted: false }).populate('subjectIds').lean()
  }
  if (!test) {
    test = await LiveTest.findOne({ _id: testId, isDeleted: false }).populate('subjectIds').lean()
  }
  if (!test) {
    test = await CourseTest.findOne({ _id: testId, isDeleted: false }).populate('subjects').lean()
    if (test) {
      isCourseTest = true
    }
  }

  if (!test) {
    return res.status(404).json({ success: false, message: 'Test not found' })
  }

  const subjects = (isCourseTest ? (test.subjects || []) : (test.subjectIds || [])).filter(Boolean)
  const testChapterIds = new Set((isCourseTest ? (test.chapters || []) : (test.chapterIds || [])).map(id => id.toString()))
  const testTopicIds = new Set((isCourseTest ? (test.topics || []) : (test.topicIds || [])).map(id => id.toString()))

  const filteredSubjects = []

  for (const subject of subjects) {
    const matchedChapters = []
    const embeddedChapters = Array.isArray(subject.chapters) ? subject.chapters : []

    for (const chapter of embeddedChapters) {
      if (chapter && chapter._id && testChapterIds.has(chapter._id.toString())) {
        const matchedTopics = []
        const embeddedTopics = Array.isArray(chapter.topics) ? chapter.topics : []

        for (const topic of embeddedTopics) {
          if (topic && topic._id && testTopicIds.has(topic._id.toString())) {
            matchedTopics.push({
              _id: topic._id,
              name: topic.name,
              sortOrder: topic.sortOrder,
            })
          }
        }

        matchedChapters.push({
          _id: chapter._id,
          name: chapter.name,
          sortOrder: chapter.sortOrder,
          topics: matchedTopics,
        })
      }
    }

    filteredSubjects.push({
      _id: subject._id,
      name: subject.name,
      sortOrder: subject.sortOrder,
      chapters: matchedChapters,
    })
  }

  sendSuccess(res, filteredSubjects)
}))


module.exports = router
