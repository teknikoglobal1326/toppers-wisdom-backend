const { S3Client } = require('@aws-sdk/client-s3')
const config = require('./env')

const s3 = config.AWS_ACCESS_KEY_ID
  ? new S3Client({
      region: config.AWS_REGION,
      credentials: {
        accessKeyId:     config.AWS_ACCESS_KEY_ID,
        secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null

module.exports = { s3, bucket: config.AWS_S3_BUCKET || '' }