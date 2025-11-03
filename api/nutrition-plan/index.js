// Vercel serverless function for /api/nutrition-plan (handles GET, POST, and progress)
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
const USERS_COLLECTION = 'users';
const NUTRITION_PLANS_SUBCOLLECTION = 'nutritionPlans';
const MEALS_SUBCOLLECTION = 'meals';

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
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

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Parse the path - Vercel may or may not include the /api/nutrition-plan prefix
    let path = req.url.split('?')[0]; // Remove query params
    path = path.replace('/api/nutrition-plan', ''); // Remove prefix if present
    if (!path || path === '/') path = ''; // Normalize empty path

    console.log('🔍 Nutrition plan route - method:', req.method, 'req.url:', req.url, 'parsed path:', JSON.stringify(path));

    // Route: GET /api/nutrition-plan/progress/today (nutrition progress tracking)
    if (req.method === 'GET' && (path === '/progress/today' || path.includes('progress/today'))) {
      console.log('✅ Matched progress route, fetching active plan for userId:', userId);
      const today = new Date().toISOString().split('T')[0];

      // Get active nutrition plan
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const planSnapshot = await plansRef
        .where('isActive', '==', true)
        .limit(1)
        .get();

      console.log('📊 Plan query result - empty?', planSnapshot.empty, 'size:', planSnapshot.size);

      if (planSnapshot.empty) {
        console.log('❌ No active plan found for userId:', userId);
        return res.status(200).json({
          hasActivePlan: false,
          message: 'No active nutrition plan found',
        });
      }

      const planDoc = planSnapshot.docs[0];
      const planData = planDoc.data();
      console.log('✅ Found active plan:', planDoc.id, 'preset:', planData.preset);

      // Get today's meals
      const mealsSnapshot = await getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION)
        .where('mealDate', '==', today)
        .get();

      const meals = [];
      mealsSnapshot.forEach(doc => {
        meals.push(doc.data());
      });

      // Helper to parse nutrient values
      const parseNutrient = (value) => {
        if (!value) return 0;
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // Calculate consumed totals from all meals today
      const consumed = {
        calories: 0,
        protein: 0,
        totalFat: 0,
        saturatedFat: 0,
        totalCarbs: 0,
        fiber: 0,
        sugars: 0,
        sodium: 0,
      };

      meals.forEach(meal => {
        if (meal.totals) {
          consumed.calories += parseNutrient(meal.totals.calories);
          consumed.protein += parseNutrient(meal.totals.protein);
          consumed.totalFat += parseNutrient(meal.totals.totalFat);
          consumed.saturatedFat += parseNutrient(meal.totals.saturatedFat);
          consumed.totalCarbs += parseNutrient(meal.totals.totalCarb);
          consumed.fiber += parseNutrient(meal.totals.dietaryFiber);
          consumed.sugars += parseNutrient(meal.totals.sugars);
          consumed.sodium += parseNutrient(meal.totals.sodium);
        }
      });

      // Calculate progress for each metric
      const metrics = planData.metrics || {};
      const progress = {};

      Object.entries(metrics).forEach(([key, metric]) => {
        if (metric.enabled) {
          const target = parseFloat(metric.target);
          const current = consumed[key] || 0;
          const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
          const remaining = Math.max(0, target - current);

          let status = 'below';
          if (percentage >= 100) status = 'met';
          else if (percentage >= 80) status = 'close';

          progress[key] = {
            current: Math.round(current * 10) / 10,
            target,
            unit: metric.unit,
            percentage,
            remaining: Math.round(remaining * 10) / 10,
            status,
          };
        }
      });

      return res.status(200).json({
        hasActivePlan: true,
        planName: planData.presetName || 'Custom Plan',
        mealCount: meals.length,
        progress,
      });
    }

    // Handle GET request - Get active nutrition plan
    if (req.method === 'GET' && (path === '' || path === '/')) {
      console.log('✅ Matched base GET route (active plan), fetching for userId:', userId);
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const snapshot = await plansRef
        .where('isActive', '==', true)
        .limit(1)
        .get();

      console.log('📊 Base GET - Plan query result - empty?', snapshot.empty, 'size:', snapshot.size);

      if (snapshot.empty) {
        console.log('❌ No active plan found (base GET) for userId:', userId);
        return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'No active nutrition plan found.'));
      }

      const doc = snapshot.docs[0];
      const plan = {
        id: doc.id,
        ...doc.data(),
      };

      console.log('✅ Returning active plan (base GET):', doc.id);
      return res.status(200).json({ plan });
    }

    // Route: GET /api/nutrition-plan/history (get plan history)
    if (req.method === 'GET' && path === '/history') {
      const limit = parseInt(req.query?.limit) || 10;

      const snapshot = await getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({ plans });
    }

    // Route: GET /api/nutrition-plan/:planId (get specific plan by ID)
    if (req.method === 'GET' && path && path !== '' && path !== '/' && path !== '/progress/today' && path !== '/history') {
      const planId = path.substring(1); // Remove leading /
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .doc(planId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'Nutrition plan not found.'));
      }

      const plan = {
        id: doc.id,
        ...doc.data(),
      };

      return res.status(200).json({ plan });
    }

    // Route: PUT /api/nutrition-plan/:planId (update plan)
    if (req.method === 'PUT' && path && path !== '' && path !== '/') {
      const planId = path.substring(1); // Remove leading /
      const planData = req.body;

      if (!planData || Object.keys(planData).length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
      }

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .doc(planId);

      const payload = {
        preset: planData.preset || null,
        presetName: planData.presetName || null,
        metrics: planData.metrics || {},
        updatedAt: timestamp,
      };

      await docRef.set(payload, { merge: true });

      const updatedDoc = await docRef.get();
      const updatedPlan = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };

      return res.status(200).json({
        message: 'Nutrition plan updated successfully',
        plan: updatedPlan,
      });
    }

    // Route: DELETE /api/nutrition-plan/:planId (delete plan)
    if (req.method === 'DELETE' && path && path !== '' && path !== '/') {
      const planId = path.substring(1); // Remove leading /
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .doc(planId);

      await docRef.delete();

      return res.status(200).json({
        message: 'Nutrition plan deleted successfully',
      });
    }

    // Handle POST request - Create new nutrition plan
    if (req.method === 'POST' && (path === '' || path === '/')) {
      const planData = req.body;
      if (!planData || Object.keys(planData).length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
      }

      // Save to Firestore
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const payload = {
        preset: planData.preset || null,
        presetName: planData.presetName || null,
        metrics: planData.metrics || {},
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Deactivate existing active plans
      const activePlans = await plansRef.where('isActive', '==', true).get();
      const batch = getDb().batch();
      activePlans.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });

      // Create new plan
      const docRef = plansRef.doc();
      batch.set(docRef, payload);
      await batch.commit();

      const savedDoc = await docRef.get();
      const savedPlan = {
        id: savedDoc.id,
        ...savedDoc.data(),
      };

      return res.status(201).json({
        message: 'Nutrition plan created successfully',
        plan: savedPlan,
      });
    }

    // Method not allowed
    return res.status(405).json(createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));

  } catch (error) {
    console.error('Error with nutrition plan:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to process nutrition plan request.'));
  }
};

