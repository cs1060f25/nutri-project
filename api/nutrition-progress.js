/**
 * Vercel serverless function for nutrition progress endpoints
 * Mirrors the Express routes in backend/src/routes/nutritionProgressRoutes.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const getDb = () => admin.firestore();
const USERS_COLLECTION = 'users';
const MEALS_SUBCOLLECTION = 'meals';
const NUTRITION_PLANS_SUBCOLLECTION = 'nutritionPlans';

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

// Verify Firebase ID token
const verifyToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('INVALID_TOKEN');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('INVALID_TOKEN');
  }
  
  return await admin.auth().verifyIdToken(idToken, true);
};

// Helper functions
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

// Get active nutrition plan
const getActiveNutritionPlan = async (userId) => {
  const db = getDb();
  // Use subcollection: users/{userId}/nutritionPlans (same as backend)
  const plansRef = db.collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION)
    .where('isActive', '==', true)
    .limit(1);
  
  const snapshot = await plansRef.get();
  if (snapshot.empty) {
    return null;
  }
  
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Get daily summary for a specific date
const getDailySummary = async (userId, date) => {
  const db = getDb();
  // Try both 'date' and 'mealDate' field names for compatibility
  const mealsRef = db.collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION);
  
  // Query by date field (try mealDate first, then date)
  let snapshot = await mealsRef.where('mealDate', '==', date).get();
  if (snapshot.empty) {
    snapshot = await mealsRef.where('date', '==', date).get();
  }
  
  const dailyTotals = {
    calories: 0,
    protein: 0,
    totalFat: 0,
    saturatedFat: 0,
    totalCarb: 0,
    dietaryFiber: 0,
    sugars: 0,
    sodium: 0,
  };
  
  let mealCount = 0;
  
  snapshot.forEach(doc => {
    const meal = doc.data();
    mealCount++;
    
    // Use calculateTotals helper which handles both formats
    if (meal.items && Array.isArray(meal.items)) {
      const mealTotals = calculateTotals(meal.items);
      dailyTotals.calories += mealTotals.calories;
      dailyTotals.protein += mealTotals.protein;
      dailyTotals.totalFat += mealTotals.totalFat;
      dailyTotals.saturatedFat += mealTotals.saturatedFat;
      dailyTotals.totalCarb += mealTotals.totalCarb;
      dailyTotals.dietaryFiber += mealTotals.dietaryFiber;
      dailyTotals.sugars += mealTotals.sugars;
      dailyTotals.sodium += mealTotals.sodium;
    } else if (meal.totals) {
      // If meal has pre-calculated totals, use those
      dailyTotals.calories += parseNutrient(meal.totals.calories || 0);
      dailyTotals.protein += parseNutrient(meal.totals.protein || 0);
      dailyTotals.totalFat += parseNutrient(meal.totals.totalFat || 0);
      dailyTotals.saturatedFat += parseNutrient(meal.totals.saturatedFat || 0);
      dailyTotals.totalCarb += parseNutrient(meal.totals.totalCarb || 0);
      dailyTotals.dietaryFiber += parseNutrient(meal.totals.dietaryFiber || 0);
      dailyTotals.sugars += parseNutrient(meal.totals.sugars || 0);
      dailyTotals.sodium += parseNutrient(meal.totals.sodium || 0);
    } else if (meal.nutrition) {
      // Legacy format: nutrition directly on meal
      dailyTotals.calories += parseNutrient(meal.nutrition.calories || 0);
      dailyTotals.protein += parseNutrient(meal.nutrition.protein || 0);
      dailyTotals.totalFat += parseNutrient(meal.nutrition.totalFat || 0);
      dailyTotals.saturatedFat += parseNutrient(meal.nutrition.saturatedFat || 0);
      dailyTotals.totalCarb += parseNutrient(meal.nutrition.totalCarb || 0);
      dailyTotals.dietaryFiber += parseNutrient(meal.nutrition.dietaryFiber || 0);
      dailyTotals.sugars += parseNutrient(meal.nutrition.sugars || 0);
      dailyTotals.sodium += parseNutrient(meal.nutrition.sodium || 0);
    }
  });
  
  return {
    date,
    mealCount,
    dailyTotals,
  };
};

// Calculate totals from meal items
// Handles both formats: item.nutrition (old format) and direct properties (new format from posts)
const calculateTotals = (items) => {
  const totals = {
    calories: 0,
    protein: 0,
    totalFat: 0,
    saturatedFat: 0,
    totalCarb: 0,
    dietaryFiber: 0,
    sugars: 0,
    sodium: 0,
  };

  if (!items || !Array.isArray(items)) {
    return totals;
  }

  items.forEach(item => {
    const qty = item.quantity || 1;
    
    // Check if nutrition is nested (old format) or direct (new format from posts)
    if (item.nutrition) {
      // Old format: nutrition nested in item.nutrition
      totals.calories += parseNutrient(item.nutrition.calories || 0) * qty;
      totals.protein += parseNutrient(item.nutrition.protein || 0) * qty;
      totals.totalFat += parseNutrient(item.nutrition.totalFat || 0) * qty;
      totals.saturatedFat += parseNutrient(item.nutrition.saturatedFat || 0) * qty;
      totals.totalCarb += parseNutrient(item.nutrition.totalCarb || 0) * qty;
      totals.dietaryFiber += parseNutrient(item.nutrition.dietaryFiber || 0) * qty;
      totals.sugars += parseNutrient(item.nutrition.sugars || 0) * qty;
      totals.sodium += parseNutrient(item.nutrition.sodium || 0) * qty;
    } else {
      // New format: nutrition values directly on item (from posts/meal plans)
      // These values may have units (e.g., "10g"), so parseNutrient handles that
      totals.calories += parseNutrient(item.calories || 0) * qty;
      totals.protein += parseNutrient(item.protein || 0) * qty;
      totals.totalFat += parseNutrient(item.totalFat || 0) * qty;
      totals.saturatedFat += parseNutrient(item.saturatedFat || 0) * qty;
      totals.totalCarb += parseNutrient(item.totalCarb || 0) * qty;
      totals.dietaryFiber += parseNutrient(item.dietaryFiber || 0) * qty;
      totals.sugars += parseNutrient(item.sugars || 0) * qty;
      totals.sodium += parseNutrient(item.sodium || 0) * qty;
    }
  });

  return totals;
};

// Get meal logs in a date range
const getMealLogsInRange = async (userId, startDate, endDate) => {
  const db = getDb();
  const mealsRef = db.collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION);
  
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  // Try mealDate first (as used in backend), fallback to date
  let query = mealsRef.where('mealDate', '>=', startDate).where('mealDate', '<=', endDate);
  let snapshot = await query.get();
  
  // If no results with mealDate, try date field
  if (snapshot.empty) {
    query = mealsRef.where('date', '>=', startDate).where('date', '<=', endDate);
    snapshot = await query.get();
  }
  
  const meals = [];
  const mealsByDate = {};
  
  snapshot.forEach(doc => {
    const data = doc.data();
    const meal = {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp ? new Date(data.timestamp) : null),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null),
    };

    meals.push(meal);

    // Use mealDate if available, otherwise date
    const dateKey = meal.mealDate || meal.date;
    if (!mealsByDate[dateKey]) {
      mealsByDate[dateKey] = {
        date: dateKey,
        meals: [],
      };
    }

    mealsByDate[dateKey].meals.push(meal);
  });

  // Build aggregated totals per day
  const dailySummaries = Object.values(mealsByDate).map(entry => {
    const items = entry.meals.flatMap(m => m.items || []);
    const totals = calculateTotals(items);

    return {
      date: entry.date,
      mealCount: entry.meals.length,
      totals,
    };
  });

  // Sort by date
  dailySummaries.sort((a, b) => a.date.localeCompare(b.date));

  // Sort meals by eatenAt descending
  meals.sort((a, b) => {
    const aTime = a.eatenAt?.toDate ? a.eatenAt.toDate() : (a.eatenAt ? new Date(a.eatenAt) : (a.timestamp || new Date(0)));
    const bTime = b.eatenAt?.toDate ? b.eatenAt.toDate() : (b.eatenAt ? new Date(b.eatenAt) : (b.timestamp || new Date(0)));
    return bTime - aTime;
  });

  return {
    dailySummaries,
    meals,
  };
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Handle both Vercel's url format and standard format
    const url = req.url || req.path || '';
    // Remove query string and /api/nutrition-progress prefix
    const pathWithoutQuery = url.split('?')[0];
    let path = pathWithoutQuery.replace(/^\/api\/nutrition-progress/, '');
    // If path is empty, it means we're at the root
    if (!path || path === '') {
      path = '/';
    }

    // Route: GET /api/nutrition-progress/today
    if (req.method === 'GET' && path === '/today') {
      const today = new Date().toISOString().split('T')[0];

      // Get active nutrition plan
      const activePlan = await getActiveNutritionPlan(userId);
      
      if (!activePlan) {
        return res.json({
          hasActivePlan: false,
          message: 'No active nutrition plan found',
        });
      }

      // Get today's meals summary
      const dailySummary = await getDailySummary(userId, today);

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

      return res.json({
        hasActivePlan: true,
        planName: activePlan.presetName || 'Custom Plan',
        date: today,
        mealCount: dailySummary.mealCount,
        progress,
      });
    }

    // Route: GET /api/nutrition-progress/range?start=YYYY-MM-DD&end=YYYY-MM-DD
    if (req.method === 'GET' && path === '/range') {
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'start and end query parameters are required'));
      }

      if (start > end) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'start date must be on or before end date'));
      }

      const activePlan = await getActiveNutritionPlan(userId);

      if (!activePlan) {
        return res.json({
          hasActivePlan: false,
          message: 'No active nutrition plan found',
        });
      }

      const { dailySummaries, meals } = await getMealLogsInRange(userId, start, end);

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
          callToAction: buildCallToAction(
            { mealCount: summary.mealCount, progress },
            metricMetadata
          ),
        };
      });

      const trend = computeTrendData(days, metrics);
      const streak = computeStreak(dailySummaries, start, end);

      return res.json({
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
    }

    return res.status(404).json(createErrorResponse('NOT_FOUND', 'Endpoint not found'));

  } catch (error) {
    console.error('Nutrition progress API error:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('ERROR', error.message || 'Failed to process request.'));
  }
};

