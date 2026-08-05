const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const adminEditorialTopicService = require('./admin-editorial-topic.service')

const listTopics = catchAsync(async (req, res) => {
  const result = await adminEditorialTopicService.listTopics(req.query)
  sendPaginated(res, result.data, result.pagination)
})

const getTopic = catchAsync(async (req, res) => {
  const topic = await adminEditorialTopicService.getTopic(req.params.id)
  sendSuccess(res, topic)
})

const createTopic = catchAsync(async (req, res) => {
  const topic = await adminEditorialTopicService.createTopic(req.body)
  sendCreated(res, topic, 'Editorial topic created successfully')
})

const updateTopic = catchAsync(async (req, res) => {
  const topic = await adminEditorialTopicService.updateTopic(req.params.id, req.body)
  sendSuccess(res, topic, 'Editorial topic updated successfully')
})

const deleteTopic = catchAsync(async (req, res) => {
  await adminEditorialTopicService.deleteTopic(req.params.id)
  sendSuccess(res, null, 'Editorial topic deleted successfully')
})

module.exports = {
  listTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic
}
