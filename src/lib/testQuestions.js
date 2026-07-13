// Shared helpers for user-facing test flows (test-series + previous-year-paper).
// Questions are stored one document per language ('en' | 'hi'); the en/hi versions
// of the same logical question share the same `order` (and `groupId`).

// Strip correct answers and return the client-safe question shape.
const sanitizeQuestion = (question) => ({
  _id: question._id,
  question: question.question,
  options: (question.options || []).map((option) => ({ text: option.text, image: option.image })),
  order: question.order,
  sortOrder: question.sortOrder,
})

// Build the always-present i18n payload: { <order>: { en: {...}, hi: {...} } }.
// Every order key always carries both `en` and `hi`; whichever language has no
// question for that order gets `{}` (present, empty) instead of being omitted.
// Legacy `language: 'both'` rows are surfaced under both languages.
const groupQuestionsByLanguage = (questions = []) => {
  const grouped = {}

  for (const question of questions) {
    const orderKey = String(question.order)
    if (!grouped[orderKey]) grouped[orderKey] = { en: {}, hi: {} }

    const langs = question.language === 'both' ? ['en', 'hi'] : [question.language]
    const sanitized = sanitizeQuestion(question)
    for (const lang of langs) {
      if (lang !== 'en' && lang !== 'hi') continue
      grouped[orderKey][lang] = sanitized
    }
  }

  return grouped
}

// Language-agnostic scoring: the user answers in one language, so answers reference
// either the en or hi question _id. The en/hi versions of one logical question share
// the same `order`, so distinct orders give the true (logical) question count.
const scoreAnswers = (questions = [], answers = [], test = {}) => {
  const byId = new Map()
  const orders = new Set()

  for (const question of questions) {
    orders.add(question.order)
    const correctIndex = (question.options || []).findIndex((option) => option.isCorrect)
    byId.set(question._id.toString(), { correctIndex })
  }

  const marksPerQuestion = Number(test.marksPerQuestion || 1)
  const negativeMarks = Number(test.negativeMarks || 0)

  let score = 0
  let correct = 0
  let wrong = 0

  for (const answer of answers) {
    if (answer?.selectedOption === null || answer?.selectedOption === undefined) continue
    const entry = byId.get(String(answer.questionId))
    if (!entry) continue

    if (answer.selectedOption === entry.correctIndex) {
      correct += 1
      score += marksPerQuestion
    } else {
      wrong += 1
      score -= negativeMarks
    }
  }

  const totalQuestions = orders.size
  const unattempted = Math.max(0, totalQuestions - (correct + wrong))

  return { score, correct, wrong, unattempted, totalQuestions }
}

module.exports = { sanitizeQuestion, groupQuestionsByLanguage, scoreAnswers }