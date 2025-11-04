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

const computeTrendData = (days, metrics) => {
  const enabledMetricKeys = Object.entries(metrics || {})
    .filter(([, metric]) => metric.enabled)
    .map(([key]) => key);

  if (enabledMetricKeys.length === 0 || days.length === 0) {
    return {
      series: [],
      metrics: {},
      narratives: [],
    };
  }

  const series = days.map(day => {
    const values = {};
    const targets = {};

    enabledMetricKeys.forEach(key => {
      values[key] = day.totalsNumeric[key] || 0;
      targets[key] = parseFloat(metrics[key].target) || 0;
    });

    return {
      date: day.date,
      mealCount: day.mealCount,
      values,
      targets,
    };
  });

  const metricTrends = {};
  const narratives = [];
  const totalMeals = days.reduce((sum, day) => sum + (day.mealCount || 0), 0);

  enabledMetricKeys.forEach(key => {
    const values = series.map(point => point.values[key] || 0);
    const totalValue = values.reduce((sum, val) => sum + val, 0);
    const avgPerDay = values.length ? totalValue / values.length : 0;
    const avgPerMeal = totalMeals > 0 ? totalValue / totalMeals : 0;

    const half = Math.max(1, Math.ceil(values.length / 2));
    const firstValues = values.slice(0, half);
    const secondValues = values.slice(values.length - half);

    const firstMeals = days.slice(0, half).reduce((sum, day) => sum + (day.mealCount || 0), 0);
    const secondMeals = days.slice(days.length - half)
      .reduce((sum, day) => sum + (day.mealCount || 0), 0);

    const firstAvgPerMeal = firstMeals > 0
      ? firstValues.reduce((sum, val) => sum + val, 0) / firstMeals
      : 0;
    const secondAvgPerMeal = secondMeals > 0
      ? secondValues.reduce((sum, val) => sum + val, 0) / secondMeals
      : 0;

    const changePerMealPercent = firstAvgPerMeal > 0
      ? ((secondAvgPerMeal - firstAvgPerMeal) / firstAvgPerMeal) * 100
      : 0;

    let direction = 'flat';
    if (changePerMealPercent > 5) {
      direction = 'up';
    } else if (changePerMealPercent < -5) {
      direction = 'down';
    }

    metricTrends[key] = {
      averagePerDay: avgPerDay,
      averagePerMeal: avgPerMeal,
      changePerMealPercent,
      direction,
      target: parseFloat(metrics[key].target) || 0,
    };

    const roundedChange = Math.abs(Math.round(changePerMealPercent));
    let message;
    if (direction === 'up') {
      message = `Since the start of this range, your average ${key} per meal increased by ${roundedChange}%`;
    } else if (direction === 'down') {
      message = `Since the start of this range, your average ${key} per meal decreased by ${roundedChange}%`;
    } else {
      message = `Your average ${key} per meal has stayed about the same over this range`;
    }

    narratives.push({
      metric: key,
      direction,
      changePercent: changePerMealPercent,
      message,
    });
  });

  return {
    series,
    metrics: metricTrends,
    narratives,
  };
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
        totalsFormatted: summary.totals,
        totalsNumeric: consumed,
        progress,
      };
    });

    const trend = computeTrendData(days, metrics);

    res.json({
      hasActivePlan: true,
      planName: activePlan.presetName || 'Custom Plan',
      range: {
        start,
        end,
      },
      days,
      meals,
      trend,
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
