const { upload } = require('../middlewares/upload.middleware')
const { uploadFile } = require('../lib/fileUpload')

const uploadThumbnail = upload.single('thumbnail')

const parseThumbnail = (folderName) => async (req, _res, next) => {
  try {
    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase()
      const folder = `${folderName}/${req.params.id ?? `new-${Date.now()}`}`
      req.body.thumbnail = await uploadFile(
        req.file.buffer,
        `thumbnail-${Date.now()}.${ext}`,
        folder,
        req.file.mimetype
      )
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadThumbnail, parseThumbnail }
