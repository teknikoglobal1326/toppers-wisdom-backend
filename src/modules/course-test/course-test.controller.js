const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const courseTestService = require('./course-test.service')

const startTest = catchAsync(async (req, res) => {
    sendSuccess(res, await courseTestService.startTest(req.params.CourseTestId, req.user._id, req.user.language || 'hi'))
})

const submitTest = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await courseTestService.submitTest(req.params.CourseTestId, req.user._id, req.body, req.user.language || 'hi'),
        'Test submitted successfully'
    )
})

const startSession = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await courseTestService.startSession(req.params.CourseTestId, req.user._id, req.user.language || 'hi'),
        'Session started successfully'
    )
})

const updateSession = catchAsync(async (req, res) => {
    const data = await courseTestService.updateSession(req.params.CourseTestId, req.params.sessionId, req.user._id, req.body)
    const isFinalized = req.body.status === 'completed' || req.body.status === 'abandoned'

    sendSuccess(
        res,
        data,
        isFinalized ? 'Session finalized successfully' : 'Session updated successfully'
    )
})

const getSessionAnalytics = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await courseTestService.getSessionAnalytics(req.params.CourseTestId, req.params.sessionId, req.user._id),
        'Session analytics retrieved successfully'
    )
})

const getSessionSolution = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await courseTestService.getSessionSolution(req.params.CourseTestId, req.params.sessionId, req.user._id),
        'Session solution retrieved successfully'
    )
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await courseTestService.listMyAttempts(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

module.exports = {
    startTest,
    submitTest,
    startSession,
    updateSession,
    getSessionAnalytics,
    getSessionSolution,
    listMyAttempts,
}
