const { Worker }  = require('bullmq')
const redis       = require('../../config/redis')
const TestAttempt = require('../../models/TestAttempt.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:rank')

new Worker('rank-calculation', async (job) => {
  const { attemptId, testId, subTestId } = job.data
  logger.info({ jobId: job.id, attemptId }, 'Rank calculation started')

  const attempt = await TestAttempt.findById(attemptId)
  if (!attempt) { logger.warn({ attemptId }, 'Attempt not found'); return }

  const rank = await TestAttempt.countDocuments({
    test: testId, subTestId, score: { $gt: attempt.score }, status: 'completed',
  }) + 1

  await TestAttempt.findByIdAndUpdate(attemptId, { rank })
  logger.info({ jobId: job.id, attemptId, rank }, 'Rank assigned')
}, { connection: redis })