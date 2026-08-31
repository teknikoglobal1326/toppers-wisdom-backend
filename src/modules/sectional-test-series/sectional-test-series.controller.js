const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const sectionalTestSeriesService = require('./sectional-test-series.service')

const listSeries = catchAsync(async (req, res) => {
    const result = await sectionalTestSeriesService.listSeries(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getSeries = catchAsync(async (req, res) => {
    sendSuccess(res, await sectionalTestSeriesService.getSeries(req.params.id, req.user._id))
})

const listSeriesTests = catchAsync(async (req, res) => {
    const result = await sectionalTestSeriesService.listSeriesTests(req.params.id, req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})


const getTestInstructions = catchAsync(async (req, res) => {
    sendSuccess(res, await sectionalTestSeriesService.getTestInstructions(req.params.testId, req.user._id))
})


const startSession = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await sectionalTestSeriesService.startSession(req.params.testId, req.user._id, req.user.language || 'hi', req.query.sessionId),
        'Session started successfully'
    )
})

const updateSession = catchAsync(async (req, res) => {
    const data = await sectionalTestSeriesService.updateSession(req.params.testId, req.params.sessionId, req.user._id, req.body)
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
        await sectionalTestSeriesService.getSessionAnalytics(req.params.testId, req.params.sessionId, req.user._id),
        'Session analytics retrieved successfully'
    )
})

const getSessionSolution = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await sectionalTestSeriesService.getSessionSolution(req.params.testId, req.params.sessionId, req.user._id),
        'Session solution retrieved successfully'
    )
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await sectionalTestSeriesService.listMyAttempts(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getUserDashboardStats = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await sectionalTestSeriesService.getUserDashboardStats(req.user._id),
        'Dashboard stats retrieved successfully'
    )
})

module.exports = {
    listSeries,
    getSeries,
    listSeriesTests,
    getTestInstructions,
    startSession,
    updateSession,
    getSessionAnalytics,
    getSessionSolution,
    listMyAttempts,
    getUserDashboardStats,
}
