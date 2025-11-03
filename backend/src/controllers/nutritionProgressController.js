/**
 * Controller for nutrition progress tracking
 */

const mealLogService = require('../services/mealLogService');
const nutritionPlanService = require('../services/nutritionPlanService');

/**
 * Get today's nutrition progress compared to active plan
 * GET /api/nutrition-progress/today
 */
const getTodayProgress = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get active nutrition plan
    const activePlan = await nutritionPlanService.getActiveNutritionPlan(userId);
    
    if (!activePlan) {
      return res.json({
        hasActivePlan: false,
        message: 'No active nutrition plan found',
      });
    }

    // Get today's meals summary
    const dailySummary = await mealLogService.getDailySummary(userId, today);

    // Parse nutritional totals from today's meals
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

    // Build progress data for each enabled metric
    const progress = {};
    const metrics = activePlan.metrics || {};

    Object.keys(metrics).forEach(metricKey => {
      const metric = metrics[metricKey];
      if (metric.enabled) {
        const target = parseFloat(metric.target) || 0;
        const current = consumed[metricKey] || 0;
        const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

        progress[metricKey] = {
          current,
          target,
          unit: metric.unit,
          percentage,
          remaining: Math.max(0, target - current),
          status: percentage >= 100 ? 'met' : percentage >= 80 ? 'close' : 'below',
        };
      }
    });

    res.json({
      hasActivePlan: true,
      planName: activePlan.presetName || 'Custom Plan',
      date: today,
      mealCount: dailySummary.mealCount,
      progress,
    });

  } catch (error) {
    console.error('Error fetching nutrition progress:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition progress' });
  }
};

module.exports = {
  getTodayProgress,
};

