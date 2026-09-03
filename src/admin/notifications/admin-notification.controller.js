const catchAsync            = require('../../core/catchAsync')
const { sendSuccess }       = require('../../core/response')
const { notificationQueue } = require('../../jobs/queue')
const { createLogger }      = require('../../config/logger')

const logger = createLogger('admin:notification:controller')

const broadcast = catchAsync(async (req, res) => {
  const { title, body, examId, subExamId, all, type, moduleType, moduleId } = req.body
  logger.info({ title, all, examId, subExamId, type, moduleType, moduleId }, 'Broadcasting notification')

  const targetModuleType = moduleType || 'system'

  const job = await notificationQueue.add('broadcast', {
    title,
    body,
    examId,
    subExamId,
    all,
    data: {
      moduleType: targetModuleType,
      moduleId: moduleId ? String(moduleId) : '',
    },
  })

  const resultData = {
    jobId: job.id,
    title,
    message: body,
    body,
    examId: examId || null,
    subExamId: subExamId || null,
    all: !!all,
    moduleType: targetModuleType,
    moduleId: moduleId || null,
    isProcessed: false,
    createdAt: new Date().toISOString()
  }

  sendSuccess(res, resultData, 'Notification broadcast queued')
})

module.exports = { broadcast }
