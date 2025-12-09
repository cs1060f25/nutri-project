/**
 * Service for managing meal plans
 */

const { admin } = require('../config/firebase');

const MEAL_PLANS_COLLECTION = 'mealPlans';

// Lazy-load Firestore instance to avoid initialization issues
const getDb = () => admin.firestore();

/**
 * Utility functions for meal plan operations
 * These are pure functions that can be tested independently
 */

/**
 * Validate meal type
 * @param {string} mealType - The meal type to validate
 * @returns {boolean} - True if valid, false otherwise
 */
const validateMealType = (mealType) => {
  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!mealType) return false;
  return validMealTypes.includes(mealType.toLowerCase());
};

/**
 * Sort meal plans by date first, then by meal type
 * @param {Array} mealPlans - Array of meal plan objects
 * @returns {Array} - Sorted array (does not mutate original)
 */
const sortMealPlans = (mealPlans) => {
  return [...mealPlans].sort((a, b) => {
    // Sort by date first
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // If dates are equal, sort by mealType
    const mealTypeOrder = { breakfast: 1, lunch: 2, dinner: 3 };
    const aOrder = mealTypeOrder[a.mealType] || 99;
    const bOrder = mealTypeOrder[b.mealType] || 99;
    return aOrder - bOrder;
  });
};

/**
 * Filter meal plans by date range
 * @param {Array} mealPlans - Array of meal plan objects
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} - Filtered array
 */
const filterMealPlansByDateRange = (mealPlans, startDate, endDate) => {
  return mealPlans.filter(plan => {
    const planDate = plan.date;
    return planDate >= startDate && planDate <= endDate;
  });
};

/**
 * Validate meal plan data structure
 * @param {Object} mealPlanData - The meal plan data to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validateMealPlanData = (mealPlanData) => {
  const errors = [];
  
  if (!mealPlanData.date) {
    errors.push('date is required');
  }
  
  if (!mealPlanData.mealType) {
    errors.push('mealType is required');
  } else if (!validateMealType(mealPlanData.mealType)) {
    errors.push('mealType must be breakfast, lunch, or dinner');
  }
  
  if (!mealPlanData.locationId) {
    errors.push('locationId is required');
  }
  
  if (!mealPlanData.locationName) {
    errors.push('locationName is required');
  }
  
  if (!mealPlanData.selectedItems) {
    errors.push('selectedItems is required');
  } else if (!Array.isArray(mealPlanData.selectedItems)) {
    errors.push('selectedItems must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Group meal plans by date
 * @param {Array} mealPlans - Array of meal plan objects
 * @returns {Object} - Object with dates as keys and arrays of plans as values
 */
const groupMealPlansByDate = (mealPlans) => {
  const grouped = {};
  
  mealPlans.forEach(plan => {
    const date = plan.date;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(plan);
  });
  
  // Sort each date's plans by meal type
  Object.keys(grouped).forEach(date => {
    grouped[date] = sortMealPlans(grouped[date]);
  });
  
  return grouped;
};

/**
 * Create a new meal plan
 */
const createMealPlan = async (userId, mealPlanData) => {
  const { date, mealType, locationId, locationName, selectedItems } = mealPlanData;

  if (!date || !mealType || !locationId || !locationName || !selectedItems || !Array.isArray(selectedItems)) {
    throw new Error('Missing required fields: date, mealType, locationId, locationName, and selectedItems array');
  }

  // Validate mealType
  if (!validateMealType(mealType)) {
    throw new Error('Invalid mealType. Must be breakfast, lunch, or dinner');
  }

  const db = getDb();
  
  // Check if a meal plan already exists for this date, mealType, and user
  const existingPlans = await db.collection(MEAL_PLANS_COLLECTION)
    .where('userId', '==', userId)
    .where('date', '==', date)
    .where('mealType', '==', mealType.toLowerCase())
    .get();

  if (!existingPlans.empty) {
    // Update existing plan
    const existingPlanId = existingPlans.docs[0].id;
    await db.collection(MEAL_PLANS_COLLECTION).doc(existingPlanId).update({
      locationId,
      locationName,
      selectedItems,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { id: existingPlanId, ...mealPlanData, userId };
  }

  // Create new plan
  const mealPlanRef = db.collection(MEAL_PLANS_COLLECTION).doc();
  const mealPlan = {
    id: mealPlanRef.id,
    userId,
    date,
    mealType: mealType.toLowerCase(),
    locationId,
    locationName,
    selectedItems,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await mealPlanRef.set(mealPlan);
  return mealPlan;
};

/**
 * Get meal plans for a user within a date range
 */
const getMealPlans = async (userId, startDate, endDate) => {
  const db = getDb();
  
  try {
    // Firestore requires a composite index for range queries combined with other filters
    // To avoid needing an index, fetch all meal plans for the user and filter in memory
    const plansRef = db.collection(MEAL_PLANS_COLLECTION)
      .where('userId', '==', userId);

    const snapshot = await plansRef.get();
    let mealPlans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    // Filter by date range in memory
    mealPlans = filterMealPlansByDateRange(mealPlans, startDate, endDate);
    
    // Sort by date first, then by mealType
    mealPlans = sortMealPlans(mealPlans);
    
    return mealPlans;
  } catch (error) {
    console.error('Error in getMealPlans:', error);
    throw error;
  }
};

/**
 * Get a single meal plan by ID
 */
const getMealPlanById = async (mealPlanId) => {
  const db = getDb();
  const planRef = db.collection(MEAL_PLANS_COLLECTION).doc(mealPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Meal plan not found');
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * Update a meal plan
 */
const updateMealPlan = async (mealPlanId, userId, updates) => {
  const db = getDb();
  const planRef = db.collection(MEAL_PLANS_COLLECTION).doc(mealPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Meal plan not found');
  }

  if (doc.data().userId !== userId) {
    throw new Error('Unauthorized: You can only update your own meal plans');
  }

  const allowedUpdates = ['locationId', 'locationName', 'selectedItems', 'date', 'mealType'];
  const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = updates[key];
    }
  });

  await planRef.update(updateData);
  return getMealPlanById(mealPlanId);
};

/**
 * Delete a meal plan
 */
const deleteMealPlan = async (mealPlanId, userId) => {
  const db = getDb();
  const planRef = db.collection(MEAL_PLANS_COLLECTION).doc(mealPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Meal plan not found');
  }

  if (doc.data().userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own meal plans');
  }

  await planRef.delete();
  return { success: true };
};

module.exports = {
  createMealPlan,
  getMealPlans,
  getMealPlanById,
  updateMealPlan,
  deleteMealPlan,
  // Export utility functions for testing
  validateMealType,
  sortMealPlans,
  filterMealPlansByDateRange,
  validateMealPlanData,
  groupMealPlansByDate,
};

