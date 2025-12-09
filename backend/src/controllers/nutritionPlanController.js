const { createErrorResponse } = require('../utils/errorMapper');
const {
  saveNutritionPlan,
  getActiveNutritionPlan,
  getNutritionPlanById,
  getAllNutritionPlans,
  deleteNutritionPlan,
} = require('../services/nutritionPlanService');
const { getUserProfile } = require('../services/userProfileService');
const { generatePersonalizedPlan } = require('../services/personalizedNutritionService');

// Maximum allowed values for nutrition metrics (reasonable upper bounds)
const MAX_ALLOWED_VALUES = {
  calories: 10000,
  caloriesFromFat: 5000,
  protein: 500,
  totalCarbs: 1000,
  totalFat: 300,
  saturatedFat: 100,
  transFat: 20,
  fiber: 100,
  sugars: 500,
  cholesterol: 1000,
  sodium: 10000,
};

/**
 * Sanitize and clamp metric values to prevent abuse
 */
const sanitizeMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') return metrics;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (!value || typeof value !== 'object') {
      sanitized[key] = value;
      continue;
    }
    
    const sanitizedMetric = { ...value };
    if (sanitizedMetric.target !== undefined && sanitizedMetric.target !== '') {
      const numValue = parseFloat(sanitizedMetric.target);
      const maxValue = MAX_ALLOWED_VALUES[key];
      if (!isNaN(numValue) && maxValue && numValue > maxValue) {
        sanitizedMetric.target = maxValue.toString();
      }
    }
    sanitized[key] = sanitizedMetric;
  }
  return sanitized;
};

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

    // Sanitize metrics to prevent absurdly large values
    if (planData.metrics) {
      planData.metrics = sanitizeMetrics(planData.metrics);
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

    // Sanitize metrics to prevent absurdly large values
    if (planData.metrics) {
      planData.metrics = sanitizeMetrics(planData.metrics);
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

/**
 * GET /api/nutrition-plan/personalized
 * Get personalized nutrition plan recommendations based on user profile
 */
const getPersonalizedRecommendation = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res.status(404).json(
        createErrorResponse('PROFILE_NOT_FOUND', 'User profile not found. Please complete your profile.')
      );
    }

    const personalizedPlan = generatePersonalizedPlan(profile);

    if (!personalizedPlan) {
      return res.status(400).json(
        createErrorResponse('INSUFFICIENT_DATA', 'Insufficient profile data to generate personalized plan. Please complete your profile.')
      );
    }

    return res.status(200).json({
      recommendation: personalizedPlan,
    });
  } catch (error) {
    console.error('Error generating personalized recommendation:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to generate personalized recommendation.'));
  }
};

module.exports = {
  createNutritionPlan,
  getActivePlan,
  updateNutritionPlan,
  getPlanById,
  getPlanHistory,
  deletePlan,
  getPersonalizedRecommendation,
};

