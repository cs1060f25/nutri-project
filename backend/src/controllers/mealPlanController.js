/**
 * Controller for meal plan endpoints
 */

const mealPlanService = require('../services/mealPlanService');

/**
 * Create a new meal plan
 */
const createMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const mealPlan = await mealPlanService.createMealPlan(userId, req.body);
    res.status(201).json(mealPlan);
  } catch (error) {
    console.error('Error creating meal plan:', error);
    res.status(400).json({ error: error.message });
  }
};

/**
 * Get meal plans for a date range
 */
const getMealPlans = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const mealPlans = await mealPlanService.getMealPlans(userId, startDate, endDate);
    res.json({ mealPlans });
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
};

/**
 * Get a single meal plan by ID
 */
const getMealPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const mealPlan = await mealPlanService.getMealPlanById(id);
    res.json(mealPlan);
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    res.status(404).json({ error: error.message });
  }
};

/**
 * Update a meal plan
 */
const updateMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const mealPlan = await mealPlanService.updateMealPlan(id, userId, req.body);
    res.json(mealPlan);
  } catch (error) {
    console.error('Error updating meal plan:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 400).json({ error: error.message });
  }
};

/**
 * Delete a meal plan
 */
const deleteMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    await mealPlanService.deleteMealPlan(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    res.status(error.message.includes('Unauthorized') ? 403 : 404).json({ error: error.message });
  }
};

module.exports = {
  createMealPlan,
  getMealPlans,
  getMealPlanById,
  updateMealPlan,
  deleteMealPlan,
};

