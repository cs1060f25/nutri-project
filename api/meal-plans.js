/**
 * Vercel serverless function for meal plan endpoints
 * Mirrors the Express routes in backend/src/routes/mealPlanRoutes.js
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
const MEAL_PLANS_COLLECTION = 'mealPlans';
const SAVED_MEAL_PLANS_COLLECTION = 'savedMealPlans';
const USERS_COLLECTION = 'users';
const MEALS_SUBCOLLECTION = 'meals';

/**
 * Helper function to normalize item name for comparison
 */
const normalizeItemName = (name) => {
  if (!name) return '';
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
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
      .collection(MEALS_SUBCOLLECTION);
    
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

// Create a new meal plan
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
    const updatedDoc = await db.collection(MEAL_PLANS_COLLECTION).doc(existingPlanId).get();
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
    };
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

// Get meal plans for a user within a date range
const getMealPlans = async (userId, startDate, endDate) => {
  const db = getDb();
  
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
};

// Get a single meal plan by ID
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

// Update a meal plan
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

// Delete a meal plan
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

// ========== SAVED MEAL PLANS (Templates) ==========

// Create a new saved meal plan
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

// Get all saved meal plans for a user
const getSavedMealPlans = async (userId) => {
  const db = getDb();
  
  try {
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

// Get a single saved meal plan by ID
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

  const plan = {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  };

  // Calculate actual usage count
  const actualUsageCount = await calculateActualUsageCount(userId, plan);
  
  return {
    ...plan,
    usageCount: actualUsageCount, // Override stored usageCount with calculated value
  };
};

// Update a saved meal plan
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

// Increment usage count
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

// Delete a saved meal plan
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

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    const { method } = req;
    // Handle both Vercel's url format and standard format
    const url = req.url || req.path || '';
    const path = url.split('?')[0];
    
    // Check if this is a saved-meal-plans request
    const isSavedMealPlans = path.includes('/saved-meal-plans');
    
    if (isSavedMealPlans) {
      // Handle saved meal plans routes
      const cleanPath = path.replace(/^\/api\/saved-meal-plans/, '').replace(/^\//, '');
      const pathParts = cleanPath.split('/').filter(Boolean);
      const savedPlanId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
      const isUseEndpoint = pathParts[pathParts.length - 1] === 'use' && pathParts.length > 1;
      const actualSavedPlanId = isUseEndpoint ? pathParts[pathParts.length - 2] : savedPlanId;

      // Route handling for saved meal plans
      if (method === 'POST' && pathParts.length === 0) {
        // Create saved meal plan
        const savedPlan = await createSavedMealPlan(userId, req.body);
        res.status(201).json({
          message: 'Saved meal plan created successfully',
          savedPlan,
        });
      } else if (method === 'GET' && pathParts.length === 0) {
        // Get all saved meal plans
        const savedPlans = await getSavedMealPlans(userId);
        res.json({
          savedPlans,
          count: savedPlans.length,
        });
      } else if (method === 'GET' && savedPlanId && !isUseEndpoint) {
        // Get single saved meal plan
        const savedPlan = await getSavedMealPlanById(savedPlanId, userId);
        res.json(savedPlan);
      } else if (method === 'PUT' && savedPlanId && !isUseEndpoint) {
        // Update saved meal plan
        const savedPlan = await updateSavedMealPlan(savedPlanId, userId, req.body);
        res.json({
          message: 'Saved meal plan updated successfully',
          savedPlan,
        });
      } else if (method === 'POST' && isUseEndpoint) {
        // Increment usage count
        const savedPlan = await incrementUsageCount(actualSavedPlanId, userId);
        res.json({
          message: 'Usage count incremented',
          savedPlan,
        });
      } else if (method === 'DELETE' && savedPlanId && !isUseEndpoint) {
        // Delete saved meal plan
        await deleteSavedMealPlan(savedPlanId, userId);
        res.json({
          message: 'Saved meal plan deleted successfully',
          id: savedPlanId,
        });
      } else {
        res.status(404).json({ error: 'Endpoint not found' });
      }
      return;
    }
    
    // Handle regular meal plans routes
    // Remove leading /api/meal-plans if present
    const cleanPath = path.replace(/^\/api\/meal-plans/, '').replace(/^\//, '');
    const pathParts = cleanPath.split('/').filter(Boolean);
    const mealPlanId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

    // Route handling
    if (method === 'POST' && pathParts.length === 0) {
      // Create meal plan
      const mealPlan = await createMealPlan(userId, req.body);
      res.status(201).json(mealPlan);
    } else if (method === 'GET' && pathParts.length === 0) {
      // Get meal plans for date range
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
      }
      const mealPlans = await getMealPlans(userId, startDate, endDate);
      res.json({ mealPlans });
    } else if (method === 'GET' && mealPlanId) {
      // Get single meal plan
      const mealPlan = await getMealPlanById(mealPlanId);
      // Verify ownership
      if (mealPlan.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized: You can only access your own meal plans' });
      }
      res.json(mealPlan);
    } else if (method === 'PUT' && mealPlanId) {
      // Update meal plan
      const mealPlan = await updateMealPlan(mealPlanId, userId, req.body);
      res.json(mealPlan);
    } else if (method === 'DELETE' && mealPlanId) {
      // Delete meal plan
      await deleteMealPlan(mealPlanId, userId);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Error in meal-plans API:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    const statusCode = error.message === 'INVALID_TOKEN' ? 401 :
                      error.message.includes('Unauthorized') ? 403 :
                      error.message.includes('not found') ? 404 :
                      error.message.includes('Missing') || error.message.includes('required') ? 400 : 500;
    
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error'
    });
  }
};
