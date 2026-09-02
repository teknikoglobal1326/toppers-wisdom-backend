const express = require('express');
const router = express.Router();
const shareController = require('./share.controller');
const { upload } = require('../../middlewares/upload.middleware');

const { authMiddleware } = require('../../middlewares/auth.middleware');

// POST /api/v1/share/generate-link
router.post('/generate-link', authMiddleware, upload.single('image'), shareController.generateLink);

// The resolution route (GET /s/:slug) will be mounted in app.js at the root level for shorter URLs.

module.exports = router;
