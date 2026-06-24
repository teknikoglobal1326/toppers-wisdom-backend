const catchAsync            = require('../../core/catchAsync')
const { sendSuccess }       = require('../../core/response')
const { notificationQueue } = require('../../jobs/queue')
const { createLogger }      = require('../../config/logger')

const logger = createLogger('admin:notification:controller')

const broadcast = catchAsync(async (req, res) => {
  const { title, body, subExamId, all, type } = req.body
  logger.info({ title, all, subExamId }, 'Broadcasting notification')

  await notificationQueue.add('broadcast', {
    title, body, subExamId, all, data: { type },
  })

  sendSuccess(res, null, 'Notification broadcast queued')
})

module.exports = { broadcast }
