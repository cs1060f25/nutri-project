/**
 * Routes for meal suggestion endpoints
 */

const express = require('express');
const router = express.Router();
const mealSuggestionController = require('../controllers/mealSuggestionController');
const { verifyToken } = require('../middleware/authMiddleware');

/**
 * POST /api/meal-suggestion
 * Generate meal suggestion using AI
 */
router.post('/', verifyToken, mealSuggestionController.generateSuggestion);

module.exports = router;

