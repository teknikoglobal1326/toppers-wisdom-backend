const router = require('express').Router()
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendError, sendPaginated } = require('../../core/response')
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
const EditorialTopic = require('../../models/EditorialTopic.model')

// GET /api/v1/admin/common/editorial-topics
router.get('/editorial-topics', catchAsync(async (req, res) => {
  const topics = await EditorialTopic.find(
    { isDeleted: false, status: 'active' }
  ).sort({ sortOrder: 1, name: 1 }).select('_id name').lean()
  sendSuccess(res, topics)
}))

// GET /api/v1/admin/common/editorial-tests
router.get('/editorial-tests', catchAsync(async (req, res) => {
  const EditorialTest = require('../../models/EditorialTest.model')
  const tests = await EditorialTest.find(
    { isDeleted: false }
  ).sort({ sortOrder: 1, title: 1 }).select('_id title').lean()
  sendSuccess(res, tests)
}))

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
  const { examId, exam, courseId, course, testId, courseTestId, limit, search, q } = req.query;
  const filter = { isDeleted: false, status: 'active' };

  const targetTestId = testId || courseTestId;
  const targetCourseId = courseId || course;
  const targetExamId = examId || exam;

  let scopedSubjectIds = null;

  if (targetTestId && targetTestId !== 'all') {
    const CourseTest = require('../../models/CourseTest.model');
    const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model');
    let courseTest = await CourseTest.findOne({ _id: targetTestId, isDeleted: false }).lean();
    if (!courseTest) {
      courseTest = await CourseSeparatedTest.findOne({ _id: targetTestId, isDeleted: false }).lean();
    }
    if (courseTest) {
      if (Array.isArray(courseTest.subjects) && courseTest.subjects.length > 0) {
        scopedSubjectIds = courseTest.subjects.map(s => typeof s === 'object' ? s._id : s);
      } else if (courseTest.subject) {
        scopedSubjectIds = [typeof courseTest.subject === 'object' ? courseTest.subject._id : courseTest.subject];
      } else if (Array.isArray(courseTest.masterIds) && courseTest.masterIds.length > 0) {
        scopedSubjectIds = courseTest.masterIds.map(m => typeof m.subjectId === 'object' ? m.subjectId?._id : (m.subjectId || m.subject)).filter(Boolean);
      } else if (courseTest.course) {
        const courseDoc = await courseRepository.findById(courseTest.course, { select: 'subjects' });
        if (courseDoc && Array.isArray(courseDoc.subjects)) {
          scopedSubjectIds = courseDoc.subjects.map(item => item.subject);
        }
      }
    }
    scopedSubjectIds = scopedSubjectIds || [];
  }

  if (!scopedSubjectIds && targetCourseId && targetCourseId !== 'all') {
    const courseDoc = await courseRepository.findById(targetCourseId, { select: 'subjects' });
    if (courseDoc && Array.isArray(courseDoc.subjects)) {
      scopedSubjectIds = courseDoc.subjects.map(item => item.subject);
    }
  }

  if (scopedSubjectIds) {
    filter._id = { $in: scopedSubjectIds };
  }

  if (targetExamId && targetExamId !== 'all') {
    if (typeof targetExamId === 'string' && targetExamId.includes(',')) {
      filter.examIds = { $in: targetExamId.split(',').map(s => s.trim()).filter(Boolean) };
    } else {
      filter.examIds = targetExamId;
    }
  }

  const searchTerm = (search || q || '').trim();
  if (searchTerm) {
    filter.name = { $regex: searchTerm, $options: 'i' };
  }

  let queryBuilder = Subject.find(filter)
    .select('_id name sortOrder examIds chapters')
    .sort({ sortOrder: 1, createdAt: -1 });

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      queryBuilder = queryBuilder.limit(parsedLimit);
    }
  }

  const subjects = await queryBuilder.lean();
  sendSuccess(res, subjects);
}));

// GET /api/v1/admin/common/subjects/:courseId
router.get('/subjects/:courseId', catchAsync(async (req, res) => {
  const { courseId } = req.params;

  let subjectIds = [];
  const course = await courseRepository.findById(courseId, { select: 'subjects' });

  if (course && Array.isArray(course.subjects)) {
    subjectIds = course.subjects.map(item => item.subject);
  } else {
    // Check if courseId is a CourseTest ID (separate course test)
    const CourseTest = require('../../models/CourseTest.model');
    const courseTest = await CourseTest.findOne({ _id: courseId, isDeleted: false }).lean();
    if (courseTest) {
      if (Array.isArray(courseTest.subjects) && courseTest.subjects.length > 0) {
        subjectIds = courseTest.subjects;
      } else if (courseTest.course) {
        const parentCourse = await courseRepository.findById(courseTest.course, { select: 'subjects' });
        if (parentCourse && Array.isArray(parentCourse.subjects)) {
          subjectIds = parentCourse.subjects.map(item => item.subject);
        }
      }
    }
  }

  if (!course && subjectIds.length === 0) {
    return sendError(res, 'Course or Test not found', 404);
  }

  const subjects = await Subject.find(
    {
      _id: { $in: subjectIds },
      isDeleted: false,
      status: 'active'
    }
  )
    .select('_id name sortOrder examIds chapters')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  sendSuccess(res, subjects);
}));

// GET /api/v1/admin/common/course-test-subjects/:testId?
router.get(['/course-test-subjects', '/course-test-subjects/:testId'], catchAsync(async (req, res) => {
  const testId = req.params.testId || req.query.testId || req.query.courseTestId;
  const courseId = req.query.courseId || req.query.course;
  const CourseTest = require('../../models/CourseTest.model');
  const CourseSeparatedTest = require('../../models/CourseSeparatedTest.model');

  let subjectIds = [];

  if (testId && testId !== 'all') {
    let testDoc = await CourseTest.findOne({ _id: testId, isDeleted: false }).lean();
    if (!testDoc) {
      testDoc = await CourseSeparatedTest.findOne({ _id: testId, isDeleted: false }).lean();
    }
    if (testDoc) {
      if (Array.isArray(testDoc.subjects) && testDoc.subjects.length > 0) {
        subjectIds = testDoc.subjects.map(s => typeof s === 'object' ? s._id : s);
      } else if (testDoc.subject) {
        subjectIds = [typeof testDoc.subject === 'object' ? testDoc.subject._id : testDoc.subject];
      } else if (Array.isArray(testDoc.masterIds) && testDoc.masterIds.length > 0) {
        subjectIds = testDoc.masterIds.map(m => typeof m.subjectId === 'object' ? m.subjectId?._id : (m.subjectId || m.subject)).filter(Boolean);
      } else if (testDoc.course) {
        const courseDoc = await courseRepository.findById(testDoc.course, { select: 'subjects' });
        if (courseDoc && Array.isArray(courseDoc.subjects)) {
          subjectIds = courseDoc.subjects.map(item => item.subject);
        }
      }
    }
  }

  // If specific testId is passed, strictly return subjects mapped to this test
  if (testId && testId !== 'all') {
    if (subjectIds.length === 0) {
      return sendSuccess(res, []);
    }
    const subjects = await Subject.find({ _id: { $in: subjectIds }, isDeleted: false, status: 'active' })
      .select('_id name sortOrder examIds chapters')
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    return sendSuccess(res, subjects);
  }

  if (subjectIds.length === 0 && courseId && courseId !== 'all') {
    const courseDoc = await courseRepository.findById(courseId, { select: 'subjects' });
    if (courseDoc && Array.isArray(courseDoc.subjects)) {
      subjectIds = courseDoc.subjects.map(item => item.subject);
    }
  }

  const filter = { isDeleted: false, status: 'active' };
  if (subjectIds.length > 0) {
    filter._id = { $in: subjectIds };
  }

  const subjects = await Subject.find(filter)
    .select('_id name sortOrder examIds chapters')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  sendSuccess(res, subjects);
}));

// GET /api/v1/admin/common/tree/:courseId
router.get('/tree/:courseId', catchAsync(async (req, res) => {
  const { courseId } = req.params

  const course = await courseRepository.findById(courseId, {
    select: 'subjects'
  })

  if (!course) {
    return sendError(res, 'Course not found', 404)
  }

  const subjectIds = (course.subjects || []).map(item => item.subject)

  const subjects = await Subject.find({
    _id: { $in: subjectIds },
    isDeleted: false,
    status: 'active'
  })
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean()

  const tree = subjects.map(sub => ({
    _id: sub._id,
    name: sub.name,
    chapters: (sub.chapters || []).map(ch => ({
      _id: ch._id,
      name: ch.name,
      topics: (ch.topics || []).map(tp => ({
        _id: tp._id,
        name: tp.name
      }))
    }))
  }))

  sendSuccess(res, tree)
}))

// GET /api/v1/admin/common/chapters or /all-chapters
router.get(['/chapters', '/all-chapters'], catchAsync(async (req, res) => {
  const { subjectId, subject, courseId, course, examId, exam, search, q, limit } = req.query;
  const filter = { isDeleted: false, status: 'active' };

  const targetCourse = courseId || course;
  if (targetCourse && targetCourse !== 'all') {
    const courseDoc = await courseRepository.findById(targetCourse, { select: 'subjects' });
    if (courseDoc && Array.isArray(courseDoc.subjects)) {
      const subjectIds = courseDoc.subjects.map(item => item.subject);
      filter._id = { $in: subjectIds };
    }
  }

  const targetSubject = subjectId || subject;
  if (targetSubject && targetSubject !== 'all') {
    if (typeof targetSubject === 'string' && targetSubject.includes(',')) {
      const ids = targetSubject.split(',').map(s => s.trim()).filter(Boolean);
      filter._id = filter._id ? { $in: filter._id.$in.filter(id => ids.includes(String(id))) } : { $in: ids };
    } else if (Array.isArray(targetSubject)) {
      filter._id = filter._id ? { $in: filter._id.$in.filter(id => targetSubject.includes(String(id))) } : { $in: targetSubject };
    } else {
      filter._id = targetSubject;
    }
  }

  const targetExam = examId || exam;
  if (targetExam && targetExam !== 'all') {
    if (typeof targetExam === 'string' && targetExam.includes(',')) {
      filter.examIds = { $in: targetExam.split(',').map(s => s.trim()).filter(Boolean) };
    } else {
      filter.examIds = targetExam;
    }
  }

  const subjects = await Subject.find(filter)
    .select('_id name sortOrder examIds chapters')
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  let chapters = [];
  const searchTerm = (search || q || '').trim().toLowerCase();

  subjects.forEach(sub => {
    (sub.chapters || []).forEach(ch => {
      if (searchTerm && !(ch.name || '').toLowerCase().includes(searchTerm)) {
        return;
      }
      chapters.push({
        _id: ch._id,
        id: ch._id,
        name: ch.name,
        title: ch.name,
        chapterName: ch.name,
        sortOrder: ch.sortOrder,
        subjectId: sub._id,
        subjectName: sub.name,
        topics: ch.topics || []
      });
    });
  });

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      chapters = chapters.slice(0, parsedLimit);
    }
  }

  sendSuccess(res, chapters);
}));

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

// GET /api/v1/admin/common/topics-by-subject/:subjectId
router.get('/topics-by-subject/:subjectId', catchAsync(async (req, res) => {
  const { subjectId } = req.params;
  const subject = await subjectRepository.findOne({ _id: subjectId, isDeleted: false });
  if (!subject) {
    return sendSuccess(res, []);
  }

  const topics = [];
  (subject.chapters || []).forEach(ch => {
    (ch.topics || []).forEach(t => {
      topics.push({
        _id: t._id,
        name: t.name,
        topicName: t.name,
        chapterId: ch._id,
      });
    });
  });

  return sendSuccess(res, topics);
}));

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

// GET /api/v1/admin/common/all-topics or /topics
router.get(['/all-topics', '/topics-list'], catchAsync(async (req, res) => {
  const { chapterId, chapter, subjectId, subject, search, q, limit } = req.query;
  const filter = { isDeleted: false, status: 'active' };

  const targetSubject = subjectId || subject;
  if (targetSubject && targetSubject !== 'all') {
    if (typeof targetSubject === 'string' && targetSubject.includes(',')) {
      const ids = targetSubject.split(',').map(s => s.trim()).filter(Boolean);
      filter._id = { $in: ids };
    } else if (Array.isArray(targetSubject)) {
      filter._id = { $in: targetSubject };
    } else {
      filter._id = targetSubject;
    }
  }

  const subjects = await Subject.find(filter).select('_id name chapters').lean();
  let topics = [];
  const targetChapter = chapterId || chapter;
  const searchTerm = (search || q || '').trim().toLowerCase();

  subjects.forEach(sub => {
    (sub.chapters || []).forEach(ch => {
      if (targetChapter && targetChapter !== 'all' && String(ch._id) !== String(targetChapter)) {
        return;
      }
      (ch.topics || []).forEach(tp => {
        if (searchTerm && !(tp.name || '').toLowerCase().includes(searchTerm)) {
          return;
        }
        topics.push({
          _id: tp._id,
          id: tp._id,
          name: tp.name,
          title: tp.name,
          topicName: tp.name,
          sortOrder: tp.sortOrder,
          chapterId: ch._id,
          chapterName: ch.name,
          subjectId: sub._id,
          subjectName: sub.name,
        });
      });
    });
  });

  if (limit) {
    const parsedLimit = parseInt(limit, 10);
    if (!isNaN(parsedLimit) && parsedLimit > 0) {
      topics = topics.slice(0, parsedLimit);
    }
  }

  sendSuccess(res, topics);
}));

// GET /api/v1/admin/common/subscriptions
router.get('/subscriptions', catchAsync(async (req, res) => {
  const Subscription = require('../../models/Subscription.model')
  const subscriptions = await Subscription.find({ isActive: true, isDeleted: false })
    .select('_id name')
    .sort({ name: 1 })
    .lean()
  sendSuccess(res, subscriptions)
}))

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
  const { examId, exam } = req.query
  const filter = { status: 'active', isDeleted: false }
  const targetExam = examId || exam
  if (targetExam) {
    if (targetExam.includes(',')) {
      filter.exam = { $in: targetExam.split(',') }
    } else {
      filter.exam = targetExam
    }
  }

  const vocabularies = await vocabularyRepository.findAll(
    filter,
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, vocabularies)
}))

// GET /api/v1/admin/common/editorials
router.get('/editorials', catchAsync(async (req, res) => {
  const { examId, exam } = req.query
  const filter = { status: 'published', isDeleted: false }
  const targetExam = examId || exam
  if (targetExam) {
    if (targetExam.includes(',')) {
      filter.exam = { $in: targetExam.split(',') }
    } else {
      filter.exam = targetExam
    }
  }

  const editorials = await editorialRepository.findAll(
    filter,
    { sort: { title: 1 }, select: 'title _id' }
  )
  sendSuccess(res, editorials)
}))

// GET /api/v1/admin/common/test-series
router.get('/test-series', catchAsync(async (req, res) => {
  const { examId, exam } = req.query
  const filter = { status: 'active', isDeleted: false }
  const targetExam = examId || exam
  if (targetExam) {
    if (targetExam.includes(',')) {
      filter.exam = { $in: targetExam.split(',') }
    } else {
      filter.exam = targetExam
    }
  }

  const testSeries = await testSeriesRepository.findAll(
    filter,
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

// POST /api/v1/admin/common/upload-chat-attachment
router.post('/upload-chat-attachment', require('../../middlewares/upload.middleware').uploadVideoImage.single('file'), catchAsync(async (req, res) => {
  if (!req.file) {
    return sendError(res, 'No file uploaded', 400)
  }

  const { uploadFile } = require('../../lib/fileUpload')
  const path = require('path')
  const ext = path.extname(req.file.originalname).toLowerCase()
  const filename = `chat-${Date.now()}${ext}`
  const folder = 'chat'
  const fileUrl = await uploadFile(req.file.buffer, filename, folder, req.file.mimetype)

  sendSuccess(res, { url: fileUrl, filename: req.file.originalname })
}))

// GET /api/v1/admin/common/subjects-by-daily-quiz/:dailyQuizId
router.get('/subjectsbydailyquiz/:dailyQuizId', catchAsync(async (req, res) => {
  const { dailyQuizId } = req.params;
  const DailyQuiz = require('../../models/DailyQuiz.model');

  const dailyQuiz = await DailyQuiz.findOne({ _id: dailyQuizId, isDeleted: false })
    .populate('subjectIds')
    .lean();

  if (!dailyQuiz) {
    return sendSuccess(res, []);
  }

  const allowedChapters = new Set((dailyQuiz.chapterIds || []).map(id => id.toString()));
  const allowedTopics = new Set((dailyQuiz.topicIds || []).map(id => id.toString()));

  const subjects = (dailyQuiz.subjectIds || []).map(sub => {
    let chapters = sub.chapters || [];
    if (allowedChapters.size > 0) {
      chapters = chapters.filter(ch => allowedChapters.has(ch._id.toString()));
    }

    chapters = chapters.map(ch => {
      let topics = ch.topics || [];
      if (allowedTopics.size > 0) {
        topics = topics.filter(tp => allowedTopics.has(tp._id.toString()));
      }
      return {
        _id: ch._id,
        chapterName: ch.name,
        name: ch.name,
        topics: topics.map(tp => ({
          _id: tp._id,
          topicName: tp.name,
          name: tp.name
        }))
      };
    });

    return {
      _id: sub._id,
      name: sub.name,
      chapters
    };
  });

  return sendSuccess(res, subjects);
}));

// GET /api/v1/admin/common/question-reports
router.get('/question-reports', catchAsync(async (req, res) => {
  const McqReport = require('../../models/UserMcqReport')
  const User = require('../../models/User.model')

  const { status, reason, type, search, page = 1, limit = 10 } = req.query
  const parsedPage = parseInt(page, 10) || 1
  const parsedLimit = parseInt(limit, 10) || 10
  const skip = (parsedPage - 1) * parsedLimit

  const filter = {}

  if (type) {
    filter.type = type
  }

  if (status) {
    filter.status = status
  }

  if (reason) {
    filter.reason = reason
  }

  if (search) {
    // Search matching users by name, phone, or email
    const users = await User.find({
      $or: [
        { name: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ]
    }).select('_id').lean()
    const userIds = users.map(u => u._id)

    filter.$or = [
      { user: { $in: userIds } },
      { description: new RegExp(search, 'i') },
      { reason: new RegExp(search, 'i') }
    ]
  }

  const total = await McqReport.countDocuments(filter)
  const reports = await McqReport.find(filter)
    .populate('user', 'name phone email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parsedLimit)
    .lean()

  // Dynamic batch population for matching document details based on report type
  const typeGroups = {}
  for (const report of reports) {
    if (report.typeId) {
      if (!typeGroups[report.type]) {
        typeGroups[report.type] = []
      }
      typeGroups[report.type].push(report)
    }
  }

  const typeModels = {
    question: { modelPath: '../../models/Question.model' },
    test: { modelPath: '../../models/Test.model' },
    testSeries: { modelPath: '../../models/TestSeries.model' },
    previousYearPaper: { modelPath: '../../models/PreviousYearPaper.model' },
    previousYearTest: { modelPath: '../../models/PreviousYearPaperTest.model' },
    'course-test': { modelPath: '../../models/CourseTest.model' },
    ai_test: { modelPath: '../../models/AiTest.model' },
    live_test: { modelPath: '../../models/LiveTest.model' },
    quiz: { modelPath: '../../models/DailyQuiz.model' },
    math: { modelPath: '../../models/MathTest.model' }
  }

  for (const [typeKey, groupReports] of Object.entries(typeGroups)) {
    const config = typeModels[typeKey]
    if (config) {
      try {
        const TargetModel = require(config.modelPath)
        const ids = groupReports.map(r => r.typeId)
        if (ids.length > 0) {
          const docs = await TargetModel.find({ _id: { $in: ids } }).lean()
          const docMap = new Map(docs.map(d => [d._id.toString(), d]))
          for (const report of groupReports) {
            report.typeId = docMap.get(report.typeId.toString()) || null
          }
        }
      } catch (_) {
        // Fallback if model cannot be imported or file not found
      }
    }
  }

  // Aggregate counts of reports grouped by type under the same status / search filters (excluding type filter itself)
  const statsFilter = { ...filter }
  delete statsFilter.type

  const stats = await McqReport.aggregate([
    { $match: statsFilter },
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ])

  const counts = {
    question: 0,
    test: 0,
    testSeries: 0,
    previousYearPaper: 0,
    previousYearTest: 0,
    'course-test': 0,
    ai_test: 0,
    live_test: 0,
    quiz: 0,
    math: 0
  }

  for (const stat of stats) {
    if (stat._id in counts) {
      counts[stat._id] = stat.count
    }
  }

  res.status(200).json({
    success: true,
    message: 'Success',
    data: {
      reports,
      counts
    },
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  })
}))

module.exports = router
