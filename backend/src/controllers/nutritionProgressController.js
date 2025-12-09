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

const metricDisplayNames = {
  calories: 'Calories',
  protein: 'Protein',
  totalFat: 'Total Fat',
  saturatedFat: 'Saturated Fat',
  totalCarbs: 'Total Carbohydrates',
  fiber: 'Fiber',
  sugars: 'Sugars',
  sodium: 'Sodium',
  cholesterol: 'Cholesterol',
};

const getMetricDisplayName = (key) => metricDisplayNames[key] || key;

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

const computeStreak = (dailySummaries, rangeStart, rangeEnd) => {
  if (!dailySummaries || dailySummaries.length === 0) return 0;

  const dateMap = new Map();
  dailySummaries.forEach(summary => {
    dateMap.set(summary.date, summary.mealCount);
  });

  const endDate = new Date(rangeEnd);
  const startDate = new Date(rangeStart);
  if (Number.isNaN(endDate.getTime()) || Number.isNaN(startDate.getTime())) {
    return 0;
  }

  let streak = 0;
  const current = new Date(endDate);

  while (current >= startDate) {
    const key = current.toISOString().split('T')[0];
    const mealCount = dateMap.get(key) || 0;
    if (mealCount > 0) {
      streak += 1;
    } else {
      break;
    }
    current.setDate(current.getDate() - 1);
  }

  return streak;
};

const buildCallToAction = (day, metrics) => {
  if (!day || !metrics) return null;

  const unmet = Object.entries(day.progress || {})
    .filter(([, metric]) => metric.status === 'below')
    .map(([key]) => ({
      key,
      display: metrics[key]?.displayName || getMetricDisplayName(key),
    }));

  if (unmet.length === 0) {
    return null;
  }

  const macroNames = unmet.map(item => item.display || item.name || item.key);
  const macroList = macroNames.join(', ');
  const message =
    day.mealCount >= 3
      ? `Tomorrow make sure you hit ${macroList} to close the gap.`
      : `For your next meal focus on ${macroList} to stay on track.`;

  return {
    message,
    macros: macroNames,
  };
};

/**
 * Get today's nutrition progress compared to active plan
 * GET /api/nutrition-progress/today
 */
// Get current date in Eastern Time (America/New_York)
const getEasternDate = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get date in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
};

const getTodayProgress = async (req, res) => {
  try {
    const userId = req.user.uid;
    const today = getEasternDate(); // YYYY-MM-DD format in Eastern Time

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

    // Debug logging
    console.log('=== TODAY PROGRESS DEBUG ===');
    console.log('Date:', today);
    console.log('User ID:', userId);
    console.log('Meal count:', dailySummary.mealCount);
    console.log('Meals:', JSON.stringify(dailySummary.meals, null, 2));
    console.log('Daily totals:', JSON.stringify(dailySummary.dailyTotals, null, 2));

    // Parse nutritional totals from today's meals
    const consumed = {
      calories: parseNutrient(dailySummary.dailyTotals.calories),
      protein: parseNutrient(dailySummary.dailyTotals.protein),
      totalFat: parseNutrient(dailySummary.dailyTotals.totalFat || dailySummary.dailyTotals.fat),
      saturatedFat: parseNutrient(dailySummary.dailyTotals.saturatedFat),
      totalCarbs: parseNutrient(dailySummary.dailyTotals.totalCarbs || dailySummary.dailyTotals.totalCarb || dailySummary.dailyTotals.carbs),
      fiber: parseNutrient(dailySummary.dailyTotals.dietaryFiber),
      sugars: parseNutrient(dailySummary.dailyTotals.sugars),
      sodium: parseNutrient(dailySummary.dailyTotals.sodium),
      cholesterol: parseNutrient(dailySummary.dailyTotals.cholesterol),
    };

    console.log('Parsed consumed:', JSON.stringify(consumed, null, 2));
    console.log('=== END DEBUG ===');

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

    const metricMetadata = {};
    Object.entries(metrics).forEach(([key, metric]) => {
      metricMetadata[key] = {
        unit: metric.unit,
        target: metric.target,
        displayName: getMetricDisplayName(key),
      };
    });

    const days = dailySummaries.map(summary => {
      const consumed = {
        calories: parseNutrient(summary.totals.calories),
        protein: parseNutrient(summary.totals.protein),
        totalFat: parseNutrient(summary.totals.totalFat),
        saturatedFat: parseNutrient(summary.totals.saturatedFat),
        totalCarbs: parseNutrient(summary.totals.totalCarbs),
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
        callToAction: buildCallToAction(
          { mealCount: summary.mealCount, progress },
          metricMetadata
        ),
      };
    });

    const trend = computeTrendData(days, metrics);
    const streak = computeStreak(dailySummaries, start, end);

    res.json({
      hasActivePlan: true,
      planName: activePlan.presetName || 'Custom Plan',
      planId: activePlan.id,
      range: {
        start,
        end,
      },
      days,
      meals,
      trend,
      streak,
    });
  } catch (error) {
    console.error('Error fetching range nutrition progress:', error);
    res.status(500).json({ error: 'Failed to fetch range nutrition progress' });
  }
};

module.exports = {
  getTodayProgress,
  getRangeProgress,
  // Export utility functions for testing
  buildProgress,
  computeStreak,
  parseNutrient,
};
