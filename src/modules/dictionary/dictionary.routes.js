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

// User routes (require student auth)
router.use('/categories', authMiddleware);
router.use('/search', authMiddleware);
router.use('/words', authMiddleware);
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

// Admin Word Management Routes
router.put('/words/:id', adminAuthMiddleware, dictionaryController.updateWord);
router.patch('/words/:id', adminAuthMiddleware, dictionaryController.updateWord);
router.delete('/words/:id', adminAuthMiddleware, dictionaryController.deleteWord);

// Admin Ingestion & Review Queue (require admin auth)
router.use('/ingest', adminAuthMiddleware);

router.post('/ingest/upload', upload.single('file'), dictionaryController.uploadIngestDocument);
router.get('/ingest/review-queue', dictionaryController.getReviewQueue);
router.post('/ingest/bulk-approve', dictionaryController.bulkApproveIngestItems);
router.post('/ingest/:id/approve', dictionaryController.approveIngestItem);
router.post('/ingest/:id/reject', dictionaryController.rejectIngestItem);
router.put('/ingest/:id', dictionaryController.updateWord);
router.patch('/ingest/:id', dictionaryController.updateWord);
router.delete('/ingest/:id', dictionaryController.deleteWord);

module.exports = router;
