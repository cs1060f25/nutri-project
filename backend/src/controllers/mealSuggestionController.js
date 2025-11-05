/**
 * Controller for meal suggestion endpoints
 */

const mealSuggestionService = require('../services/mealSuggestionService');
const nutritionPlanService = require('../services/nutritionPlanService');
const nutritionProgressController = require('./nutritionProgressController');

/**
 * Generate meal suggestion
 * POST /api/meal-suggestion
 */
const generateSuggestion = async (req, res) => {
  console.log('=== MEAL SUGGESTION REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('User:', req.user ? req.user.uid : 'NO USER');
  
  try {
    const userId = req.user.uid;
    const { menuItems, mealType } = req.body;
    
    console.log('UserId:', userId);
    console.log('MenuItems count:', menuItems ? menuItems.length : 0);
    console.log('MealType:', mealType);

    if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'menuItems array is required and must not be empty',
        },
      });
    }

    if (!mealType) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'mealType is required',
        },
      });
    }

    // Get active nutrition plan for goals
    console.log('Fetching active nutrition plan...');
    const activePlan = await nutritionPlanService.getActiveNutritionPlan(userId);
    console.log('Active plan:', activePlan ? 'FOUND' : 'NOT FOUND');
    
    if (!activePlan) {
      return res.status(404).json({
        error: {
          code: 'NO_ACTIVE_PLAN',
          message: 'No active nutrition plan found. Please create a nutrition plan first.',
        },
      });
    }

    // Get current progress
    // We'll reuse the logic from nutritionProgressController
    console.log('Fetching daily summary...');
    const today = new Date().toISOString().split('T')[0];
    const mealLogService = require('../services/mealLogService');
    const dailySummary = await mealLogService.getDailySummary(userId, today);
    console.log('Daily summary:', JSON.stringify(dailySummary, null, 2));

    const parseNutrient = (value) => {
      if (!value) return 0;
      const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    const consumed = {
      calories: parseNutrient(dailySummary.dailyTotals.calories),
      protein: parseNutrient(dailySummary.dailyTotals.protein),
      totalFat: parseNutrient(dailySummary.dailyTotals.totalFat),
      saturatedFat: parseNutrient(dailySummary.dailyTotals.saturatedFat),
      totalCarbs: parseNutrient(dailySummary.dailyTotals.totalCarb),
      fiber: parseNutrient(dailySummary.dailyTotals.dietaryFiber),
      sugars: parseNutrient(dailySummary.dailyTotals.sugars),
      sodium: parseNutrient(dailySummary.dailyTotals.sodium),
    };

    // Build current progress for enabled metrics
    const currentProgress = {};
    const metrics = activePlan.metrics || {};

    Object.keys(metrics).forEach(metricKey => {
      const metric = metrics[metricKey];
      if (metric.enabled) {
        const target = parseFloat(metric.target) || 0;
        const current = consumed[metricKey] || 0;
        const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

        currentProgress[metricKey] = {
          current,
          target,
          unit: metric.unit,
          percentage,
          remaining: Math.max(0, target - current),
        };
      }
    });

    // Generate suggestion
    console.log('Calling mealSuggestionService.generateMealSuggestion...');
    console.log('Current progress keys:', Object.keys(currentProgress));
    console.log('Nutrition goals keys:', Object.keys(metrics));
    
    const suggestion = await mealSuggestionService.generateMealSuggestion({
      menuItems,
      currentProgress,
      nutritionGoals: metrics,
      mealType,
    });
    
    console.log('Suggestion generated successfully');
    console.log('Suggestion object:', JSON.stringify(suggestion, null, 2));
    console.log('Suggestion.data type:', typeof suggestion.data);
    console.log('Suggestion.data keys:', suggestion.data ? Object.keys(suggestion.data) : 'null');

    // The service returns { success: true, data: {...}, rawResponse: "..." }
    // We want to return the parsed data directly
    const parsedSuggestion = suggestion.data;
    
    // Ensure it's an object
    if (!parsedSuggestion || typeof parsedSuggestion !== 'object') {
      console.error('Invalid suggestion data:', parsedSuggestion);
      throw new Error('Invalid suggestion data format');
    }
    
    res.json({
      success: true,
      suggestion: parsedSuggestion,
      rawResponse: suggestion.rawResponse,
    });
  } catch (error) {
    console.error('Error generating meal suggestion:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to generate meal suggestion',
      },
    });
  }
};

module.exports = {
  generateSuggestion,
};

