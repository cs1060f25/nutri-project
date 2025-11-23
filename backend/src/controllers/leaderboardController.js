/**
 * Controller for leaderboard endpoints
 */

const leaderboardService = require('../services/leaderboardService');

/**
 * GET /api/leaderboard
 * Get leaderboard data with optional filters
 */
const getLeaderboard = async (req, res) => {
  try {
    const { classYear, residence, dietaryPattern, limit } = req.query;
    
    const filters = {};
    if (classYear) filters.classYear = classYear;
    if (residence) filters.residence = residence;
    if (dietaryPattern) filters.dietaryPattern = dietaryPattern;
    
    const limitNum = limit ? parseInt(limit, 10) : 100;
    
    const leaderboard = await leaderboardService.getLeaderboard(filters, limitNum);
    
    res.json({
      success: true,
      leaderboard,
      filters
    });
  } catch (error) {
    console.error('Error in getLeaderboard controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch leaderboard'
    });
  }
};

/**
 * GET /api/leaderboard/filters
 * Get available filter options
 */
const getFilterOptions = async (req, res) => {
  try {
    const options = await leaderboardService.getFilterOptions();
    
    res.json({
      success: true,
      ...options
    });
  } catch (error) {
    console.error('Error in getFilterOptions controller:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch filter options'
    });
  }
};

module.exports = {
  getLeaderboard,
  getFilterOptions
};

