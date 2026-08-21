const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminCalendarExamService = require('./admin-calendar-exam.service')

const list = catchAsync(async (req, res) => {
  const result = await adminCalendarExamService.listAll(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getOne = catchAsync(async (req, res) => {
  const calendarExam = await adminCalendarExamService.getOne(req.params.id)
  sendSuccess(res, calendarExam)
})

const create = catchAsync(async (req, res) => {
  const calendarExam = await adminCalendarExamService.createCalendarExam(req.body, req.file)
  sendCreated(res, calendarExam)
})

const update = catchAsync(async (req, res) => {
  const calendarExam = await adminCalendarExamService.updateCalendarExam(req.params.id, req.body, req.file)
  sendSuccess(res, calendarExam)
})

const remove = catchAsync(async (req, res) => {
  await adminCalendarExamService.softDelete(req.params.id)
  sendSuccess(res, null, 'Calendar exam entry deleted successfully')
})

module.exports = {
  list,
  getOne,
  create,
  update,
  remove
}
