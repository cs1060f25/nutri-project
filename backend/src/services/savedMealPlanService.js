/**
 * Service for managing saved meal plans (templates)
 */

const { admin } = require('../config/firebase');

const SAVED_MEAL_PLANS_COLLECTION = 'savedMealPlans';
const USERS_COLLECTION = 'users';

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
 * Helper function to normalize item name for comparison
 */
const normalizeItemName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Helper function to check if two items match
 */
const itemsMatch = (item1, item2) => {
  // First try to match by ID (recipeId or id)
  const id1 = item1.recipeId || item1.id || item1.Recipe_Number;
  const id2 = item2.recipeId || item2.id || item2.Recipe_Number;
  
  if (id1 && id2 && String(id1) === String(id2)) {
    return true;
  }
  
  // Fallback to name matching
  const name1 = normalizeItemName(item1.recipeName || item1.name || item1.matchedName);
  const name2 = normalizeItemName(item2.recipeName || item2.name || item2.matchedName);
  
  return name1 === name2;
};

/**
 * Calculate actual usage count by counting meal logs that match the saved meal plan
 */
const calculateActualUsageCount = async (userId, savedPlan) => {
  try {
    const db = getDb();
    
    // Get all meal logs for the user (no limit for accurate count)
    const mealsRef = db
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection('meals');
    
    const snapshot = await mealsRef.get();
    
    const mealLogs = [];
    snapshot.forEach(doc => {
      mealLogs.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    
    if (!mealLogs || mealLogs.length === 0) {
      return 0;
    }
    
    // Get saved plan items
    const savedPlanItems = savedPlan.selectedItems || [];
    if (savedPlanItems.length === 0) {
      return 0;
    }
    
    // Create a set of saved plan item identifiers for quick lookup
    const savedPlanItemIds = new Set(
      savedPlanItems.map(item => {
        const id = item.recipeId || item.id || item.Recipe_Number;
        return id ? String(id) : normalizeItemName(item.name || item.recipeName);
      })
    );
    
    // Count meal logs that match
    let count = 0;
    for (const mealLog of mealLogs) {
      const mealLogItems = mealLog.items || [];
      
      // Check if meal log has same number of items
      if (mealLogItems.length !== savedPlanItems.length) {
        continue;
      }
      
      // Check if meal type and location match
      if (savedPlan.mealType && mealLog.mealType && 
          savedPlan.mealType.toLowerCase() !== mealLog.mealType.toLowerCase()) {
        continue;
      }
      
      if (savedPlan.locationId && mealLog.locationId && 
          savedPlan.locationId !== mealLog.locationId) {
        continue;
      }
      
      // Check if all items match
      const mealLogItemIds = new Set(
        mealLogItems.map(item => {
          const id = item.recipeId || item.id || item.Recipe_Number;
          return id ? String(id) : normalizeItemName(item.recipeName || item.name);
        })
      );
      
      // Check if sets match (same items)
      if (savedPlanItemIds.size === mealLogItemIds.size &&
          [...savedPlanItemIds].every(id => mealLogItemIds.has(id))) {
        count++;
      }
    }
    
    return count;
  } catch (error) {
    console.error('Error calculating actual usage count:', error);
    // Return stored usageCount as fallback
    return savedPlan.usageCount || 0;
  }
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

    // Calculate actual usage count for each plan
    const plansWithUsageCount = await Promise.all(
      plans.map(async (plan) => {
        const actualUsageCount = await calculateActualUsageCount(userId, plan);
        return {
          ...plan,
          usageCount: actualUsageCount, // Override stored usageCount with calculated value
        };
      })
    );

    // Sort by createdAt in descending order (newest first)
    plansWithUsageCount.sort((a, b) => {
      const aTime = a.createdAt?.getTime() || 0;
      const bTime = b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });

    return plansWithUsageCount;
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

  const allowedUpdates = ['title', 'mealType', 'locationId', 'locationName', 'selectedItems', 'image', 'stars', 'usageCount'];
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

