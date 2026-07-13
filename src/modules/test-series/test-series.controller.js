const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const testSeriesService = require('./test-series.service')

const listSeries = catchAsync(async (req, res) => {
    const result = await testSeriesService.listSeries(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getSeries = catchAsync(async (req, res) => {
    sendSuccess(res, await testSeriesService.getSeries(req.params.id, req.user._id))
})

const listSeriesTests = catchAsync(async (req, res) => {
    const result = await testSeriesService.listSeriesTests(req.params.id, req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const startTest = catchAsync(async (req, res) => {
    sendSuccess(res, await testSeriesService.startTest(req.params.testId, req.user._id, req.user.language || 'hi'))
})

const submitTest = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await testSeriesService.submitTest(req.params.testId, req.user._id, req.body, req.user.language || 'hi'),
        'Test submitted successfully'
    )
})

const startSession = catchAsync(async (req, res) => {
    sendSuccess(
        res, 
        await testSeriesService.startSession(req.params.testId, req.user._id, req.user.language || 'hi'),
        'Session started successfully'
    )
})

const updateSession = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await testSeriesService.updateSession(req.params.testId, req.params.sessionId, req.user._id, req.body),
        'Session updated successfully'
    )
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await testSeriesService.listMyAttempts(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

module.exports = {
    listSeries,
    getSeries,
    listSeriesTests,
    startTest,
    submitTest,
    startSession,
    updateSession,
    listMyAttempts,
}
