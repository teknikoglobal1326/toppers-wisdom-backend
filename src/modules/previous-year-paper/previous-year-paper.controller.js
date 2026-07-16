const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const previousYearPaperService = require('./previous-year-paper.service')

const listPreviousYearPapers = catchAsync(async (req, res) => {
    const result = await previousYearPaperService.listPreviousYearPapers(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const getPreviousYearPaper = catchAsync(async (req, res) => {
    sendSuccess(res, await previousYearPaperService.getPreviousYearPaper(req.params.id, req.user._id))
})

const listPreviousYearPaperTests = catchAsync(async (req, res) => {
    const result = await previousYearPaperService.listPreviousYearPaperTests(req.params.id, req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

const startTest = catchAsync(async (req, res) => {
    sendSuccess(res, await previousYearPaperService.startTest(req.params.testId, req.user._id, req.user.language || 'hi'))
})

const submitTest = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await previousYearPaperService.submitTest(req.params.testId, req.user._id, req.body, req.user.language || 'hi'),
        'Test submitted successfully'
    )
})

const startSession = catchAsync(async (req, res) => {
    sendSuccess(
        res, 
        await previousYearPaperService.startSession(req.params.testId, req.user._id, req.user.language || 'hi'),
        'Session started successfully'
    )
})

const updateSession = catchAsync(async (req, res) => {
    const data = await previousYearPaperService.updateSession(req.params.testId, req.params.sessionId, req.user._id, req.body)
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
        await previousYearPaperService.getSessionAnalytics(req.params.testId, req.params.sessionId, req.user._id),
        'Session analytics retrieved successfully'
    )
})

const getSessionSolution = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await previousYearPaperService.getSessionSolution(req.params.testId, req.params.sessionId, req.user._id),
        'Session solution retrieved successfully'
    )
})

const listMyAttempts = catchAsync(async (req, res) => {
    const result = await previousYearPaperService.listMyAttempts(req.user._id, req.query)
    sendPaginated(res, result.data, result.pagination)
})

module.exports = {
    listPreviousYearPapers,
    getPreviousYearPaper,
    listPreviousYearPaperTests,
    startTest,
    submitTest,
    startSession,
    updateSession,
    getSessionAnalytics,
    getSessionSolution,
    listMyAttempts,
}
