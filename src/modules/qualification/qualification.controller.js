const catchAsync           = require('../../core/catchAsync')
const { sendSuccess }      = require('../../core/response')
const qualificationService = require('./qualification.service')

const listAll      = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.listAll()) })
const getExamTypes = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.getExamTypes(req.params.id)) })
const getSubExams  = catchAsync(async (req, res) => { sendSuccess(res, await qualificationService.getSubExams(req.params.id)) })

module.exports = { listAll, getExamTypes, getSubExams }
