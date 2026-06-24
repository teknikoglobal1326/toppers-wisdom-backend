const { Worker } = require('bullmq')
const redis = require('../../config/redis')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:email')

new Worker('email', async (job) => {
  logger.info({ jobId: job.id, type: job.data.type, userId: job.data.userId }, 'Email job started')
  // TODO: integrate Nodemailer + AWS SES or Resend
  logger.info({ jobId: job.id }, 'Email sent (stub)')
}, { connection: redis })