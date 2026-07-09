const path = require('path')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialMedia = upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'bannerImage', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
    try {
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

        next()
    } catch (err) {
        next(err)
    }
}

module.exports = { uploadEditorialMedia, parseFormData }