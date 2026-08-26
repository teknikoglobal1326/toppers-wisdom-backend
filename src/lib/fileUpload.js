const path = require('path')
const fs   = require('fs')
const config = require('../config/env')

const s3Available = () => !!(config.AWS_ACCESS_KEY_ID && config.AWS_S3_BUCKET)

const uploadFile = async (bufferOrFile, filename, folder, contentType) => {
  let body = bufferOrFile
  let isPath = false

  if (bufferOrFile && typeof bufferOrFile === 'object' && !Buffer.isBuffer(bufferOrFile)) {
    if (bufferOrFile.buffer) {
      body = bufferOrFile.buffer
    } else if (bufferOrFile.path) {
      body = bufferOrFile.path
      isPath = true
    }
  }

  if (s3Available()) {
    const { s3, bucket } = require('../config/storage')
    const { PutObjectCommand } = require('@aws-sdk/client-s3')
    const key = `${folder}/${filename}`

    if (isPath) {
      await s3.send(new PutObjectCommand({ 
        Bucket: bucket, 
        Key: key, 
        Body: fs.createReadStream(body), 
        ContentType: contentType 
      }))
      try { fs.unlinkSync(body) } catch (e) {}
      return `https://${bucket}.s3.${config.AWS_REGION}.amazonaws.com/${key}`
    } else {
      const { uploadBuffer } = require('./s3')
      return uploadBuffer(body, key, contentType)
    }
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
  fs.mkdirSync(uploadDir, { recursive: true })
  const destPath = path.join(uploadDir, filename)

  if (isPath) {
    try {
      fs.renameSync(body, destPath)
    } catch (err) {
      if (err.code === 'EXDEV') {
        fs.copyFileSync(body, destPath)
        try { fs.unlinkSync(body) } catch (e) {}
      } else {
        throw err
      }
    }
  } else {
    fs.writeFileSync(destPath, body)
  }
  return `/uploads/${folder}/${filename}`
}

module.exports = { uploadFile, s3Available }
