/**
 * Service for managing saved meal plans (templates)
 */

const { admin } = require('../config/firebase');

const SAVED_MEAL_PLANS_COLLECTION = 'savedMealPlans';

// Lazy-load Firestore instance to avoid initialization issues
const getDb = () => admin.firestore();

/**
 * Create a new saved meal plan (template)
 */
const createSavedMealPlan = async (userId, savedPlanData) => {
  const { title, mealType, locationId, locationName, selectedItems, image, stars } = savedPlanData;

  if (!title || !mealType || !locationId || !locationName || !selectedItems || !Array.isArray(selectedItems)) {
    throw new Error('Missing required fields: title, mealType, locationId, locationName, and selectedItems array');
  }

  // Validate mealType
  const validMealTypes = ['breakfast', 'lunch', 'dinner'];
  if (!validMealTypes.includes(mealType.toLowerCase())) {
    throw new Error('Invalid mealType. Must be breakfast, lunch, or dinner');
  }

  const db = getDb();
  const savedPlanRef = db.collection(SAVED_MEAL_PLANS_COLLECTION).doc();
  
  const savedPlan = {
    id: savedPlanRef.id,
    userId,
    title: title.trim(),
    mealType: mealType.toLowerCase(),
    locationId,
    locationName,
    selectedItems,
    image: image || null,
    stars: stars || 0,
    usageCount: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await savedPlanRef.set(savedPlan);
  return savedPlan;
};

/**
 * Get all saved meal plans for a user
 */
const getSavedMealPlans = async (userId) => {
  const db = getDb();
  
  try {
    // Remove orderBy to avoid composite index requirement
    // We'll sort in memory instead
    const snapshot = await db.collection(SAVED_MEAL_PLANS_COLLECTION)
      .where('userId', '==', userId)
      .get();

    const plans = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    // Sort by createdAt in descending order (newest first)
    plans.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    return plans;
  } catch (error) {
    console.error('Error in getSavedMealPlans:', error);
    throw error;
  }
};

/**
 * Get a single saved meal plan by ID
 */
const getSavedMealPlanById = async (savedPlanId, userId) => {
  const db = getDb();
  const planRef = db.collection(SAVED_MEAL_PLANS_COLLECTION).doc(savedPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Saved meal plan not found');
  }

  const data = doc.data();
  if (data.userId !== userId) {
    throw new Error('Unauthorized: You can only access your own saved meal plans');
  }

  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };
};

/**
 * Update a saved meal plan
 */
const updateSavedMealPlan = async (savedPlanId, userId, updates) => {
  const db = getDb();
  const planRef = db.collection(SAVED_MEAL_PLANS_COLLECTION).doc(savedPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Saved meal plan not found');
  }

  if (doc.data().userId !== userId) {
    throw new Error('Unauthorized: You can only update your own saved meal plans');
  }

  const allowedUpdates = ['title', 'mealType', 'locationId', 'locationName', 'selectedItems', 'image', 'stars'];
  const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };

  Object.keys(updates).forEach(key => {
    if (allowedUpdates.includes(key)) {
      updateData[key] = updates[key];
    }
  });

  if (updateData.title) {
    updateData.title = updateData.title.trim();
  }

  await planRef.update(updateData);
  return getSavedMealPlanById(savedPlanId, userId);
};

/**
 * Increment usage count when a saved meal plan is used
 */
const incrementUsageCount = async (savedPlanId, userId) => {
  const db = getDb();
  const planRef = db.collection(SAVED_MEAL_PLANS_COLLECTION).doc(savedPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Saved meal plan not found');
  }

  if (doc.data().userId !== userId) {
    throw new Error('Unauthorized: You can only update your own saved meal plans');
  }

  await planRef.update({
    usageCount: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return getSavedMealPlanById(savedPlanId, userId);
};

/**
 * Delete a saved meal plan
 */
const deleteSavedMealPlan = async (savedPlanId, userId) => {
  const db = getDb();
  const planRef = db.collection(SAVED_MEAL_PLANS_COLLECTION).doc(savedPlanId);
  const doc = await planRef.get();

  if (!doc.exists) {
    throw new Error('Saved meal plan not found');
  }

  if (doc.data().userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own saved meal plans');
  }

  await planRef.delete();
  return { success: true };
};

module.exports = {
  createSavedMealPlan,
  getSavedMealPlans,
  getSavedMealPlanById,
  updateSavedMealPlan,
  incrementUsageCount,
  deleteSavedMealPlan,
};

