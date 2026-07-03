/**
 * If language is 'hi' or 'en', automatically create two records (one per language).
 * If language is 'both' (or unset), create a single record as-is.
 *
 * @param {Function} createFn  - async fn(data) => savedDoc
 * @param {Object}   data      - payload (must contain language field)
 * @returns {Object|Object[]}  - single doc or [hiDoc, enDoc]
 */
async function createWithLanguage(createFn, data) {
  if (data.language && data.language !== 'both') {
    const [hi, en] = await Promise.all([
      createFn({ ...data, language: 'hi' }),
      createFn({ ...data, language: 'en' }),
    ])
    return [hi, en]
  }
  return createFn(data)
}

module.exports = { createWithLanguage }
