const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get leaderboard with optional filters
router.get('/', leaderboardController.getLeaderboard);

// Get available filter options
router.get('/filters', leaderboardController.getFilterOptions);

module.exports = router;

