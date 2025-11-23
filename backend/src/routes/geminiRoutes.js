const express = require('express');
const multer = require('multer');
const geminiController = require('../controllers/geminiController');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

router.post('/analyze-meal', upload.single('image'), geminiController.analyzeMealImage);

module.exports = router;
