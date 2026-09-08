const mongoose = require('mongoose');
const DictionaryWord = require('../../models/DictionaryWord.model');
const DictionaryQuestion = require('../../models/DictionaryQuestion.model');
const DictionaryProgress = require('../../models/DictionaryProgress.model');
const DictionaryIngest = require('../../models/DictionaryIngest.model');

const normalizeCategory = (cat) => {
  if (!cat || typeof cat !== 'string') return 'synonyms';
  const c = cat.toLowerCase().trim().replace(/\s+/g, ' ');

  if (c.includes('idiom') || c.includes('phrase')) return 'idioms-phrases';
  if (c.includes('synonym')) return 'synonyms';
  if (c.includes('antonym')) return 'antonyms';
  if (c.includes('spell')) return 'spellings';
  if (c.includes('homonym')) return 'homonyms';
  if (c.includes('phrasal')) return 'phrasal-verbs';
  if (c.includes('proverb')) return 'proverbs';
  if (c.includes('one') || c.includes('substitut') || c.includes('ows')) return 'one-word-sub';

  return c.replace(/\s+/g, '-');
};

const normalizeWordItem = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const cleanStr = (s) => (typeof s === 'string' ? s.replace(/—/g, ' - ') : (s ? String(s) : ''));
  const cleanArr = (arr) => {
    if (Array.isArray(arr)) return arr.map(cleanStr).filter(Boolean);
    if (typeof arr === 'string' && arr.trim()) {
      return arr.split('\n').join(',').split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const word = cleanStr(raw.word);
  const en = cleanStr(raw.en);
  const hi = cleanStr(raw.hi);
  const cat = normalizeCategory(raw.cat);
  const pron = cleanStr(raw.pron);
  const pos = cleanStr(raw.pos);

  const exams = cleanArr(raw.exams);
  const examCount = (raw.examCount !== undefined && !isNaN(Number(raw.examCount)))
    ? Number(raw.examCount)
    : exams.length;

  const syn = cleanArr(raw.syn);
  const ant = cleanArr(raw.ant);
  const usage = cleanArr(raw.usage);
  const daily = cleanArr(raw.daily);

  let hook = cleanStr(raw.hook);
  if (hook && !hook.endsWith('।')) {
    hook = hook + ' ।';
  }

  let note = cleanStr(raw.note);
  if (note && !note.endsWith('।')) {
    note = note + ' ।';
  }

  const deriv = cleanArr(raw.deriv);
  const theme = cleanStr(raw.theme);
  const src = cleanStr(raw.src) || 'Previous Year Papers';
  const rep = Number(raw.rep) || 0;

  return {
    _id: raw._id ? String(raw._id).trim() : '',
    word,
    cat,
    en,
    hi,
    pron,
    pos,
    exams,
    examCount,
    syn,
    ant,
    usage,
    daily,
    hook,
    note,
    deriv,
    theme,
    src,
    rep
  };
};

const normalizeQuestionItem = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const cleanStr = (s) => (typeof s === 'string' ? s.trim() : (s ? String(s).trim() : ''));
  const cleanArr = (arr) => {
    if (Array.isArray(arr)) return arr.map(cleanStr).filter(Boolean);
    if (typeof arr === 'string' && arr.trim()) {
      return arr.split('\n').map(cleanStr).filter(Boolean);
    }
    return [];
  };

  const q = cleanStr(raw.q);
  const cat = normalizeCategory(raw.cat);
  const opts = cleanArr(raw.opts);
  const ans = cleanStr(raw.ans);
  const expl = cleanStr(raw.expl);
  const tip = cleanStr(raw.tip);
  const wordId = cleanStr(raw.wordId);
  const exams = cleanArr(raw.exams);

  return {
    _id: (raw._id && mongoose.Types.ObjectId.isValid(raw._id)) ? raw._id : undefined,
    cat,
    q,
    opts,
    ans,
    expl,
    tip,
    wordId: wordId || undefined,
    exams
  };
};

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
  const normCat = normalizeCategory(cat);
  const totalWords = await DictionaryWord.countDocuments({ cat: normCat });
  const uniqueExams = await DictionaryWord.distinct('exams', { cat: normCat });
  const uniqueThemes = await DictionaryWord.distinct('theme', { cat: normCat });
  return {
    totalWords,
    examsCount: uniqueExams.length,
    themesCount: uniqueThemes.length
  };
};

const getCategoryGroups = async (cat, sub) => {
  const normCat = normalizeCategory(cat);
  if (sub === 'exam') {
    const groups = await DictionaryWord.distinct('exams', { cat: normCat });
    return { groups };
  }
  if (sub === 'theme') {
    const groups = await DictionaryWord.distinct('theme', { cat: normCat });
    return { groups };
  }
  if (sub === 'alpha') {
    const groups = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
    return { groups };
  }
  return { groups: [] };
};

const getWords = async (cat, sub, group, page = 1, limit = 20) => {
  const normCat = normalizeCategory(cat);
  const query = { cat: normCat };

  if (sub === 'exam' && group) {
    query.exams = group;
  } else if (sub === 'theme' && group) {
    query.theme = group;
  } else if (sub === 'alpha' && group) {
    query.word = new RegExp(`^${group}`, 'i');
  }

  let sort = {};
  if (sub === 'rep') {
    sort = { rep: -1, updatedAt: -1 };
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
  if (cat) {
    query.cat = normalizeCategory(cat);
  }

  return await DictionaryWord.find(query).limit(50);
};

const getPracticeMcqs = async (cat, sub, group) => {
  const match = { cat: normalizeCategory(cat) };
  const questions = await DictionaryQuestion.aggregate([
    { $match: match },
    { $sample: { size: 10 } },
    { $project: { ans: 0, expl: 0, tip: 0 } }
  ]);
  return questions;
};

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

const getValidationIssues = (payload, type) => {
  const issues = [];
  if (type !== 'word') return issues;

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

  const normalized = normalizeWordItem({ ...ingestItem.payload, ...(updatedPayload || {}) });
  let savedEntity = null;

  if (ingestItem.type === 'word') {
    if (!normalized._id) {
      normalized._id = `w_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    }
    const newWord = new DictionaryWord(normalized);
    await newWord.save();
    savedEntity = newWord;
  } else if (ingestItem.type === 'question') {
    const newQuestion = new DictionaryQuestion(ingestItem.payload);
    await newQuestion.save();
    savedEntity = newQuestion;
  } else {
    throw new Error('Unknown ingest item type');
  }

  ingestItem.status = 'approved';
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

  let words = [];
  let questions = [];

  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && (item.q || item.opts)) {
        questions.push(item);
      } else {
        words.push(item);
      }
    }
  } else if (data.words || data.questions) {
    if (data.words) words = data.words;
    if (data.questions) questions = data.questions;
  }

  let importedWordsCount = 0;
  let importedQuestionsCount = 0;
  let errors = [];

  const now = new Date();

  // Process Words
  for (let idx = 0; idx < words.length; idx++) {
    const raw = words[idx];
    try {
      const w = normalizeWordItem(raw);
      if (!w) {
        errors.push(`Word index ${idx}: Invalid word item`);
        continue;
      }

      if (!w.word || !w.word.trim()) {
        errors.push(`Word index ${idx}: Word name is required`);
        continue;
      }
      if (!w.en || !w.en.trim()) {
        w.en = w.word;
      }

      if (!w._id || String(w._id).trim() === '') {
        w._id = `w_${Date.now()}_${Math.floor(Math.random() * 10000)}_${idx}`;
      }

      const existing = await DictionaryWord.findById(w._id);
      if (existing) {
        Object.assign(existing, w);
        existing.updatedAt = now;
        existing.markModified('updatedAt');
        await existing.save();
      } else {
        const newWord = new DictionaryWord({ ...w, updatedAt: now, createdAt: now });
        await newWord.save();
      }
      importedWordsCount++;
    } catch (err) {
      errors.push(`Word index ${idx} ("${raw?.word || 'unknown'}"): ${err.message}`);
    }
  }

  // Process Questions
  for (let idx = 0; idx < questions.length; idx++) {
    const rawQ = questions[idx];
    try {
      const qItem = normalizeQuestionItem(rawQ);
      if (!qItem || !qItem.q || !qItem.ans || !qItem.opts || qItem.opts.length === 0) {
        errors.push(`Question index ${idx}: Question ("q"), Answer ("ans") and Options ("opts") are required`);
        continue;
      }

      const qId = (qItem._id && mongoose.Types.ObjectId.isValid(qItem._id)) 
        ? new mongoose.Types.ObjectId(qItem._id) 
        : null;

      const updateData = {
        cat: qItem.cat,
        q: qItem.q,
        opts: qItem.opts,
        ans: qItem.ans,
        expl: qItem.expl || '',
        tip: qItem.tip || '',
        wordId: qItem.wordId || undefined,
        exams: qItem.exams || [],
        updatedAt: now
      };

      await DictionaryQuestion.findOneAndUpdate(
        qId ? { $or: [{ _id: qId }, { q: qItem.q }] } : { q: qItem.q },
        { 
          $set: updateData,
          $setOnInsert: { 
            createdAt: now,
            ...(qId ? { _id: qId } : {})
          }
        },
        { 
          upsert: true, 
          new: true, 
          runValidators: true,
          setDefaultsOnInsert: true 
        }
      );
      importedQuestionsCount++;
    } catch (err) {
      errors.push(`Question index ${idx}: ${err.message}`);
    }
  }

  return {
    status: 'completed',
    importedWordsCount,
    importedQuestionsCount,
    message: `Successfully imported ${importedWordsCount} words and ${importedQuestionsCount} questions into the live database.`,
    errors: errors.length > 0 ? errors : undefined
  };
};

const createWord = async (data) => {
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray(data.words)) {
    items = data.words;
  } else if (data) {
    items = [data];
  }

  const results = [];
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const w = normalizeWordItem(raw);
    if (!w) continue;

    if (!w.word || !w.word.trim()) {
      throw new Error(`Word at index ${i} is missing word/term`);
    }
    if (!w.en || !w.en.trim()) {
      w.en = w.word;
    }

    if (!w._id || String(w._id).trim() === '') {
      w._id = `w_${Date.now()}_${Math.floor(Math.random() * 10000)}_${i}`;
    }

    w.updatedAt = now;
    w.createdAt = w.createdAt || now;

    const existing = await DictionaryWord.findById(w._id);
    if (existing) {
      Object.assign(existing, w);
      existing.updatedAt = now;
      existing.markModified('updatedAt');
      await existing.save();
      results.push(existing);
    } else {
      const newWord = new DictionaryWord(w);
      await newWord.save();
      results.push(newWord);
    }
  }

  return items.length === 1 ? results[0] : results;
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

  const normalized = normalizeWordItem({ ...data, _id: id });
  if (!normalized.word) normalized.word = word.word;
  if (!normalized.en) normalized.en = word.en;

  Object.assign(word, normalized);
  word.updatedAt = new Date();
  word.markModified('updatedAt');
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

const getAllWords = async ({ cat, q, page = 1, limit = 20, sort } = {}) => {
  const query = {};
  if (cat && cat !== 'all' && cat.trim() !== '') {
    query.cat = normalizeCategory(cat);
  }
  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    query.$or = [
      { word: regex },
      { en: regex },
      { hi: regex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 20);
  const skip = (pageNum - 1) * limitNum;

  let sortCriteria = { updatedAt: -1, createdAt: -1, _id: -1 };
  if (sort === 'asc') {
    sortCriteria = { word: 1 };
  } else if (sort === 'desc') {
    sortCriteria = { word: -1 };
  }

  const words = await DictionaryWord.find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await DictionaryWord.countDocuments(query);
  const overallTotal = await DictionaryWord.countDocuments({});
  const totalCategories = (await DictionaryWord.distinct('cat')).length;
  const uniqueExams = await DictionaryWord.distinct('exams');
  const totalExams = uniqueExams.length;

  return {
    words,
    data: words,
    total,
    overallTotal,
    totalCategories,
    totalExams,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

// ─── QUESTIONS MANAGEMENT FUNCTIONS ───────────────────────

const getAllQuestions = async ({ cat, type, q, page = 1, limit = 20, sort } = {}) => {
  const query = {};
  const selectedCat = cat || type;
  if (selectedCat && selectedCat !== 'all' && selectedCat.trim() !== '') {
    query.cat = normalizeCategory(selectedCat);
  }
  if (q && q.trim()) {
    const regex = new RegExp(q.trim(), 'i');
    query.$or = [
      { q: regex },
      { ans: regex },
      { expl: regex },
      { tip: regex },
      { wordId: regex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 20);
  const skip = (pageNum - 1) * limitNum;

  let sortCriteria = { updatedAt: -1, createdAt: -1, _id: -1 };
  if (sort === 'asc') {
    sortCriteria = { q: 1 };
  } else if (sort === 'desc') {
    sortCriteria = { q: -1 };
  }

  const questions = await DictionaryQuestion.find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limitNum)
    .lean();

  const total = await DictionaryQuestion.countDocuments(query);
  const overallTotal = await DictionaryQuestion.countDocuments({});
  const totalCategories = (await DictionaryQuestion.distinct('cat')).length;
  const uniqueExams = await DictionaryQuestion.distinct('exams');
  const totalExams = uniqueExams.length;

  return {
    questions,
    data: questions,
    total,
    overallTotal,
    totalCategories,
    totalExams,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum)
  };
};

const createQuestion = async (data) => {
  let items = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && Array.isArray(data.questions)) {
    items = data.questions;
  } else if (data) {
    items = [data];
  }

  const results = [];
  const now = new Date();

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const qItem = normalizeQuestionItem(raw);
    if (!qItem || !qItem.q || !qItem.ans || !qItem.opts || qItem.opts.length === 0) {
      throw new Error(`Question at index ${i} is missing question ("q"), answer ("ans"), or options ("opts")`);
    }

    qItem.updatedAt = now;
    qItem.createdAt = qItem.createdAt || now;

    const qId = (qItem._id && mongoose.Types.ObjectId.isValid(qItem._id)) 
      ? new mongoose.Types.ObjectId(qItem._id) 
      : null;

    const updateData = {
      cat: qItem.cat,
      q: qItem.q,
      opts: qItem.opts,
      ans: qItem.ans,
      expl: qItem.expl || '',
      tip: qItem.tip || '',
      wordId: qItem.wordId || undefined,
      exams: qItem.exams || [],
      updatedAt: now
    };

    const savedQ = await DictionaryQuestion.findOneAndUpdate(
      qId ? { $or: [{ _id: qId }, { q: qItem.q }] } : { q: qItem.q },
      { 
        $set: updateData,
        $setOnInsert: { 
          createdAt: now,
          ...(qId ? { _id: qId } : {})
        }
      },
      { 
        upsert: true, 
        new: true, 
        runValidators: true,
        setDefaultsOnInsert: true 
      }
    );
    results.push(savedQ);
  }

  return items.length === 1 ? results[0] : results;
};

const updateQuestion = async (id, data) => {
  let question = await DictionaryQuestion.findById(id);
  if (!question) {
    throw new Error('Question not found');
  }

  const merged = {
    cat: data.cat !== undefined ? data.cat : question.cat,
    q: data.q !== undefined ? data.q : question.q,
    opts: data.opts !== undefined ? data.opts : question.opts,
    ans: data.ans !== undefined ? data.ans : question.ans,
    expl: data.expl !== undefined ? data.expl : question.expl,
    tip: data.tip !== undefined ? data.tip : question.tip,
    wordId: data.wordId !== undefined ? data.wordId : question.wordId,
    exams: data.exams !== undefined ? data.exams : question.exams,
    _id: id
  };

  const qItem = normalizeQuestionItem(merged);
  Object.assign(question, qItem);
  question.updatedAt = new Date();
  await question.save();
  return question;
};

const deleteQuestion = async (id) => {
  const deleted = await DictionaryQuestion.findByIdAndDelete(id);
  if (!deleted) {
    throw new Error('Question not found');
  }
  return deleted;
};

module.exports = {
  createWord,
  getAllWords,
  updateWord,
  deleteWord,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
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