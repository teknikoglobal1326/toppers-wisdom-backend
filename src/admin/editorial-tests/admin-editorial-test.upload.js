const path = require('path')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialTestMedia = upload.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
  try {
    const arrayKeys = ['exam', 'examIds', 'subExam', 'subexamIds', 'subjects', 'subjectIds', 'chapterIds', 'topicIds']
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