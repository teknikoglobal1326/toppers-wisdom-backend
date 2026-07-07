const LANGUAGES = ['hi', 'en', 'both']

const isDualLanguagePayload = (data = {}) => Boolean(data.hi && data.en)

const parseJsonIfString = (value) => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (_) {
    return value
  }
}

const parseDualLanguageFields = (req, _res, next) => {
  req.body.hi = parseJsonIfString(req.body.hi)
  req.body.en = parseJsonIfString(req.body.en)
  next()
}

const getExactLanguageFilter = (language) => {
  if (!language || !LANGUAGES.includes(language)) return undefined
  return language
}

const makeLanguageRecords = ({ hi, en }, extras = {}) => ([
  { ...hi, ...extras, language: 'hi' },
  { ...en, ...extras, language: 'en' },
])

const generateSlug = (value, suffix) => {
  const base = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  const slug = base || `item-${Date.now()}`
  return suffix ? `${slug}-${suffix}` : slug
}

module.exports = {
  LANGUAGES,
  generateSlug,
  getExactLanguageFilter,
  isDualLanguagePayload,
  makeLanguageRecords,
  parseDualLanguageFields,
  parseJsonIfString,
}
