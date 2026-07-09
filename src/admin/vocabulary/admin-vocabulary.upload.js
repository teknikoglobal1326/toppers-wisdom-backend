const path = require('path')
const multer = require('multer')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const imageFields = ['thumbnail', 'bannerImage']
        const audioFields = ['audio']

        if (imageFields.includes(file.fieldname) && file.mimetype.startsWith('image/')) {
            return cb(null, true)
        }

        if (audioFields.includes(file.fieldname) && file.mimetype.startsWith('audio/')) {
            return cb(null, true)
        }

        return cb(new AppError('Invalid file type. Use image for thumbnail/bannerImage and audio for audio file', 400, 'INVALID_FILE_TYPE'))
    },
})

const uploadVocabularyImages = upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
    { name: 'audio', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
    try {
        if (Array.isArray(req.body.longDescription)) {
            req.body.longDescription = req.body.longDescription.join('')
        }

        const arrayFields = ['usages', 'synonyms', 'antonyms']
        arrayFields.forEach((field) => {
            if (typeof req.body[field] === 'string') {
                try {
                    const parsed = JSON.parse(req.body[field])
                    req.body[field] = Array.isArray(parsed) ? parsed : req.body[field]
                } catch (_) {
                    // Keep as-is so Joi can report validation error if malformed.
                }
            }
        })

        const folder = `vocabulary/${req.params.id ?? `new-${Date.now()}`}`

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

module.exports = { uploadVocabularyImages, parseFormData }