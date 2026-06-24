const { Queue } = require('bullmq')
const redis = require('../config/redis')
const { createLogger } = require('../config/logger')

const logger = createLogger('jobs:queue')

const videoQueue        = new Queue('video-transcode',  { connection: redis })
const emailQueue        = new Queue('email',            { connection: redis })
const notificationQueue = new Queue('notification',     { connection: redis })
const rankQueue         = new Queue('rank-calculation', { connection: redis })

logger.info('BullMQ queues initialized')
module.exports = { videoQueue, emailQueue, notificationQueue, rankQueue }