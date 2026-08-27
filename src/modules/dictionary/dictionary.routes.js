const express = require('express');
const router = express.Router();
const dictionaryController = require('./dictionary.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { adminAuthMiddleware } = require('../../middlewares/adminAuth.middleware');

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
router.post('/progress/flashcard', dictionaryController.updateFlashcardProgress);
router.post('/progress/mcq-attempt', dictionaryController.updateMcqAttempt);
router.get('/progress/:studentId/due', dictionaryController.getDueItems);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Admin Ingestion & Review Queue (require admin auth)
router.use('/ingest', adminAuthMiddleware);

router.post('/ingest/upload', upload.single('file'), dictionaryController.uploadIngestDocument);
router.get('/ingest/review-queue', dictionaryController.getReviewQueue);
router.post('/ingest/bulk-approve', dictionaryController.bulkApproveIngestItems);
router.post('/ingest/:id/approve', dictionaryController.approveIngestItem);
router.post('/ingest/:id/reject', dictionaryController.rejectIngestItem);

module.exports = router;
