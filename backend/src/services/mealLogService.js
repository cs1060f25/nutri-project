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
    totalCarbs: 0,
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
    totals.totalFat += parseNutrient(item.totalFat || item.fat) * qty;
    totals.saturatedFat += parseNutrient(item.saturatedFat) * qty;
    totals.transFat += parseNutrient(item.transFat) * qty;
    totals.cholesterol += parseNutrient(item.cholesterol) * qty;
    totals.sodium += parseNutrient(item.sodium) * qty;
    totals.totalCarbs += parseNutrient(item.totalCarbs || item.totalCarb || item.carbs) * qty;
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
    totalCarbs: `${totals.totalCarbs.toFixed(1)}g`,
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
    rating: mealData.rating || null,
    review: mealData.review || null,
    timestamp: mealData.timestamp || admin.firestore.FieldValue.serverTimestamp(), // Allow user-specified timestamp
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add imageUrl if provided
  if (mealData.imageUrl) {
    mealLog.imageUrl = mealData.imageUrl;
  }

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
  // Only filter by mealType in query if we don't have date filters (to avoid composite index)
  if (filters.mealType && !hasDateFilters) {
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
  
  let meals = [];
  snapshot.forEach(doc => {
    meals.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  // Filter by mealType in memory if we had date filters
  if (hasDateFilters && filters.mealType) {
    meals = meals.filter(meal => 
      meal.mealType?.toLowerCase() === filters.mealType.toLowerCase()
    );
  }

  // Sort in memory if we had date filters (to avoid index requirement)
  if (hasDateFilters) {
    meals.sort((a, b) => {
      const aTime = a.timestamp?.getTime() || a.createdAt?.getTime() || 0;
      const bTime = b.timestamp?.getTime() || b.createdAt?.getTime() || 0;
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
 * Also decrements saved meal plan usage count if the meal log was created from a saved meal plan
 * Also deletes any posts associated with this meal log
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

  const mealLogData = doc.data();
  const savedMealPlanId = mealLogData.savedMealPlanId;

  // Delete the meal log
  await docRef.delete();

  // Delete any posts associated with this meal log
  try {
    const POSTS_COLLECTION = 'posts';
    const postsRef = getDb().collection(POSTS_COLLECTION);
    
    // Try to find posts by mealId first (most reliable)
    let postsToDelete = [];
    try {
      const postsQuery = postsRef.where('mealId', '==', mealId).where('userId', '==', userId);
      const postsSnapshot = await postsQuery.get();
      postsToDelete = postsSnapshot.docs;
    } catch (queryError) {
      // If query fails (e.g., missing composite index), try alternative approach
      console.warn('Query by mealId failed, trying alternative method:', queryError.message);
      
      // Query by userId only, then filter by mealId in memory
      try {
        const userPostsQuery = postsRef.where('userId', '==', userId);
        const userPostsSnapshot = await userPostsQuery.get();
        postsToDelete = userPostsSnapshot.docs.filter(doc => {
          const postData = doc.data();
          return postData.mealId === mealId;
        });
      } catch (altError) {
        console.error('Alternative query also failed:', altError.message);
        // As a last resort, try to match by date and mealType
        const mealDate = mealLogData.mealDate;
        const mealType = mealLogData.mealType;
        if (mealDate && mealType) {
          try {
            const datePostsQuery = postsRef.where('userId', '==', userId).where('mealDate', '==', mealDate);
            const datePostsSnapshot = await datePostsQuery.get();
            postsToDelete = datePostsSnapshot.docs.filter(doc => {
              const postData = doc.data();
              return postData.mealType?.toLowerCase() === mealType?.toLowerCase() &&
                     (!postData.mealId || postData.mealId === mealId); // Prefer posts with matching mealId
            });
          } catch (dateError) {
            console.error('Date-based query also failed:', dateError.message);
          }
        }
      }
    }
    
    if (postsToDelete.length > 0) {
      const deletePromises = postsToDelete.map(postDoc => postDoc.ref.delete());
      await Promise.all(deletePromises);
      console.log(`Deleted ${postsToDelete.length} post(s) associated with meal log ${mealId}`);
    } else {
      console.log(`No posts found associated with meal log ${mealId}`);
    }
  } catch (error) {
    // Log error but don't fail the deletion
    console.error('Error deleting associated posts:', error);
    // Continue with deletion even if post deletion fails
  }

  // If this meal log was created from a saved meal plan, decrement the usage count
  if (savedMealPlanId) {
    try {
      const savedMealPlanService = require('./savedMealPlanService');
      // Get the saved meal plan to check current usage count
      const savedPlan = await savedMealPlanService.getSavedMealPlanById(savedMealPlanId, userId);
      
      // Only decrement if usage count is greater than 0
      if (savedPlan && savedPlan.usageCount > 0) {
        await savedMealPlanService.updateSavedMealPlan(savedMealPlanId, userId, {
          usageCount: Math.max(0, savedPlan.usageCount - 1) // Ensure it doesn't go below 0
        });
        console.log(`Decremented usage count for saved meal plan ${savedMealPlanId} to ${savedPlan.usageCount - 1}`);
      }
    } catch (error) {
      // Log error but don't fail the deletion
      console.error('Error decrementing saved meal plan usage count:', error);
      // Continue with deletion even if decrement fails
    }
  }

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
  const allItems = meals.flatMap(m => m.items);
  
  console.log('=== GET DAILY SUMMARY DEBUG ===');
  console.log('Date:', date);
  console.log('User ID:', userId);
  console.log('Meals found:', meals.length);
  console.log('Meals data:', JSON.stringify(meals.map(m => ({
    id: m.id,
    mealDate: m.mealDate,
    mealType: m.mealType,
    itemCount: m.items?.length || 0,
    totals: m.totals,
    firstItem: m.items?.[0] || null,
  })), null, 2));
  console.log('All items count:', allItems.length);
  console.log('First item sample:', allItems[0] ? JSON.stringify(allItems[0], null, 2) : 'No items');
  
  const dailyTotals = calculateTotals(allItems);
  console.log('Calculated daily totals:', JSON.stringify(dailyTotals, null, 2));
  console.log('=== END GET DAILY SUMMARY DEBUG ===');
  
  const summary = {
    date,
    mealCount: meals.length,
    meals: meals.map(m => ({
      id: m.id,
      mealType: m.mealType,
      locationName: m.locationName,
      itemCount: m.items?.length || 0,
      totals: m.totals,
    })),
    dailyTotals,
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
