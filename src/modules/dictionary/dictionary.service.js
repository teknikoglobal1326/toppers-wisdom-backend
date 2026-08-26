const DictionaryWord = require('../../models/DictionaryWord.model');
const DictionaryQuestion = require('../../models/DictionaryQuestion.model');
const DictionaryProgress = require('../../models/DictionaryProgress.model');

const getCategories = async () => {
  return [
    'one-word-sub', 
    'idioms-phrases', 
    'synonyms', 
    'antonyms', 
    'spellings', 
    'phrasal-verbs', 
    'homonyms', 
    'proverbs'
  ];
};

const getCategoryHub = async (cat) => {
  const totalWords = await DictionaryWord.countDocuments({ cat });
  const uniqueExams = await DictionaryWord.distinct('exams', { cat });
  const uniqueThemes = await DictionaryWord.distinct('theme', { cat });
  return {
    totalWords,
    examsCount: uniqueExams.length,
    themesCount: uniqueThemes.length
  };
};

const getCategoryGroups = async (cat, sub) => {
  if (sub === 'exam') {
    const groups = await DictionaryWord.distinct('exams', { cat });
    return { groups };
  }
  if (sub === 'theme') {
    const groups = await DictionaryWord.distinct('theme', { cat });
    return { groups };
  }
  if (sub === 'alpha') {
    // Return alphabet A-Z
    const groups = Array.from({length: 26}, (_, i) => String.fromCharCode(65 + i));
    return { groups };
  }
  return { groups: [] };
};

const getWords = async (cat, sub, group, page = 1, limit = 20) => {
  const query = { cat };
  
  if (sub === 'exam' && group) {
    query.exams = group;
  } else if (sub === 'theme' && group) {
    query.theme = group;
  } else if (sub === 'alpha' && group) {
    query.word = new RegExp(`^${group}`, 'i');
  }

  let sort = {};
  if (sub === 'rep') {
    sort = { rep: -1 };
  } else {
    sort = { word: 1 };
  }

  const skip = (page - 1) * limit;
  const words = await DictionaryWord.find(query).sort(sort).skip(skip).limit(limit);
  const total = await DictionaryWord.countDocuments(query);

  return { words, total, page, limit, totalPages: Math.ceil(total / limit) };
};

const getWordById = async (id) => {
  return await DictionaryWord.findById(id);
};

const searchWords = async (q, cat) => {
  const query = {
    $or: [
      { word: new RegExp(q, 'i') },
      { en: new RegExp(q, 'i') },
      { hi: new RegExp(q, 'i') }
    ]
  };
  if (cat) query.cat = cat;
  
  return await DictionaryWord.find(query).limit(50);
};

const getPracticeMcqs = async (cat, sub, group) => {
  // Aggregate randomly selected questions
  const match = { cat };
  // Normally we might map 'sub'/'group' to theme if applicable. 
  // For now, we'll just fetch a random sample of 10.
  const questions = await DictionaryQuestion.aggregate([
    { $match: match },
    { $sample: { size: 10 } },
    { $project: { ans: 0, expl: 0, tip: 0 } } // Exclude sensitive fields
  ]);
  return questions;
};

// Basic SM-2 algorithm variables
const calculateSM2 = (quality, interval, easeFactor, consecutiveCorrect) => {
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  let newInterval;
  let newConsecutiveCorrect = consecutiveCorrect;
  
  if (quality < 3) {
    newConsecutiveCorrect = 0;
    newInterval = 1;
  } else {
    newConsecutiveCorrect += 1;
    if (newConsecutiveCorrect === 1) {
      newInterval = 1;
    } else if (newConsecutiveCorrect === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  
  let status = 'reviewing';
  if (newInterval > 21) status = 'mastered';
  if (newConsecutiveCorrect === 0) status = 'learning';

  return { interval: newInterval, easeFactor: newEaseFactor, nextReviewDate, status, consecutiveCorrect: newConsecutiveCorrect };
};

const updateFlashcardProgress = async (studentId, wordId, selfRating) => {
  let progress = await DictionaryProgress.findOne({ studentId, wordId });
  if (!progress) {
    progress = new DictionaryProgress({ studentId, wordId });
  }

  // Quality 1-5 maps well to SM-2
  const sm2 = calculateSM2(selfRating, progress.interval, progress.easeFactor, progress.consecutiveCorrect);
  Object.assign(progress, sm2);
  
  await progress.save();
  return { status: progress.status, nextReviewDate: progress.nextReviewDate };
};

const updateMcqAttempt = async (studentId, questionId, selectedOption) => {
  const question = await DictionaryQuestion.findById(questionId);
  if (!question) throw new Error('Question not found');

  const isCorrect = (question.ans === selectedOption);
  let progressResponse = null;

  if (question.wordId) {
    let progress = await DictionaryProgress.findOne({ studentId, wordId: question.wordId });
    if (!progress) {
      progress = new DictionaryProgress({ studentId, wordId: question.wordId });
    }

    // MCQ is verified. Correct = quality 5, Incorrect = quality 1
    // We add a weight of 1.2x to interval on correct for verified attempts
    const quality = isCorrect ? 5 : 1;
    let sm2 = calculateSM2(quality, progress.interval, progress.easeFactor, progress.consecutiveCorrect);
    
    if (isCorrect && sm2.interval > 1) {
      sm2.interval = Math.round(sm2.interval * 1.2);
      sm2.nextReviewDate = new Date();
      sm2.nextReviewDate.setDate(sm2.nextReviewDate.getDate() + sm2.interval);
    }

    Object.assign(progress, sm2);
    await progress.save();
    progressResponse = { status: progress.status, nextReviewDate: progress.nextReviewDate };
  }

  return {
    correct: isCorrect,
    ans: question.ans,
    expl: question.expl,
    progress: progressResponse
  };
};

const getDueItems = async (studentId) => {
  const dueItems = await DictionaryProgress.find({
    studentId,
    nextReviewDate: { $lte: new Date() }
  }).populate('wordId');

  return dueItems;
};

const DictionaryIngest = require('../../models/DictionaryIngest.model');

const getValidationIssues = (payload, type) => {
  const issues = [];
  if (type !== 'word') return issues;

  const fieldsToCheck = ['en', 'hi', 'hook', 'note'];
  const arrayFieldsToCheck = ['usage', 'daily'];

  // Em-dash check
  for (const field of fieldsToCheck) {
    if (payload[field] && payload[field].includes('—')) {
      issues.push(`${field} cannot contain em-dashes`);
    }
  }
  for (const field of arrayFieldsToCheck) {
    if (payload[field] && payload[field].length > 0) {
      for (const item of payload[field]) {
        if (item.includes('—')) {
          issues.push(`${field} cannot contain em-dashes`);
          break; // Avoid duplicate messages for the same array field
        }
      }
    }
  }

  // Danda check
  if (payload.hook && !payload.hook.trim().endsWith('।')) {
    issues.push(`hook must end in a danda (।)`);
  }
  if (payload.note && !payload.note.trim().endsWith('।')) {
    issues.push(`note must end in a danda (।)`);
  }

  return issues;
};

const getReviewQueue = async (type, status = 'pending') => {
  const query = { status };
  if (type) query.type = type;
  const queue = await DictionaryIngest.find(query).sort({ createdAt: 1 }).lean();

  return queue.map(item => ({
    ...item,
    validationIssues: getValidationIssues(item.payload, item.type)
  }));
};

const approveIngestItem = async (ingestId, updatedPayload) => {
  const ingestItem = await DictionaryIngest.findById(ingestId);
  if (!ingestItem) throw new Error('Ingest item not found');
  if (ingestItem.status !== 'pending') throw new Error('Item is not pending');

  const payloadToSave = updatedPayload || ingestItem.payload;
  let savedEntity = null;

  if (ingestItem.type === 'word') {
    // Generate a unique word ID
    const uniqueId = `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    payloadToSave._id = uniqueId;

    const newWord = new DictionaryWord(payloadToSave);
    await newWord.save(); // validation hooks will run here
    savedEntity = newWord;
  } else if (ingestItem.type === 'question') {
    const newQuestion = new DictionaryQuestion(payloadToSave);
    await newQuestion.save();
    savedEntity = newQuestion;
  } else {
    throw new Error('Unknown ingest item type');
  }

  ingestItem.status = 'approved';
  // Note: normally we would also save the reviewerId from req.user
  await ingestItem.save();

  return savedEntity;
};

const rejectIngestItem = async (ingestId) => {
  const ingestItem = await DictionaryIngest.findById(ingestId);
  if (!ingestItem) throw new Error('Ingest item not found');
  
  ingestItem.status = 'rejected';
  await ingestItem.save();
  return ingestItem;
};

// ----------------------------------------------------------------------
// AI Extraction Service Integration
// ----------------------------------------------------------------------

const processAiExtractionJob = async (fileBuffer, fileName, uploaderId) => {
  // 1. Exact Prompt Sent to AI
  const aiPrompt = `
    You are an expert OCR and NLP assistant. Extract all vocabulary words and multiple-choice questions from the provided document.
    Categorize each item strictly into one of these 8 categories: 'one-word-sub', 'idioms-phrases', 'synonyms', 'antonyms', 'spellings', 'phrasal-verbs', 'homonyms', 'proverbs'.

    For WORDS, draft the following fields:
    - word: the vocabulary word
    - en: English meaning
    - hi: Hindi meaning (if determinable)
    - usage: array of 1-2 natural usage sentences (no em-dashes)
    - daily: array of 1-2 colloquial/daily use sentences (no em-dashes)
    - hook: a mnemonic in Devanagari ending strictly with a danda (।)
    - note: a concept line ending strictly with a danda (।)
    - theme: a suggested 1-2 word theme
    - exams: array of exams mentioned
    
    For QUESTIONS, draft the following fields:
    - q: the question text
    - opts: array of exactly 4 string options
    - ans: the correct option (exact string match to one of opts)
    - expl: explanation for the answer
    - exams: array of exams mentioned

    Return ONLY a valid JSON object matching this schema:
    {
      "words": [{ ...fields... }],
      "questions": [{ ...fields... }]
    }
  `;

  // 2. Simulated AI Call
  // const aiResponseString = await invokeLLM(fileBuffer, aiPrompt);
  
  // 3. Fallback / Malformed JSON Handling
  let extractedData;
  try {
    // extractedData = JSON.parse(aiResponseString);
    extractedData = { 
      words: [
        {
          word: "Abandonment",
          en: "The act of giving something up completely",
          hi: "परित्याग",
          usage: ["The abandonment of the project caused outrage."],
          daily: ["Her abandonment of her responsibilities was shocking."],
          hook: "A mnemonic in Devanagari ending in danda ।",
          note: "Concept line ending in danda ।",
          theme: "Surrender",
          cat: "one-word-sub",
          exams: ["SSC CHSL 2020 Tier-I"]
        }
      ], 
      questions: [
        {
          q: "Select the word which means the same as the group of words given. A person who abandons his religion",
          opts: ["Apostate", "Prostate", "Profane", "Agnostic"],
          ans: "Apostate",
          expl: "An apostate is someone who forsakes his religion or principles.",
          exams: ["SSC CGL 2019"],
          cat: "one-word-sub"
        },
        {
          q: "Select the most appropriate synonym of the given word: ABUNDANT",
          opts: ["Plentiful", "Scarce", "Sufficient", "Meagre"],
          ans: "Plentiful",
          expl: "Abundant means existing or available in large quantities; plentiful.",
          exams: ["SSC CHSL 2021"],
          cat: "synonyms"
        },
        {
          q: "Select the most appropriate idiom for the given situation: To cross swords",
          opts: ["To fight or argue", "To defend someone", "To kill someone", "To cross a road safely"],
          ans: "To fight or argue",
          expl: "'To cross swords' means to have an argument or a dispute with someone.",
          exams: ["SSC CGL 2020"],
          cat: "idioms-phrases"
        }
      ] 
    }; // Mock parsed data
  } catch (error) {
    // If malformed, we flag it in a system error log or retry.
    // We do NOT stage broken JSON into the DictionaryIngest collection.
    console.error(`AI Extraction failed parsing for ${fileName}:`, error);
    return; // Exit job
  }

  // 4. Staging to Review Queue
  const stagingPromises = [];

  for (const w of extractedData.words || []) {
    // Pre-validation to avoid staging unfixable garbage
    if (!w.word || !w.en) continue;

    stagingPromises.push(new DictionaryIngest({
      type: 'word',
      payload: w,
      status: 'pending',
      aiDraftedFields: ['en', 'hi', 'usage', 'daily', 'hook', 'note', 'theme'],
      submittedBy: uploaderId
    }).save());
  }

  for (const q of extractedData.questions || []) {
    if (!q.q || !q.opts || !q.ans) continue;

    stagingPromises.push(new DictionaryIngest({
      type: 'question',
      payload: q,
      status: 'pending',
      aiDraftedFields: ['expl'],
      submittedBy: uploaderId
    }).save());
  }

  const results = await Promise.allSettled(stagingPromises);
  results.forEach((r, idx) => {
    if (r.status === 'rejected') {
      console.error(`Failed to stage item ${idx}:`, r.reason);
    }
  });
  console.log(`Successfully staged ${results.filter(r => r.status === 'fulfilled').length} items`);
};

const uploadIngestDocument = async (fileBuffer, fileName, uploaderId) => {
  const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  
  // Fire and forget background job
  processAiExtractionJob(fileBuffer, fileName, uploaderId).catch(err => {
    console.error('Background AI Job Failed:', err);
  });
  
  return { jobId, status: 'processing', message: 'Document queued for AI extraction' };
};

module.exports = {
  getCategories,
  getCategoryHub,
  getCategoryGroups,
  getWords,
  getWordById,
  searchWords,
  getPracticeMcqs,
  updateFlashcardProgress,
  updateMcqAttempt,
  getDueItems,
  getReviewQueue,
  approveIngestItem,
  rejectIngestItem,
  uploadIngestDocument
};
