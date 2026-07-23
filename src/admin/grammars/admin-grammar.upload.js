const path = require('path')
const { uploadPdf } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

// Reuses shared image+pdf upload middleware and accepts dynamic chapter file keys.
const uploadGrammarFiles = uploadPdf.any()

const parseChapterFieldName = (fieldName = '') => {
  let match = fieldName.match(/^chapterImage_(\d+)$/)
  if (match) return { index: Number(match[1]), type: 'image' }

  match = fieldName.match(/^chapterPdf_(\d+)$/)
  if (match) return { index: Number(match[1]), type: 'fileUrl' }

  match = fieldName.match(/^chapters\[(\d+)\]\[(image|pdfFile)\]$/)
  if (match) return { index: Number(match[1]), type: match[2] === 'pdfFile' ? 'fileUrl' : match[2] }

  match = fieldName.match(/^chapters\.(\d+)\.(image|pdfFile)$/)
  if (match) return { index: Number(match[1]), type: match[2] === 'pdfFile' ? 'fileUrl' : match[2] }

  return null
}

const parseFormData = async (req, _res, next) => {
  try {
    if (req.body.chapters && typeof req.body.chapters === 'string') {
      try {
        req.body.chapters = JSON.parse(req.body.chapters)
      } catch (_) {
        // Keep raw value. Joi validation will reject invalid input.
      }
    }

    if (req.body.sortOrder !== undefined && req.body.sortOrder !== null && req.body.sortOrder !== '') {
      const parsedSortOrder = Number(req.body.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) req.body.sortOrder = parsedSortOrder
    }

    if (!Array.isArray(req.body.chapters)) {
      next()
      return
    }

    const folder = `grammars/${req.params.id ?? `new-${Date.now()}`}`
    const files = Array.isArray(req.files) ? req.files : []

    for (const file of files) {
      const mapped = parseChapterFieldName(file.fieldname)
      if (!mapped) continue

      const chapter = req.body.chapters[mapped.index]
      if (!chapter || typeof chapter !== 'object') continue

      const defaultExt = '.jpg'
      const ext = path.extname(file.originalname) || defaultExt
      const filename = `chapter-${mapped.index + 1}-${mapped.type}${ext}`

      chapter[mapped.type] = await uploadFile(file.buffer, filename, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadGrammarFiles, parseFormData }
