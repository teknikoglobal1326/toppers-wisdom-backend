const catchAsync        = require('../../core/catchAsync')
const { sendSuccess }   = require('../../core/response')
const progressService   = require('./progress.service')

const updateLesson      = catchAsync(async (req, res) => { sendSuccess(res, await progressService.updateLesson(req.user._id, req.body)) })
const getCourseProgress = catchAsync(async (req, res) => { sendSuccess(res, await progressService.getCourseProgress(req.user._id, req.params.courseId)) })
const getTestProgress   = catchAsync(async (req, res) => { sendSuccess(res, await progressService.getTestProgress(req.user._id)) })

module.exports = { updateLesson, getCourseProgress, getTestProgress }
