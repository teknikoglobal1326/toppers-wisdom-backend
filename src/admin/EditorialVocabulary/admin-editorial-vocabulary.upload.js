const path = require('path')
const { uploadVideoImage } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadVocabularyMedia = uploadVideoImage.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
])

const parseFormData = async (req, _res, next) => {
  try {
    const arrayKeys = ['usages', 'synonyms', 'antonyms', 'editorailTest', 'editorialTest', 'testId']
    for (const key of arrayKeys) {
      if (typeof req.body[key] === 'string') {
        try {
          const parsed = JSON.parse(req.body[key])
          req.body[key] = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean)
        } catch (_) {
          if (req.body[key] && req.body[key] !== '[]' && req.body[key] !== 'null') {
            if (req.body[key].includes(',')) {
              req.body[key] = req.body[key].split(',').map(s => s.trim()).filter(Boolean)
            } else {
              req.body[key] = [req.body[key]].filter(Boolean)
            }
          } else {
            req.body[key] = []
          }
        }
      }
    }

    const folder = `editorial-vocabularies/${req.params.id ?? `new-${Date.now()}`}`

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

    if (req.files?.audio?.[0]) {
      const file = req.files.audio[0]
      const ext = path.extname(file.originalname) || '.mp3'
      req.body.audio = await uploadFile(file.buffer, `audio-${Date.now()}${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadVocabularyMedia, parseFormData }
