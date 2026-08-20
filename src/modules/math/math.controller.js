const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const mathService = require('./math.service')

const listSeries = catchAsync(async (req, res) => {
    const result = await mathService.listSeries(req.user?._id, req.query)
    sendPaginated(res, result.data, result.pagination, 'Math series packages retrieved successfully')
})

const getSeries = catchAsync(async (req, res) => {
    const result = await mathService.getSeries(req.params.id, req.user?._id)
    sendSuccess(res, result, 'Math series details retrieved successfully')
})

const listSeriesTests = catchAsync(async (req, res) => {
    const result = await mathService.listSeriesTests(req.params.id, req.user?._id, req.query)
    sendPaginated(res, result.data, result.pagination, 'Math series tests retrieved successfully')
})

const getTestInstructions = catchAsync(async (req, res) => {
    const language = req.headers['accept-language'] === 'hi' ? 'hi' : 'en'
    const result = await mathService.getTestInstructions(req.params.testId, req.user?._id, language)
    sendSuccess(res, result, 'Math test instructions retrieved successfully')
})

const startTest = catchAsync(async (req, res) => {
    const language = req.headers['accept-language'] === 'hi' ? 'hi' : 'en'
    const result = await mathService.startTest(req.params.testId, req.user?._id, language)
    sendSuccess(res, result, 'Math test started successfully')
})

const submitTest = catchAsync(async (req, res) => {
    const language = req.headers['accept-language'] === 'hi' ? 'hi' : 'en'
    const result = await mathService.submitTest(req.params.testId, req.user?._id, req.body, language)
    sendSuccess(res, result, 'Math test submitted successfully')
})

const startSession = catchAsync(async (req, res) => {
    const language = req.headers['accept-language'] === 'hi' ? 'hi' : 'en'
    const result = await mathService.startSession(req.params.testId, req.user?._id, language, req.query.sessionId)
    sendSuccess(res, result, 'Math test session started successfully')
})

const updateSession = catchAsync(async (req, res) => {
    const result = await mathService.updateSession(req.params.testId, req.params.sessionId, req.user?._id, req.body)
    sendSuccess(res, result, 'Math test session updated successfully')
})

const getSessionAnalytics = catchAsync(async (req, res) => {
    const result = await mathService.getSessionAnalytics(req.params.testId, req.params.sessionId, req.user?._id)
    sendSuccess(res, result, 'Math test session analytics retrieved successfully')
})

const getSessionSolution = catchAsync(async (req, res) => {
    const result = await mathService.getSessionSolution(req.params.testId, req.params.sessionId, req.user?._id)
    sendSuccess(res, result, 'Math test session solutions retrieved successfully')
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await mathService.listMyAttempts(req.user?._id, req.query)
    sendSuccess(res, result, 'Math test attempts retrieved successfully')
})

module.exports = {
    listSeries,
    getSeries,
    listSeriesTests,
    getTestInstructions,
    startTest,
    submitTest,
    startSession,
    updateSession,
    getSessionAnalytics,
    getSessionSolution,
    listMyAttempts
}
