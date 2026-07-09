const path = require('path')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialTestMedia = upload.fields([
    { name: 'thumbnailImage', maxCount: 1 },
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

        const folder = `editorial-tests/${req.params.id ?? `new-${Date.now()}`}`

        if (req.files?.thumbnailImage?.[0]) {
            const file = req.files.thumbnailImage[0]
            const ext = path.extname(file.originalname) || '.jpg'
            req.body.thumbnailImage = await uploadFile(file.buffer, `thumbnail-${Date.now()}${ext}`, folder, file.mimetype)
        }

        next()
    } catch (err) {
        next(err)
    }
}

module.exports = { uploadEditorialTestMedia, parseFormData }