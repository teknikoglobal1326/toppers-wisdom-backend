const catchAsync        = require('../../core/catchAsync')
const { sendSuccess }   = require('../../core/response')
const progressService   = require('./progress.service')

const updateLesson      = catchAsync(async (req, res) => { sendSuccess(res, await progressService.updateLesson(req.user._id, req.body)) })
const getCourseProgress = catchAsync(async (req, res) => { sendSuccess(res, await progressService.getCourseProgress(req.user._id, req.params.courseId)) })

module.exports = { updateLesson, getCourseProgress }
