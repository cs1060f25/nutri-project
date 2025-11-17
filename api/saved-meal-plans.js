/**
 * Vercel serverless function for saved meal plan endpoints
 * Mirrors the Express routes in backend/src/routes/savedMealPlanRoutes.js
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
const SAVED_MEAL_PLANS_COLLECTION = 'savedMealPlans';

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

  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
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
    // Remove leading /api/saved-meal-plans if present
    const cleanPath = path.replace(/^\/api\/saved-meal-plans/, '').replace(/^\//, '');
    const pathParts = cleanPath.split('/').filter(Boolean);
    const savedPlanId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;
    const isUseEndpoint = pathParts[pathParts.length - 1] === 'use' && pathParts.length > 1;
    const actualSavedPlanId = isUseEndpoint ? pathParts[pathParts.length - 2] : savedPlanId;

    // Route handling
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
  } catch (error) {
    console.error('Error in saved-meal-plans API:', error);
    
    const statusCode = error.message === 'INVALID_TOKEN' ? 401 :
                      error.message.includes('Unauthorized') ? 403 :
                      error.message.includes('not found') ? 404 :
                      error.message.includes('Missing') || error.message.includes('required') || error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error'
    });
  }
};

