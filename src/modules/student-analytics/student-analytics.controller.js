const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const studentAnalyticsService = require('./student-analytics.service')

const getCollectionsAnalytics = catchAsync(async (req, res) => {
    const result = await studentAnalyticsService.getCollectionsAnalytics(
        req.params.type,
        req.user._id,
        req.query
    )
    sendPaginated(res, result.data, result.pagination, 'Collections analytics retrieved successfully')
})

const getCollectionAnalytics = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await studentAnalyticsService.getCollectionAnalytics(req.params.type, req.params.collectionId, req.user._id),
        'Collection analytics retrieved successfully'
    )
})

const getTestAnalytics = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await studentAnalyticsService.getTestAnalytics(req.params.testId, req.user._id),
        'Test analytics retrieved successfully'
    )
})

const getQuestionAnalytics = catchAsync(async (req, res) => {
    sendSuccess(
        res,
        await studentAnalyticsService.getQuestionAnalytics(req.params.questionId),
        'Question analytics retrieved successfully'
    )
})

module.exports = {
    getCollectionsAnalytics,
    getCollectionAnalytics,
    getTestAnalytics,
    getQuestionAnalytics,
}
