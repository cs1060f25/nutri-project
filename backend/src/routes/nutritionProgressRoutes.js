const express = require('express');
const router = express.Router();
const nutritionProgressController = require('../controllers/nutritionProgressController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get today's nutrition progress
router.get('/today', verifyToken, nutritionProgressController.getTodayProgress);

module.exports = router;

