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

  const payloadToSave = { ...ingestItem.payload, ...(updatedPayload || {}) };
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

const bulkApproveIngestItems = async (approvals) => {
  const results = { successful: [], failed: [] };
  
  for (const item of approvals) {
    try {
      const id = typeof item === 'string' ? item : item.id;
      const payload = typeof item === 'object' && item.payload ? item.payload : null;
      
      await approveIngestItem(id, payload);
      results.successful.push({ id, status: 'success' });
    } catch (error) {
      results.failed.push({ 
        id: typeof item === 'string' ? item : item.id, 
        error: error.message 
      });
    }
  }
  
  return results;
};


// ----------------------------------------------------------------------
// AI Extraction Service Integration
// ----------------------------------------------------------------------
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const redis = require('../../config/redis');

// Set a daily limit for OpenAI calls to control costs before falling back to Gemini
const OPENAI_DAILY_LIMIT = 500;

const invokeLLMWithFailover = async (textContext, prompt) => {
  const fullPrompt = `${prompt}\n\nDOCUMENT TEXT:\n${textContext}`;
  const dateStr = new Date().toISOString().split('T')[0];
  const countKey = `ai:openai:count:${dateStr}`;
  const failKey = `ai:openai:fails:${dateStr}`;

  // 1. Check if we've exceeded the daily limit for OpenAI
  const currentCount = parseInt(await redis.get(countKey) || '0', 10);
  
  if (currentCount < OPENAI_DAILY_LIMIT) {
    try {
      console.log(`Attempting AI extraction via OpenAI... (Daily Usage: ${currentCount + 1}/${OPENAI_DAILY_LIMIT})`);
      
      // Increment the attempt count
      await redis.incr(countKey);
      // Optional: Set expiry to 24h if it's a new key
      if (currentCount === 0) await redis.expire(countKey, 86400);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        response_format: { type: 'json_object' },
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI extraction failed, logging fail count and falling over to Gemini...', error.message);
      
      // Increment fail count
      const fails = await redis.incr(failKey);
      if (fails === 1) await redis.expire(failKey, 86400);
    }
  } else {
    console.log(`OpenAI daily limit (${OPENAI_DAILY_LIMIT}) reached. Skipping directly to Gemini...`);
  }
  
  // Secondary: Google Gemini (gemini-1.5-flash)
  console.log('Attempting AI extraction via Gemini...');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  });
  return result.response.text();
};

const processAiExtractionJob = async (fileBuffer, fileName, uploaderId) => {
  
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
    - cat: the assigned category
    - exams: array of exams mentioned
    
    For QUESTIONS, draft the following fields:
    - q: the question text
    - opts: array of exactly 4 string options
    - ans: the correct option (exact string match to one of opts)
    - expl: explanation for the answer
    - cat: the assigned category
    - exams: array of exams mentioned

    Return ONLY a valid JSON object matching this schema:
    {
      "words": [{ ...fields... }],
      "questions": [{ ...fields... }]
    }
  `;

  const textContext = fileBuffer.toString('utf-8');
  
  const paragraphs = textContext.split(/\n\s*\n/);
  const chunks = [];
  let currentChunk = "";
  for (const p of paragraphs) {
    if (currentChunk.length + p.length > 2500 && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = p;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + p;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  let allWords = [];
  let allQuestions = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`Processing chunk ${i + 1}/${chunks.length}...`);
    try {
      const aiResponseString = await invokeLLMWithFailover(chunks[i], aiPrompt);
      const extractedData = JSON.parse(aiResponseString);
      if (extractedData.words) allWords = allWords.concat(extractedData.words);
      if (extractedData.questions) allQuestions = allQuestions.concat(extractedData.questions);
    } catch (error) {
      console.error(`AI Extraction failed for chunk ${i + 1} of ${fileName}:`, error);
    }
  }

  const wordTexts = allWords.map(w => w.word).filter(Boolean);
  const existingWords = await DictionaryWord.find({ word: { $in: wordTexts } }).select('word').lean();
  const existingIngestWords = await DictionaryIngest.find({ type: 'word', 'payload.word': { $in: wordTexts } }).select('payload.word').lean();
  const duplicateWordSet = new Set([
    ...existingWords.map(w => w.word.toLowerCase()),
    ...existingIngestWords.map(w => w.payload.word.toLowerCase())
  ]);

  const questionTexts = allQuestions.map(q => q.q).filter(Boolean);
  const existingQuestions = await DictionaryQuestion.find({ q: { $in: questionTexts } }).select('q').lean();
  const existingIngestQuestions = await DictionaryIngest.find({ type: 'question', 'payload.q': { $in: questionTexts } }).select('payload.q').lean();
  const duplicateQuestionSet = new Set([
    ...existingQuestions.map(q => q.q.toLowerCase()),
    ...existingIngestQuestions.map(q => q.payload.q.toLowerCase())
  ]);

  const stagingPromises = [];

  for (const w of allWords) {
    if (!w.word || !w.en || !w.cat) continue;
    if (duplicateWordSet.has(w.word.toLowerCase())) continue;

    stagingPromises.push(new DictionaryIngest({
      type: 'word',
      payload: w,
      status: 'pending',
      aiDraftedFields: ['en', 'hi', 'usage', 'daily', 'hook', 'note', 'theme'],
      submittedBy: uploaderId
    }).save());
    duplicateWordSet.add(w.word.toLowerCase());
  }

  for (const q of allQuestions) {
    if (!q.q || !q.opts || !q.ans || !q.cat) continue;
    if (duplicateQuestionSet.has(q.q.toLowerCase())) continue;

    stagingPromises.push(new DictionaryIngest({
      type: 'question',
      payload: q,
      status: 'pending',
      aiDraftedFields: ['expl'],
      submittedBy: uploaderId
    }).save());
    duplicateQuestionSet.add(q.q.toLowerCase());
  }

  const results = await Promise.allSettled(stagingPromises);
  results.forEach((r, idx) => {
    if (r.status === 'rejected') console.error(`Failed to stage item ${idx}:`, r.reason);
  });
  console.log(`Successfully staged ${results.filter(r => r.status === 'fulfilled').length} non-duplicate items from ${fileName}`);
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
  bulkApproveIngestItems,
  rejectIngestItem,
  uploadIngestDocument
};
