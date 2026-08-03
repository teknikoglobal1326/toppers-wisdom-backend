const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const dailyQuizService = require('./daily-quiz.service')

const listQuizzes = catchAsync(async (req, res) => {
    const result = await dailyQuizService.listQuizzes(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getQuizInstructions = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await dailyQuizService.getQuizInstructions(req.params.id, req.user._id),
        'Daily quiz instructions retrieved successfully'
    )
})

const startSession = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await dailyQuizService.startSession(req.params.id, req.user._id, req.query.language),
        'Daily quiz session started successfully'
    )
})

const updateSession = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await dailyQuizService.updateSession(req.params.id, req.params.sessionId, req.user._id, req.body),
        'Daily quiz session updated successfully'
    )
})

const getSessionAnalytics = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await dailyQuizService.getSessionAnalytics(req.params.id, req.params.sessionId, req.user._id),
        'Daily quiz session analytics retrieved successfully'
    )
})

const getSessionSolution = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await dailyQuizService.getSessionSolution(req.params.id, req.params.sessionId, req.user._id),
        'Daily quiz session solution retrieved successfully'
    )
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await dailyQuizService.listMyAttempts(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

module.exports = {
    listQuizzes,
    getQuizInstructions,
    startSession,
    updateSession,
    getSessionAnalytics,
    getSessionSolution,
    listMyAttempts,
}
