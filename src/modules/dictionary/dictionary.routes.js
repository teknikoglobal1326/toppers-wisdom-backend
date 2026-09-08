const express = require('express');
const router = express.Router();
const dictionaryController = require('./dictionary.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { adminAuthMiddleware } = require('../../middlewares/adminAuth.middleware');

const flexibleAuth = (req, res, next) => {
  adminAuthMiddleware(req, res, (err1) => {
    if (!err1) return next();
    authMiddleware(req, res, (err2) => {
      if (!err2) return next();
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    });
  });
};

// Route for all words - allow admin or student auth
router.get('/words', flexibleAuth, dictionaryController.getAllWords);
router.post('/words', flexibleAuth, dictionaryController.createWord);

// Admin Word Management Routes
router.put('/words/:id', flexibleAuth, dictionaryController.updateWord);
router.patch('/words/:id', flexibleAuth, dictionaryController.updateWord);
router.delete('/words/:id', flexibleAuth, dictionaryController.deleteWord);

// Question Management Routes
router.get('/questions', flexibleAuth, dictionaryController.getAllQuestions);
router.post('/questions', flexibleAuth, dictionaryController.createQuestion);
router.put('/questions/:id', flexibleAuth, dictionaryController.updateQuestion);
router.patch('/questions/:id', flexibleAuth, dictionaryController.updateQuestion);
router.delete('/questions/:id', flexibleAuth, dictionaryController.deleteQuestion);


// User routes (require student auth)
router.use('/categories', authMiddleware);
router.use('/search', authMiddleware);
router.use('/progress', authMiddleware);

// Read-Only Core Endpoints
router.get('/categories', dictionaryController.getCategories);
router.get('/categories/:cat/hub', dictionaryController.getCategoryHub);
router.get('/categories/:cat/groups', dictionaryController.getCategoryGroups);
router.get('/categories/:cat/words', dictionaryController.getWords);
router.get('/search', dictionaryController.searchWords);
router.get('/words/:id', dictionaryController.getWordById);

// Practice & MCQ Route
router.get('/categories/:cat/practice/mcq', dictionaryController.getPracticeMcqs);

// Progress & Spaced Repetition Routes
router.post('/progress/flash-card', dictionaryController.updateFlashcardProgress);
router.post('/progress/mcq-attempt', dictionaryController.updateMcqAttempt);
router.get('/progress/:studentId/due', dictionaryController.getDueItems);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Admin Ingestion & Review Queue
router.use('/ingest', flexibleAuth);

router.post('/ingest/upload', upload.single('file'), dictionaryController.uploadIngestDocument);
router.get('/ingest/review-queue', dictionaryController.getReviewQueue);
router.post('/ingest/bulk-approve', dictionaryController.bulkApproveIngestItems);
router.post('/ingest/:id/approve', dictionaryController.approveIngestItem);
router.post('/ingest/:id/reject', dictionaryController.rejectIngestItem);
router.put('/ingest/:id', dictionaryController.updateWord);
router.patch('/ingest/:id', dictionaryController.updateWord);
router.delete('/ingest/:id', dictionaryController.deleteWord);

module.exports = router;