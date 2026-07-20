// Shared helpers for user-facing test flows (test-series + previous-year-paper).
// Questions are stored one document per language ('en' | 'hi'); the en/hi versions
// of the same logical question share the same `order` (and `groupId`).

const { htmlToPlainText } = require('./htmlText')

// Strip correct answers and return the client-safe question shape.
// Question/option text is authored in the admin rich-text editor and stored as
// HTML — convert to plain text for user responses.
const sanitizeQuestion = (question) => ({
  _id: question._id,
  question: {
    text: htmlToPlainText(question.question?.text),
    image: question.question?.image,
  },
  options: (question.options || []).map((option) => ({ text: htmlToPlainText(option.text), image: option.image })),
  order: question.order,
  sortOrder: question.sortOrder,
  perQuestionTime: question.perQuestionTime ?? null,
})

// Build the always-present i18n payload: { <order>: { en: {...}, hi: {...} } }.
// Every order key always carries both `en` and `hi`; whichever language has no
// question for that order gets `{}` (present, empty) instead of being omitted.
// Each question document is stored in exactly one language ('en' | 'hi').
const groupQuestionsByLanguage = (questions = []) => {
  const grouped = {}

  for (const question of questions) {
    const orderKey = String(question.order)
    if (!grouped[orderKey]) grouped[orderKey] = { en: {}, hi: {} }

    const lang = question.language
    if (lang !== 'en' && lang !== 'hi') continue
    grouped[orderKey][lang] = sanitizeQuestion(question)
  }

  return grouped
}

const groupQuestionsBySubject = (questions = []) => {
  const subjectMap = new Map()

  for (const question of questions) {
    const subjectId = question.subjectId?._id ? String(question.subjectId._id) : (question.subjectId ? String(question.subjectId) : 'uncategorized')
    const subjectName = question.subjectId?.name || 'Uncategorized'
    
    if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
            subject: { _id: subjectId === 'uncategorized' ? null : subjectId, name: subjectName },
            questions: {}
        })
    }

    const group = subjectMap.get(subjectId)
    const orderKey = String(question.order)
    
    if (!group.questions[orderKey]) {
        group.questions[orderKey] = { en: {}, hi: {} }
    }

    const lang = question.language
    if (lang === 'en' || lang === 'hi') {
        group.questions[orderKey][lang] = sanitizeQuestion(question)
    }
  }

  return Array.from(subjectMap.values())
}


// Language-agnostic scoring: the user answers in one language, so answers reference
// either the en or hi question _id. The en/hi versions of one logical question share
// the same `order`, so distinct orders give the true (logical) question count.
const scoreAnswers = (questions = [], answers = [], test = {}) => {
  const byId = new Map()
  const logicalKeys = new Set()

  for (const question of questions) {
    logicalKeys.add(question.groupId ? String(question.groupId) : String(question._id))
    const correctIndex = (question.options || []).findIndex((option) => option.isCorrect)
    byId.set(question._id.toString(), { correctIndex })
  }

  const marksPerQuestion = Number(test.marksPerQuestion || 1)
  const negativeMarks = Number(test.negativeMarks || 0)

  let score = 0
  let correct = 0
  let wrong = 0
  let skipped = 0

  for (const answer of answers) {
    if (answer.status === 'skipped') {
      skipped += 1
      continue
    }

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

  const totalQuestions = logicalKeys.size
  const unattempted = Math.max(0, totalQuestions - (correct + wrong + skipped))

  return { score, correct, wrong, skipped, unattempted, totalQuestions }
}

module.exports = { sanitizeQuestion, groupQuestionsByLanguage, groupQuestionsBySubject, scoreAnswers }