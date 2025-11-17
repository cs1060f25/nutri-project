/**
 * Controller for saved meal plan endpoints
 */

const savedMealPlanService = require('../services/savedMealPlanService');

/**
 * Create a new saved meal plan
 * POST /api/saved-meal-plans
 */
const createSavedMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const savedPlan = await savedMealPlanService.createSavedMealPlan(userId, req.body);

    res.status(201).json({
      message: 'Saved meal plan created successfully',
      savedPlan,
    });
  } catch (error) {
    console.error('Error creating saved meal plan:', error);
    res.status(400).json({ error: error.message || 'Failed to create saved meal plan' });
  }
};

/**
 * Get all saved meal plans for the user
 * GET /api/saved-meal-plans
 */
const getSavedMealPlans = async (req, res) => {
  try {
    const userId = req.user.uid;
    const savedPlans = await savedMealPlanService.getSavedMealPlans(userId);

    res.json({
      savedPlans,
      count: savedPlans.length,
    });
  } catch (error) {
    console.error('Error fetching saved meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch saved meal plans' });
  }
};

/**
 * Get a single saved meal plan
 * GET /api/saved-meal-plans/:id
 */
const getSavedMealPlanById = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const savedPlan = await savedMealPlanService.getSavedMealPlanById(id, userId);

    res.json(savedPlan);
  } catch (error) {
    console.error('Error fetching saved meal plan:', error);
    if (error.message === 'Saved meal plan not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch saved meal plan' });
  }
};

/**
 * Update a saved meal plan
 * PUT /api/saved-meal-plans/:id
 */
const updateSavedMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const savedPlan = await savedMealPlanService.updateSavedMealPlan(id, userId, req.body);

    res.json({
      message: 'Saved meal plan updated successfully',
      savedPlan,
    });
  } catch (error) {
    console.error('Error updating saved meal plan:', error);
    if (error.message === 'Saved meal plan not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update saved meal plan' });
  }
};

/**
 * Increment usage count
 * POST /api/saved-meal-plans/:id/use
 */
const useSavedMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    const savedPlan = await savedMealPlanService.incrementUsageCount(id, userId);

    res.json({
      message: 'Usage count incremented',
      savedPlan,
    });
  } catch (error) {
    console.error('Error incrementing usage count:', error);
    if (error.message === 'Saved meal plan not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to increment usage count' });
  }
};

/**
 * Delete a saved meal plan
 * DELETE /api/saved-meal-plans/:id
 */
const deleteSavedMealPlan = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    await savedMealPlanService.deleteSavedMealPlan(id, userId);

    res.json({
      message: 'Saved meal plan deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting saved meal plan:', error);
    if (error.message === 'Saved meal plan not found' || error.message.includes('Unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete saved meal plan' });
  }
};

module.exports = {
  createSavedMealPlan,
  getSavedMealPlans,
  getSavedMealPlanById,
  updateSavedMealPlan,
  useSavedMealPlan,
  deleteSavedMealPlan,
};

