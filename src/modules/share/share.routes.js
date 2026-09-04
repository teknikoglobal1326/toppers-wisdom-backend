const express = require('express');
const router = express.Router();
const shareController = require('./share.controller');
const { upload } = require('../../middlewares/upload.middleware');

const { authMiddleware } = require('../../middlewares/auth.middleware');

// POST /api/v1/share/generate-link
router.post('/generate-link', authMiddleware, upload.single('image'), shareController.generateLink);

// GET /api/v1/share/s/:slug - resolve short link
router.get('/s/:slug', shareController.resolveLink);

module.exports = router;
