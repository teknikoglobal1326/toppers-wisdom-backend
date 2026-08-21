const path = require('path')
const { uploadVideoImage } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialMedia = uploadVideoImage.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'videoUrl', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'audioUrl', maxCount: 1 },
  { name: 'audioFile', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
  try {
    const arrayKeys = ['exam', 'examIds', 'subExam', 'subexamIds', 'subjects', 'subjectIds']
    for (const key of arrayKeys) {
      if (typeof req.body[key] === 'string') {
        try {
          const parsed = JSON.parse(req.body[key])
          req.body[key] = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean)
        } catch (_) {
          if (req.body[key] && req.body[key] !== '[]' && req.body[key] !== 'null') {
            req.body[key] = [req.body[key]].filter(Boolean)
          } else {
            req.body[key] = []
          }
        }
      }
    }

    const folder = `editorials/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.thumbnail?.[0]) {
      const file = req.files.thumbnail[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.thumbnail = await uploadFile(file.buffer, `thumbnail-${Date.now()}${ext}`, folder, file.mimetype)
    }

    if (req.files?.bannerImage?.[0]) {
      const file = req.files.bannerImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.bannerImage = await uploadFile(file.buffer, `banner-${Date.now()}${ext}`, folder, file.mimetype)
    }

    const videoFile = req.files?.video?.[0] || req.files?.videoUrl?.[0]
    if (videoFile) {
      const ext = path.extname(videoFile.originalname) || '.mp4'
      req.body.videoUrl = await uploadFile(videoFile.buffer, `video-${Date.now()}${ext}`, folder, videoFile.mimetype)
    }

    const audioFile = req.files?.audio?.[0] || req.files?.audioUrl?.[0] || req.files?.audioFile?.[0]
    if (audioFile) {
      const ext = path.extname(audioFile.originalname) || '.mp3'
      req.body.audioUrl = await uploadFile(audioFile.buffer, `audio-${Date.now()}${ext}`, folder, audioFile.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadEditorialMedia, parseFormData }