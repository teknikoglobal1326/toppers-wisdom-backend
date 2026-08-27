const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const Faculty = require('../../models/Faculty.model')
const AppError = require('../../core/AppError')

const listFaculties = catchAsync(async (req, res) => {
  const { examId, subexamId, courseId, search } = req.query
  const filter = { isDeleted: false, status: 'active' }

  if (examId && examId !== 'null' && examId !== 'undefined') filter.examId = examId
  if (subexamId && subexamId !== 'null' && subexamId !== 'undefined') filter.subexamId = subexamId
  if (courseId && courseId !== 'null' && courseId !== 'undefined') filter.courseId = courseId
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } }
    ]
  }

  const faculties = await Faculty.find(filter)
    .sort({ sortOrder: 1, createdAt: -1 })
    .populate('examId', 'name')
    .populate('subexamId', 'name')
    .populate('subjectId', 'name')
    .populate('courseId', 'title')
    .select('name facultyName designation totalExperience specialization skills')
    .lean()

  sendSuccess(res, faculties)
})

const getFacultyById = catchAsync(async (req, res) => {
  const faculty = await Faculty.findOne({ _id: req.params.id, isDeleted: false, status: 'active' })
    .populate('examId', 'name')
    .populate('subexamId', 'name')
    .populate('subjectId', 'name')
    .populate('courseId', 'title')

  if (!faculty) throw new AppError('Faculty member not found', 404, 'NOT_FOUND')
  sendSuccess(res, faculty)
})

module.exports = {
  listFaculties,
  getFacultyById
}
