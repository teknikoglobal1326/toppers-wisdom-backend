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


const uploadIngestDocument = async (fileBuffer, fileName, uploaderId) => {
  if (!fileName.toLowerCase().endsWith('.json')) {
    throw new Error('Please upload a valid JSON file.');
  }

  let data;
  try {
    const fileContent = fileBuffer.toString('utf-8');
    data = JSON.parse(fileContent);
  } catch (err) {
    throw new Error('Invalid JSON file format.');
  }

  // Handle case where JSON is just an array of words, or an object with words/questions
  let words = [];
  let questions = [];

  if (Array.isArray(data)) {
    // Assuming array of words based on sample file
    words = data;
  } else if (data.words || data.questions) {
    if (data.words) words = data.words;
    if (data.questions) questions = data.questions;
  }

  let importedWordsCount = 0;
  let importedQuestionsCount = 0;
  let errors = [];

  // Import Words using save() to trigger mongoose pre-save validation hooks
  const wordPromises = words.map(async (w) => {
    if (!w._id) {
       w._id = `w_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    }
    const existing = await DictionaryWord.findById(w._id);
    if (existing) {
      Object.assign(existing, w);
      return existing.save();
    } else {
      const newWord = new DictionaryWord(w);
      return newWord.save();
    }
  });

  const wordResults = await Promise.allSettled(wordPromises);
  wordResults.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      importedWordsCount++;
    } else {
      errors.push(`Word index ${idx} failed: ${res.reason.message}`);
    }
  });

  // Import Questions using save()
  const questionPromises = questions.map(async (q) => {
    const filter = q._id ? { _id: q._id } : { q: q.q };
    const existing = await DictionaryQuestion.findOne(filter);
    if (existing) {
      Object.assign(existing, q);
      return existing.save();
    } else {
      const newQ = new DictionaryQuestion(q);
      return newQ.save();
    }
  });

  const questionResults = await Promise.allSettled(questionPromises);
  questionResults.forEach((res, idx) => {
    if (res.status === 'fulfilled') {
      importedQuestionsCount++;
    } else {
      errors.push(`Question index ${idx} failed: ${res.reason.message}`);
    }
  });

  return {
    status: 'completed',
    importedWordsCount,
    importedQuestionsCount,
    message: `Successfully imported ${importedWordsCount} words and ${importedQuestionsCount} questions into the live database.`,
    errors: errors.length > 0 ? errors : undefined
  };
};

const updateWord = async (id, data) => {
  let word = await DictionaryWord.findById(id);
  if (!word) {
    const ingestItem = await DictionaryIngest.findById(id);
    if (ingestItem) {
      ingestItem.payload = { ...ingestItem.payload, ...(data || {}) };
      await ingestItem.save();
      return ingestItem;
    }
    throw new Error('Word not found');
  }

  const updatePayload = { ...data };
  if (updatePayload.exams && !Array.isArray(updatePayload.exams)) {
    updatePayload.exams = typeof updatePayload.exams === 'string'
      ? updatePayload.exams.split(',').map(s => s.trim()).filter(Boolean)
      : [];
  }

  Object.assign(word, updatePayload);
  await word.save();
  return word;
};

const deleteWord = async (id) => {
  const deletedWord = await DictionaryWord.findByIdAndDelete(id);
  if (deletedWord) return deletedWord;

  const deletedIngest = await DictionaryIngest.findByIdAndDelete(id);
  if (deletedIngest) return deletedIngest;

  throw new Error('Word not found');
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
  uploadIngestDocument,
  updateWord,
  deleteWord
};
