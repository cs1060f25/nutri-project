/**
 * Service for managing meal logs in Firestore
 * Meals are stored in a user-scoped subcollection: users/{userId}/meals/{mealId}
 */

const { admin } = require('../config/firebase');

const USERS_COLLECTION = 'users';
const MEALS_SUBCOLLECTION = 'meals';

// Lazy-load Firestore instance to avoid initialization issues
const getDb = () => admin.firestore();

/**
 * Calculate total nutritional values from items
 */
const calculateTotals = (items) => {
  const totals = {
    calories: 0,
    totalFat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarb: 0,
    dietaryFiber: 0,
    sugars: 0,
    protein: 0,
  };

  items.forEach(item => {
    const qty = item.quantity || 1;
    
    // Parse numeric values from strings like "10g" or "300mg"
    const parseNutrient = (value) => {
      if (!value) return 0;
      const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    totals.calories += parseNutrient(item.calories) * qty;
    totals.totalFat += parseNutrient(item.totalFat) * qty;
    totals.saturatedFat += parseNutrient(item.saturatedFat) * qty;
    totals.transFat += parseNutrient(item.transFat) * qty;
    totals.cholesterol += parseNutrient(item.cholesterol) * qty;
    totals.sodium += parseNutrient(item.sodium) * qty;
    totals.totalCarb += parseNutrient(item.totalCarb) * qty;
    totals.dietaryFiber += parseNutrient(item.dietaryFiber) * qty;
    totals.sugars += parseNutrient(item.sugars) * qty;
    totals.protein += parseNutrient(item.protein) * qty;
  });

  // Round to 1 decimal place and format with units
  return {
    calories: Math.round(totals.calories),
    totalFat: `${totals.totalFat.toFixed(1)}g`,
    saturatedFat: `${totals.saturatedFat.toFixed(1)}g`,
    transFat: `${totals.transFat.toFixed(1)}g`,
    cholesterol: `${totals.cholesterol.toFixed(1)}mg`,
    sodium: `${totals.sodium.toFixed(1)}mg`,
    totalCarb: `${totals.totalCarb.toFixed(1)}g`,
    dietaryFiber: `${totals.dietaryFiber.toFixed(1)}g`,
    sugars: `${totals.sugars.toFixed(1)}g`,
    protein: `${totals.protein.toFixed(1)}g`,
  };
};

/**
 * Create a new meal log in users/{userId}/meals subcollection
 */
const createMealLog = async (userId, userEmail, mealData) => {
  const totals = calculateTotals(mealData.items);
  
  const mealLog = {
    userId,
    userEmail,
    mealDate: mealData.mealDate,
    mealType: mealData.mealType,
    mealName: mealData.mealName || mealData.mealType, // Store actual meal name from HUDS
    locationId: mealData.locationId,
    locationName: mealData.locationName,
    items: mealData.items,
    totals,
    timestamp: mealData.timestamp || admin.firestore.FieldValue.serverTimestamp(), // Allow user-specified timestamp
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const mealsRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION);
  
  const docRef = await mealsRef.add(mealLog);
  
  return {
    id: docRef.id,
    ...mealLog,
    timestamp: mealData.timestamp || new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get meal logs for a user from users/{userId}/meals subcollection
 */
const getMealLogs = async (userId, filters = {}) => {
  const mealsRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION);

  let query = mealsRef;
  const hasDateFilters = filters.startDate || filters.endDate;

  // Apply filters
  if (filters.startDate) {
    query = query.where('mealDate', '>=', filters.startDate);
  }
  if (filters.endDate) {
    query = query.where('mealDate', '<=', filters.endDate);
  }
  if (filters.mealType) {
    query = query.where('mealType', '==', filters.mealType);
  }

  // Only order by timestamp if we don't have date range filters
  // (date range + orderBy requires a composite index)
  // If we have date filters, we'll sort in memory instead
  if (!hasDateFilters) {
    query = query.orderBy('timestamp', 'desc');
  }

  // Limit results (apply before sorting in memory if needed)
  const limit = filters.limit || 50;
  if (!hasDateFilters) {
    query = query.limit(limit);
  }

  const snapshot = await query.get();
  
  const meals = [];
  snapshot.forEach(doc => {
    meals.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  // Sort in memory if we had date filters (to avoid index requirement)
  if (hasDateFilters) {
    meals.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || 0;
      return bTime - aTime; // Descending (most recent first)
    });
    
    // Apply limit after sorting
    if (meals.length > limit) {
      meals.splice(limit);
    }
  }

  return meals;
};

/**
 * Get a single meal log by ID from users/{userId}/meals subcollection
 */
const getMealLogById = async (userId, mealId) => {
  const docRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION)
    .doc(mealId);
  
  const doc = await docRef.get();
  
  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  const data = doc.data();

  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

/**
 * Update a meal log in users/{userId}/meals subcollection
 */
const updateMealLog = async (userId, mealId, updates) => {
  const docRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION)
    .doc(mealId);
  
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  const data = doc.data();

  // Recalculate totals if items changed
  if (updates.items) {
    updates.totals = calculateTotals(updates.items);
  }

  updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await docRef.update(updates);

  return {
    id: mealId,
    ...data,
    ...updates,
    updatedAt: new Date(),
  };
};

/**
 * Delete a meal log from users/{userId}/meals subcollection
 */
const deleteMealLog = async (userId, mealId) => {
  const docRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION)
    .doc(mealId);
  
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  await docRef.delete();

  return { id: mealId, deleted: true };
};

/**
 * Get daily nutritional summary from users/{userId}/meals subcollection
 */
const getDailySummary = async (userId, date) => {
  const snapshot = await getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION)
    .where('mealDate', '==', date)
    .get();

  const meals = [];
  snapshot.forEach(doc => {
    meals.push({ id: doc.id, ...doc.data() });
  });

  // Aggregate totals
  const summary = {
    date,
    mealCount: meals.length,
    meals: meals.map(m => ({
      id: m.id,
      mealType: m.mealType,
      locationName: m.locationName,
      itemCount: m.items.length,
      totals: m.totals,
    })),
    dailyTotals: calculateTotals(
      meals.flatMap(m => m.items)
    ),
  };

  return summary;
};

/**
 * Get meals within a date range and aggregate by day
 */
const getMealLogsInRange = async (userId, startDate, endDate) => {
  const mealsRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION);

  let query = mealsRef;

  if (startDate) {
    query = query.where('mealDate', '>=', startDate);
  }
  if (endDate) {
    query = query.where('mealDate', '<=', endDate);
  }

  // Firestore requires ordering on the same field used in range filters
  query = query.orderBy('mealDate', 'asc');

  const snapshot = await query.get();

  const meals = [];
  const mealsByDate = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const meal = {
      id: doc.id,
      ...data,
      timestamp: data.timestamp?.toDate(),
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    };

    meals.push(meal);

    const dateKey = meal.mealDate;
    if (!mealsByDate[dateKey]) {
      mealsByDate[dateKey] = {
        date: dateKey,
        meals: [],
      };
    }

    mealsByDate[dateKey].meals.push(meal);
  });

  // Build aggregated totals per day using existing helper
  const dailySummaries = Object.values(mealsByDate).map(entry => {
    const items = entry.meals.flatMap(m => m.items || []);
    const totals = calculateTotals(items);

    return {
      date: entry.date,
      mealCount: entry.meals.length,
      totals,
      meals: entry.meals,
    };
  });

  return {
    meals,
    dailySummaries,
  };
};

module.exports = {
  createMealLog,
  getMealLogs,
  getMealLogById,
  updateMealLog,
  deleteMealLog,
  getDailySummary,
  calculateTotals, // Export for testing
  getMealLogsInRange,
};
