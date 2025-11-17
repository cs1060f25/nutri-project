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
