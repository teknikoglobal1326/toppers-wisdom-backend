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
    const subjectsToProcess = (question.subjects && question.subjects.length > 0) ? question.subjects : [null];
    const chaptersToProcess = (question.chapters && question.chapters.length > 0) ? question.chapters : ['uncategorized'];
    const topicsToProcess = (question.topics && question.topics.length > 0) ? question.topics : ['uncategorized'];

    for (const subj of subjectsToProcess) {
      const subjectId = subj?._id ? String(subj._id) : (subj ? String(subj) : 'uncategorized');
      const subjectName = subj?.name || 'Uncategorized';
      
      if (!subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
              subject: { _id: subjectId === 'uncategorized' ? null : subjectId, name: subjectName },
              chapterMap: new Map()
          });
      }
      const subjectGroup = subjectMap.get(subjectId);

      for (const chap of chaptersToProcess) {
        const chapterId = String(chap);
        let chapterName = 'Uncategorized';
        if (subj && subj.chapters && chapterId !== 'uncategorized') {
           const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
           if (foundChapter) chapterName = foundChapter.name;
        }

        if (!subjectGroup.chapterMap.has(chapterId)) {
            subjectGroup.chapterMap.set(chapterId, {
                chapter: { _id: chapterId === 'uncategorized' ? null : chapterId, name: chapterName },
                topicMap: new Map()
            });
        }
        const chapterGroup = subjectGroup.chapterMap.get(chapterId);

        for (const top of topicsToProcess) {
          const topicId = String(top);
          let topicName = 'Uncategorized';
          if (subj && subj.chapters && chapterId !== 'uncategorized' && topicId !== 'uncategorized') {
             const foundChapter = subj.chapters.find((c) => String(c._id) === chapterId);
             if (foundChapter && foundChapter.topics) {
                 const foundTopic = foundChapter.topics.find((t) => String(t._id) === topicId);
                 if (foundTopic) topicName = foundTopic.name;
             }
          }

          if (!chapterGroup.topicMap.has(topicId)) {
              chapterGroup.topicMap.set(topicId, {
                  topic: { _id: topicId === 'uncategorized' ? null : topicId, name: topicName },
                  questions: {}
              });
          }
          const topicGroup = chapterGroup.topicMap.get(topicId);

          const orderKey = String(question.order);
          if (!topicGroup.questions[orderKey]) {
              topicGroup.questions[orderKey] = { en: {}, hi: {} };
          }

          const lang = question.language;
          if (lang === 'en' || lang === 'hi') {
              topicGroup.questions[orderKey][lang] = sanitizeQuestion(question);
          }
        }
      }
    }
  }

  return Array.from(subjectMap.values()).map((subj) => ({
      subject: subj.subject,
      chapters: Array.from(subj.chapterMap.values()).map((chap) => ({
          chapter: chap.chapter,
          topics: Array.from(chap.topicMap.values()).map((top) => ({
              topic: top.topic,
              questions: top.questions
          }))
      }))
  }))
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