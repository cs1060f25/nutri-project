// Vercel serverless function for GET /api/nutrition-plan
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json(createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Get active nutrition plan
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

  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to fetch nutrition plan.'));
  }
};

