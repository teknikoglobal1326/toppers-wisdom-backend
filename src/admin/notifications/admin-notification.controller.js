const catchAsync            = require('../../core/catchAsync')
const { sendSuccess }       = require('../../core/response')
const { notificationQueue } = require('../../jobs/queue')
const { createLogger }      = require('../../config/logger')

const logger = createLogger('admin:notification:controller')

const broadcast = catchAsync(async (req, res) => {
  const { title, body, examId, subExamId, all, type, moduleType, moduleId, countdown, schedule } = req.body
  logger.info({ title, all, examId, subExamId, type, moduleType, moduleId, countdown, schedule }, 'Broadcasting notification')

  const targetModuleType = moduleType || 'system'
  const scheduledTime = schedule ? new Date(schedule).getTime() : Date.now()

  let delay = 0
  if (schedule) {
    if (isNaN(scheduledTime) || scheduledTime < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled delivery time must be in the future'
      })
    }
    delay = Math.max(0, scheduledTime - Date.now())
  }

  if (countdown) {
    const countdownTime = new Date(countdown).getTime()
    if (isNaN(countdownTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid countdown date & time'
      })
    }
    if (countdownTime <= scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Countdown date & time must be strictly after the scheduled delivery time (scheduled < countdown)'
      })
    }
  }

  const targetCountdown = countdown || null

  const job = await notificationQueue.add(
    'broadcast',
    {
      title,
      body,
      examId,
      subExamId,
      all,
      data: {
        moduleType: targetModuleType,
        moduleId: moduleId ? String(moduleId) : '',
        countdown: targetCountdown ? new Date(targetCountdown).toISOString() : '',
        schedule: schedule ? new Date(schedule).toISOString() : '',
      },
    },
    { delay }
  )

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
    schedule: schedule ? new Date(schedule).toISOString() : null,
    countdown: targetCountdown ? new Date(targetCountdown).toISOString() : null,
    isProcessed: delay === 0,
    createdAt: new Date().toISOString()
  }

  sendSuccess(res, resultData, delay > 0 ? 'Notification scheduled with countdown' : 'Notification broadcast queued')
})

module.exports = { broadcast }
