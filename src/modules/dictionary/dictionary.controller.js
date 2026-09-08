const dictionaryService = require('./dictionary.service');

const getCategories = async (req, res, next) => {
  try {
    const categories = await dictionaryService.getCategories();
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

const getCategoryHub = async (req, res, next) => {
  try {
    const hubData = await dictionaryService.getCategoryHub(req.params.cat);
    res.status(200).json({ success: true, data: hubData });
  } catch (error) {
    next(error);
  }
};

const getCategoryGroups = async (req, res, next) => {
  try {
    const { sub } = req.query;
    const groupsData = await dictionaryService.getCategoryGroups(req.params.cat, sub);
    res.status(200).json({ success: true, data: groupsData });
  } catch (error) {
    next(error);
  }
};

const getWords = async (req, res, next) => {
  try {
    const { sub, group, page, limit } = req.query;
    const wordsData = await dictionaryService.getWords(req.params.cat, sub, group, parseInt(page), parseInt(limit));
    res.status(200).json({ success: true, data: wordsData });
  } catch (error) {
    next(error);
  }
};

const getWordById = async (req, res, next) => {
  try {
    const word = await dictionaryService.getWordById(req.params.id);
    if (!word) {
      return res.status(404).json({ success: false, message: 'Word not found' });
    }
    res.status(200).json({ success: true, data: word });
  } catch (error) {
    next(error);
  }
};

const searchWords = async (req, res, next) => {
  try {
    const { q, cat } = req.query;
    const results = await dictionaryService.searchWords(q, cat);
    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

const getPracticeMcqs = async (req, res, next) => {
  try {
    const { sub, group } = req.query;
    const mcqs = await dictionaryService.getPracticeMcqs(req.params.cat, sub, group);
    res.status(200).json({ success: true, data: mcqs });
  } catch (error) {
    next(error);
  }
};

const updateFlashcardProgress = async (req, res, next) => {
  try {
    const { wordId, selfRating } = req.body;
    const progress = await dictionaryService.updateFlashcardProgress(req.user.id, wordId, selfRating);
    res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

const updateMcqAttempt = async (req, res, next) => {
  try {
    const { questionId, selectedOption } = req.body;
    const result = await dictionaryService.updateMcqAttempt(req.user.id, questionId, selectedOption);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getDueItems = async (req, res, next) => {
  try {
    const studentId = req.params.studentId === 'me' ? req.user.id : req.params.studentId;
    const items = await dictionaryService.getDueItems(studentId);
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const getReviewQueue = async (req, res, next) => {
  try {
    const { type, status } = req.query;
    const queue = await dictionaryService.getReviewQueue(type, status);
    res.status(200).json({ success: true, data: queue });
  } catch (error) {
    next(error);
  }
};

const approveIngestItem = async (req, res, next) => {
  try {
    const savedEntity = await dictionaryService.approveIngestItem(req.params.id, req.body.payload);
    res.status(200).json({ success: true, message: 'Item approved and saved to live DB', data: savedEntity });
  } catch (error) {
    next(error);
  }
};

const bulkApproveIngestItems = async (req, res, next) => {
  try {
    const { approvals } = req.body;
    if (!Array.isArray(approvals)) {
      return res.status(400).json({ success: false, message: 'approvals must be an array' });
    }
    const reviewerId = req.admin?._id || req.member?._id || req.user?.id;

    const result = await dictionaryService.bulkApproveIngestItems(approvals, reviewerId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const rejectIngestItem = async (req, res, next) => {
  try {
    const rejectedItem = await dictionaryService.rejectIngestItem(req.params.id);
    res.status(200).json({ success: true, message: 'Item rejected', data: rejectedItem });
  } catch (error) {
    next(error);
  }
};

const uploadIngestDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const uploaderId = req.admin?._id || req.member?._id || req.user?.id;
    
    const result = await dictionaryService.uploadIngestDocument(req.file.buffer, req.file.originalname, uploaderId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const createWord = async (req, res, next) => {
  try {
    const wordData = req.body.payload || req.body;
    const result = await dictionaryService.createWord(wordData);
    const count = Array.isArray(result) ? result.length : 1;
    res.status(201).json({ 
      success: true, 
      message: `${count} word${count > 1 ? 's' : ''} added to live dictionary successfully`, 
      data: result,
      count
    });
  } catch (error) {
    next(error);
  }
};

const updateWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body.payload || req.body;
    const word = await dictionaryService.updateWord(id, updateData);
    res.status(200).json({ success: true, message: 'Word updated successfully', data: word });
  } catch (error) {
    next(error);
  }
};

const deleteWord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dictionaryService.deleteWord(id);
    res.status(200).json({ success: true, message: 'Word deleted successfully', data: result });
  } catch (error) {
    next(error);
  }
};

const getAllWords = async (req, res, next) => {
  try {
    const { cat, q, word, search, page, limit, sort, order } = req.query;
    const searchTerm = q || word || search || '';
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const sortParam = sort || order;
    const result = await dictionaryService.getAllWords({ 
      cat, 
      q: searchTerm, 
      page: pageNum, 
      limit: limitNum, 
      sort: sortParam 
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};


const getAllQuestions = async (req, res, next) => {
  try {
    const { cat, type, category, q, question, search, page, limit, sort, order } = req.query;
    const searchTerm = q || question || search || '';
    const categoryParam = cat || type || category || '';
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const sortParam = sort || order;
    const result = await dictionaryService.getAllQuestions({ 
      cat: categoryParam, 
      q: searchTerm, 
      page: pageNum, 
      limit: limitNum, 
      sort: sortParam 
    });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

const createQuestion = async (req, res, next) => {
  try {
    const questionData = req.body.payload || req.body;
    const result = await dictionaryService.createQuestion(questionData);
    const count = Array.isArray(result) ? result.length : 1;
    res.status(201).json({ 
      success: true, 
      message: `${count} question${count > 1 ? 's' : ''} saved successfully`, 
      data: result,
      count
    });
  } catch (error) {
    next(error);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body.payload || req.body;
    const question = await dictionaryService.updateQuestion(id, updateData);
    res.status(200).json({ success: true, message: 'Question updated successfully', data: question });
  } catch (error) {
    next(error);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await dictionaryService.deleteQuestion(id);
    res.status(200).json({ success: true, message: 'Question deleted successfully', data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createWord,
  getAllWords,
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