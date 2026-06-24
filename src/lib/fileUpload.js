const path = require('path')
const fs   = require('fs')
const config = require('../config/env')

const s3Available = () => !!(config.AWS_ACCESS_KEY_ID && config.AWS_S3_BUCKET)

const uploadFile = async (buffer, filename, folder, contentType) => {
  if (s3Available()) {
    const { uploadBuffer } = require('./s3')
    const key = `${folder}/${filename}`
    return uploadBuffer(buffer, key, contentType)
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
  fs.mkdirSync(uploadDir, { recursive: true })
  fs.writeFileSync(path.join(uploadDir, filename), buffer)
  return `/uploads/${folder}/${filename}`
}

module.exports = { uploadFile, s3Available }
