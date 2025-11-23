/**
 * Service for managing meal plans
 */

const { admin } = require('../config/firebase');

const MEAL_PLANS_COLLECTION = 'mealPlans';

// Lazy-load Firestore instance to avoid initialization issues
const getDb = () => admin.firestore();

/**
 * Create a new meal plan
 */
const createMealPlan = async (userId, mealPlanData) => {
  const { date, mealType, locationId, locationName, selectedItems } = mealPlanData;

  if (!date || !mealType || !locationId || !locationName || !selectedItems || !Array.isArray(selectedItems)) {
    throw new Error('Missing required fields: date, mealType, locationId, locationName, and selectedItems array');
  }

  // Validate mealType
  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!validMealTypes.includes(mealType.toLowerCase())) {
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
    mealPlans = mealPlans.filter(plan => {
      const planDate = plan.date;
      return planDate >= startDate && planDate <= endDate;
    });
    
    // Sort by date first, then by mealType
    mealPlans.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      // If dates are equal, sort by mealType
      const mealTypeOrder = { breakfast: 1, lunch: 2, dinner: 3 };
      const aOrder = mealTypeOrder[a.mealType] || 99;
      const bOrder = mealTypeOrder[b.mealType] || 99;
      return aOrder - bOrder;
    });
    
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
};

