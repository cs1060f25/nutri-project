/**
 * Controller for meal log endpoints
 */

const mealLogService = require('../services/mealLogService');

/**
 * Create a new meal log
 * POST /api/meals
 */
const createMealLog = async (req, res) => {
  try {
    const { mealDate, mealType, locationId, locationName, items } = req.body;
    const userId = req.user.uid;
    const userEmail = req.user.email;

    // Validation
    if (!mealDate || !mealType || !locationId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: mealDate, mealType, locationId, items',
      });
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner'];
    if (!validMealTypes.includes(mealType)) {
      return res.status(400).json({
        error: 'Invalid mealType. Must be: breakfast, lunch, or dinner',
      });
    }

    const mealLog = await mealLogService.createMealLog(userId, userEmail, {
      mealDate,
      mealType,
      locationId,
      locationName,
      items,
    });

    res.status(201).json({
      message: 'Meal logged successfully',
      meal: mealLog,
    });
  } catch (error) {
    console.error('Error creating meal log:', error);
    res.status(500).json({ error: 'Failed to create meal log' });
  }
};

/**
 * Get user's meal logs
 * GET /api/meals
 */
const getMealLogs = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate, mealType, limit } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (mealType) filters.mealType = mealType;
    if (limit) filters.limit = parseInt(limit, 10);

    const meals = await mealLogService.getMealLogs(userId, filters);

    res.json({
      meals,
      count: meals.length,
    });
  } catch (error) {
    console.error('Error fetching meal logs:', error);
    res.status(500).json({ error: 'Failed to fetch meal logs' });
  }
};

/**
 * Get a single meal log
 * GET /api/meals/:id
 */
const getMealLogById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const meal = await mealLogService.getMealLogById(userId, id);

    res.json(meal);
  } catch (error) {
    console.error('Error fetching meal log:', error);
    if (error.message === 'Meal log not found') {
      return res.status(404).json({ error: 'Meal log not found' });
    }
    if (error.message === 'Unauthorized access to meal log') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    res.status(500).json({ error: 'Failed to fetch meal log' });
  }
};

/**
 * Update a meal log
 * PUT /api/meals/:id
 */
const updateMealLog = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updates = req.body;

    // Don't allow updating userId or timestamps
    delete updates.userId;
    delete updates.userEmail;
    delete updates.createdAt;
    delete updates.timestamp;

    const meal = await mealLogService.updateMealLog(userId, id, updates);

    res.json({
      message: 'Meal log updated successfully',
      meal,
    });
  } catch (error) {
    console.error('Error updating meal log:', error);
    if (error.message === 'Meal log not found') {
      return res.status(404).json({ error: 'Meal log not found' });
    }
    if (error.message === 'Unauthorized access to meal log') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    res.status(500).json({ error: 'Failed to update meal log' });
  }
};

/**
 * Delete a meal log
 * DELETE /api/meals/:id
 */
const deleteMealLog = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    await mealLogService.deleteMealLog(userId, id);

    res.json({
      message: 'Meal log deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting meal log:', error);
    if (error.message === 'Meal log not found') {
      return res.status(404).json({ error: 'Meal log not found' });
    }
    if (error.message === 'Unauthorized access to meal log') {
      return res.status(403).json({ error: 'Unauthorized access' });
    }
    res.status(500).json({ error: 'Failed to delete meal log' });
  }
};

/**
 * Get daily nutritional summary
 * GET /api/meals/summary/:date
 */
const getDailySummary = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { date } = req.params;

    const summary = await mealLogService.getDailySummary(userId, date);

    res.json(summary);
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: 'Failed to fetch daily summary' });
  }
};

module.exports = {
  createMealLog,
  getMealLogs,
  getMealLogById,
  updateMealLog,
  deleteMealLog,
  getDailySummary,
};

