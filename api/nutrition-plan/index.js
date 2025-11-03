// Vercel serverless function for /api/nutrition-plan (handles both GET and POST)
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Handle GET request - Get active nutrition plan
    if (req.method === 'GET') {
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const snapshot = await plansRef
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'No active nutrition plan found.'));
      }

      const doc = snapshot.docs[0];
      const plan = {
        id: doc.id,
        ...doc.data(),
      };

      return res.status(200).json({ plan });
    }

    // Handle POST request - Create new nutrition plan
    if (req.method === 'POST') {
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
        customMetrics: planData.customMetrics || [],
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

