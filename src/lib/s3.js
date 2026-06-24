const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3, bucket }   = require('../config/storage')
const config           = require('../config/env')

const getPresignedUploadUrl   = async (key, contentType, expiresIn = 3600) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn })

const getPresignedDownloadUrl = async (key, expiresIn = 900) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })

const uploadBuffer = async (buffer, key, contentType) => {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: contentType }))
  return `https://${bucket}.s3.${config.AWS_REGION}.amazonaws.com/${key}`
}

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl, uploadBuffer }