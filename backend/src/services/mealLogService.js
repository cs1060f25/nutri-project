/**
 * Service for managing meal logs in Firestore
 */

const { admin } = require('../config/firebase');

const MEALS_COLLECTION = 'mealLogs';

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
 * Create a new meal log
 */
const createMealLog = async (userId, userEmail, mealData) => {
  const totals = calculateTotals(mealData.items);
  
  const mealLog = {
    userId,
    userEmail,
    mealDate: mealData.mealDate,
    mealType: mealData.mealType,
    locationId: mealData.locationId,
    locationName: mealData.locationName,
    items: mealData.items,
    totals,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await getDb().collection(MEALS_COLLECTION).add(mealLog);
  
  return {
    id: docRef.id,
    ...mealLog,
    timestamp: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

/**
 * Get meal logs for a user
 */
const getMealLogs = async (userId, filters = {}) => {
  let query = getDb().collection(MEALS_COLLECTION).where('userId', '==', userId);

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

  // Order by timestamp descending (most recent first)
  query = query.orderBy('timestamp', 'desc');

  // Limit results
  const limit = filters.limit || 50;
  query = query.limit(limit);

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

  return meals;
};

/**
 * Get a single meal log by ID
 */
const getMealLogById = async (userId, mealId) => {
  const doc = await getDb().collection(MEALS_COLLECTION).doc(mealId).get();
  
  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  const data = doc.data();
  
  // Verify the meal belongs to the user
  if (data.userId !== userId) {
    throw new Error('Unauthorized access to meal log');
  }

  return {
    id: doc.id,
    ...data,
    timestamp: data.timestamp?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

/**
 * Update a meal log
 */
const updateMealLog = async (userId, mealId, updates) => {
  const docRef = getDb().collection(MEALS_COLLECTION).doc(mealId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized access to meal log');
  }

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
 * Delete a meal log
 */
const deleteMealLog = async (userId, mealId) => {
  const docRef = getDb().collection(MEALS_COLLECTION).doc(mealId);
  const doc = await docRef.get();

  if (!doc.exists) {
    throw new Error('Meal log not found');
  }

  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized access to meal log');
  }

  await docRef.delete();

  return { id: mealId, deleted: true };
};

/**
 * Get daily nutritional summary
 */
const getDailySummary = async (userId, date) => {
  const snapshot = await getDb().collection(MEALS_COLLECTION)
    .where('userId', '==', userId)
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

module.exports = {
  createMealLog,
  getMealLogs,
  getMealLogById,
  updateMealLog,
  deleteMealLog,
  getDailySummary,
  calculateTotals, // Export for testing
};

