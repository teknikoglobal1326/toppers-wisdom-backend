// Convert rich-text-editor HTML (admin panel TextMathEditor/RichTextEditor)
// into clean plain text for user-facing responses.
// Admin APIs must keep returning the raw HTML so the editors can re-load it —
// only user-side modules should use these helpers.

const ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

const htmlToPlainText = (value) => {
  if (typeof value !== 'string' || !value) return value

  let text = value
    // line breaks for block-level closings so paragraphs/lists stay readable
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    // drop everything else
    .replace(/<[^>]*>/g, '')

  // decode the entities the editors actually emit
  text = text.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (match) => ENTITIES[match])
  // numeric entities (e.g. &#8377;)
  text = text.replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))

  // collapse whitespace: max one blank line, no trailing spaces
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Clean the given string fields (dot-paths not needed — direct keys only) on a
// plain object, returning the same object. Safe on lean() docs.
const cleanFields = (obj, fields = []) => {
  if (!obj || typeof obj !== 'object') return obj
  for (const field of fields) {
    if (typeof obj[field] === 'string') obj[field] = htmlToPlainText(obj[field])
  }
  return obj
}

module.exports = { htmlToPlainText, cleanFields }
