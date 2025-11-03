const { createErrorResponse } = require('../utils/errorMapper');
const {
  saveNutritionPlan,
  getActiveNutritionPlan,
  getNutritionPlanById,
  getAllNutritionPlans,
  deleteNutritionPlan,
} = require('../services/nutritionPlanService');

/**
 * POST /api/nutrition-plan
 * Create a new nutrition plan for the authenticated user.
 */
const createNutritionPlan = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const planData = req.body;

    if (!planData || Object.keys(planData).length === 0) {
      return res
        .status(400)
        .json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
    }

    const savedPlan = await saveNutritionPlan(userId, planData);

    return res.status(201).json({
      message: 'Nutrition plan created successfully',
      plan: savedPlan,
    });
  } catch (error) {
    console.error('Error creating nutrition plan:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to create nutrition plan.'));
  }
};

/**
 * GET /api/nutrition-plan
 * Get the active nutrition plan for the authenticated user.
 */
const getActivePlan = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const plan = await getActiveNutritionPlan(userId);

    if (!plan) {
      return res
        .status(404)
        .json(createErrorResponse('PLAN_NOT_FOUND', 'No active nutrition plan found.'));
    }

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to fetch nutrition plan.'));
  }
};

/**
 * PUT /api/nutrition-plan/:planId
 * Update an existing nutrition plan.
 */
const updateNutritionPlan = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { planId } = req.params;
    const planData = req.body;

    if (!planData || Object.keys(planData).length === 0) {
      return res
        .status(400)
        .json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
    }

    const updatedPlan = await saveNutritionPlan(userId, planData, planId);

    return res.status(200).json({
      message: 'Nutrition plan updated successfully',
      plan: updatedPlan,
    });
  } catch (error) {
    console.error('Error updating nutrition plan:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to update nutrition plan.'));
  }
};

/**
 * GET /api/nutrition-plan/:planId
 * Get a specific nutrition plan by ID.
 */
const getPlanById = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { planId } = req.params;

    const plan = await getNutritionPlanById(userId, planId);

    if (!plan) {
      return res
        .status(404)
        .json(createErrorResponse('PLAN_NOT_FOUND', 'Nutrition plan not found.'));
    }

    return res.status(200).json({ plan });
  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to fetch nutrition plan.'));
  }
};

/**
 * GET /api/nutrition-plan/history
 * Get all nutrition plans for the authenticated user.
 */
const getPlanHistory = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const limit = parseInt(req.query.limit) || 10;

    const plans = await getAllNutritionPlans(userId, limit);

    return res.status(200).json({ plans });
  } catch (error) {
    console.error('Error fetching nutrition plan history:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to fetch nutrition plan history.'));
  }
};

/**
 * DELETE /api/nutrition-plan/:planId
 * Delete a nutrition plan.
 */
const deletePlan = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { planId } = req.params;

    await deleteNutritionPlan(userId, planId);

    return res.status(200).json({
      message: 'Nutrition plan deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting nutrition plan:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to delete nutrition plan.'));
  }
};

module.exports = {
  createNutritionPlan,
  getActivePlan,
  updateNutritionPlan,
  getPlanById,
  getPlanHistory,
  deletePlan,
};

