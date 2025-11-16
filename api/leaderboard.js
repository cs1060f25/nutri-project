/**
 * Vercel serverless function for leaderboard API endpoints
 */

const { initializeFirebase } = require('../backend/config/firebase');
const leaderboardController = require('../backend/src/controllers/leaderboardController');
const { verifyToken } = require('../backend/src/middleware/authMiddleware');

// Initialize Firebase on cold start
let firebaseInitialized = false;
if (!firebaseInitialized) {
  try {
    initializeFirebase();
    firebaseInitialized = true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token for all requests
    await new Promise((resolve, reject) => {
      verifyToken(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Route to appropriate controller method
    if (req.url === '/filters' || req.url.startsWith('/filters?')) {
      await leaderboardController.getFilterOptions(req, res);
    } else {
      await leaderboardController.getLeaderboard(req, res);
    }
  } catch (error) {
    console.error('Leaderboard API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
};

