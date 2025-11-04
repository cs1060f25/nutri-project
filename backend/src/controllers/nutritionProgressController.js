/**
 * Controller for nutrition progress tracking
 */

const mealLogService = require('../services/mealLogService');
const nutritionPlanService = require('../services/nutritionPlanService');

const parseNutrient = (value) => {
  if (!value) return 0;
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};

const buildProgress = (consumedTotals, metrics = {}) => {
  const progress = {};

  Object.keys(metrics).forEach(metricKey => {
    const metric = metrics[metricKey];
    if (metric.enabled) {
      const target = parseFloat(metric.target) || 0;
      const current = consumedTotals[metricKey] || 0;
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

  return progress;
};

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

    const progress = buildProgress(consumed, activePlan.metrics || {});

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

/**
 * Get nutrition progress across a date range
 * GET /api/nutrition-progress/range?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
const getRangeProgress = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query parameters are required' });
    }

    if (start > end) {
      return res.status(400).json({ error: 'start date must be on or before end date' });
    }

    const activePlan = await nutritionPlanService.getActiveNutritionPlan(userId);

    if (!activePlan) {
      return res.json({
        hasActivePlan: false,
        message: 'No active nutrition plan found',
      });
    }

    const { dailySummaries, meals } = await mealLogService.getMealLogsInRange(userId, start, end);

    const metrics = activePlan.metrics || {};

    const days = dailySummaries.map(summary => {
      const consumed = {
        calories: parseNutrient(summary.totals.calories),
        protein: parseNutrient(summary.totals.protein),
        totalFat: parseNutrient(summary.totals.totalFat),
        saturatedFat: parseNutrient(summary.totals.saturatedFat),
        totalCarbs: parseNutrient(summary.totals.totalCarb),
        fiber: parseNutrient(summary.totals.dietaryFiber),
        sugars: parseNutrient(summary.totals.sugars),
        sodium: parseNutrient(summary.totals.sodium),
      };

      const progress = buildProgress(consumed, metrics);

      return {
        date: summary.date,
        mealCount: summary.mealCount,
        totals: summary.totals,
        progress,
      };
    });

    res.json({
      hasActivePlan: true,
      planName: activePlan.presetName || 'Custom Plan',
      range: {
        start,
        end,
      },
      days,
      meals,
    });
  } catch (error) {
    console.error('Error fetching range nutrition progress:', error);
    res.status(500).json({ error: 'Failed to fetch range nutrition progress' });
  }
};

module.exports = {
  getTodayProgress,
  getRangeProgress,
};
