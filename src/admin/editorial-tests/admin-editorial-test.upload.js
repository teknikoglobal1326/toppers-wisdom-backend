const path = require('path')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialTestMedia = upload.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
  try {
    if (typeof req.body.subjects === 'string') {
      try {
        const parsed = JSON.parse(req.body.subjects)
        if (Array.isArray(parsed)) req.body.subjects = parsed
      } catch (_) {
        // Leave as-is for Joi validation.
      }
    }

    if (typeof req.body.subjectIds === 'string') {
      try {
        const parsed = JSON.parse(req.body.subjectIds)
        if (Array.isArray(parsed)) req.body.subjectIds = parsed
      } catch (_) {
        // Leave as-is
      }
    }

    if (typeof req.body.chapterIds === 'string') {
      try {
        const parsed = JSON.parse(req.body.chapterIds)
        if (Array.isArray(parsed)) req.body.chapterIds = parsed
      } catch (_) {
        // Leave as-is
      }
    }

    if (typeof req.body.topicIds === 'string') {
      try {
        const parsed = JSON.parse(req.body.topicIds)
        if (Array.isArray(parsed)) req.body.topicIds = parsed
      } catch (_) {
        // Leave as-is
      }
    }

    const folder = `editorial-tests/${req.params.id ?? `new-${Date.now()}`}`
    const thumbFile = req.files?.thumbnailImage?.[0] || req.files?.thumbnail?.[0]

    if (thumbFile) {
      const ext = path.extname(thumbFile.originalname) || '.jpg'
      const uploadedUrl = await uploadFile(thumbFile.buffer, `thumbnail-${Date.now()}${ext}`, folder, thumbFile.mimetype)
      req.body.thumbnailImage = uploadedUrl
      req.body.thumbnail = uploadedUrl
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadEditorialTestMedia, parseFormData }