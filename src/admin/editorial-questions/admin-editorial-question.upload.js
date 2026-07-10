const path = require('path')
const { upload } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadEditorialQuestionImages = upload.fields([
    { name: 'question_en_image', maxCount: 1 },
    { name: 'question_hi_image', maxCount: 1 },
    { name: 'explanation_en_image', maxCount: 1 },
    { name: 'explanation_hi_image', maxCount: 1 },
    { name: 'option_0_en_image', maxCount: 1 },
    { name: 'option_0_hi_image', maxCount: 1 },
    { name: 'option_1_en_image', maxCount: 1 },
    { name: 'option_1_hi_image', maxCount: 1 },
    { name: 'option_2_en_image', maxCount: 1 },
    { name: 'option_2_hi_image', maxCount: 1 },
    { name: 'option_3_en_image', maxCount: 1 },
    { name: 'option_3_hi_image', maxCount: 1 },
])

const parseJsonIfNeeded = (value, fallback) => {
    if (!value) return fallback
    if (typeof value === 'object') return value
    try {
        return JSON.parse(value)
    } catch (_) {
        return fallback
    }
}

const ensureLocalized = (value = {}) => ({
    en: { text: value?.en?.text || '', image: value?.en?.image || '' },
    hi: { text: value?.hi?.text || '', image: value?.hi?.image || '' },
})

const parseFormData = async (req, _res, next) => {
    try {
        const folder = `editorial-questions/${req.params.id ?? `new-${Date.now()}`}`

        req.body.question = ensureLocalized(parseJsonIfNeeded(req.body.question, {}))
        req.body.explanation = ensureLocalized(parseJsonIfNeeded(req.body.explanation, {}))
        req.body.options = parseJsonIfNeeded(req.body.options, [])
        if (!Array.isArray(req.body.options)) req.body.options = []
        while (req.body.options.length < 4) req.body.options.push({})
        req.body.options = req.body.options.slice(0, 4).map((opt) => ensureLocalized(opt))

        const uploadOne = async (field, filename, setValue) => {
            if (!req.files?.[field]?.[0]) return
            const file = req.files[field][0]
            const ext = path.extname(file.originalname) || '.jpg'
            const image = await uploadFile(file.buffer, `${filename}-${Date.now()}${ext}`, folder, file.mimetype)
            setValue(image)
        }

        await uploadOne('question_en_image', 'question-en', (image) => { req.body.question.en.image = image })
        await uploadOne('question_hi_image', 'question-hi', (image) => { req.body.question.hi.image = image })
        await uploadOne('explanation_en_image', 'explanation-en', (image) => { req.body.explanation.en.image = image })
        await uploadOne('explanation_hi_image', 'explanation-hi', (image) => { req.body.explanation.hi.image = image })

        for (let index = 0; index < 4; index += 1) {
            const enField = `option_${index}_en_image`
            const hiField = `option_${index}_hi_image`
            await uploadOne(enField, `option-${index}-en`, (image) => { req.body.options[index].en.image = image })
            await uploadOne(hiField, `option-${index}-hi`, (image) => { req.body.options[index].hi.image = image })
        }

        next()
    } catch (err) {
        next(err)
    }
}

module.exports = { uploadEditorialQuestionImages, parseFormData }