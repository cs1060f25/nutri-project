const express = require('express');
const router = express.Router();
const nutritionProgressController = require('../controllers/nutritionProgressController');
const { verifyToken } = require('../middleware/authMiddleware');

// Get today's nutrition progress
router.get('/today', verifyToken, nutritionProgressController.getTodayProgress);

// Get nutrition progress for a date range
router.get('/range', verifyToken, nutritionProgressController.getRangeProgress);

module.exports = router;
