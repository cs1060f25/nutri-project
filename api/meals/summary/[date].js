// Vercel serverless function for /api/meals/summary/[date] (GET daily summary)
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

// Calculate total nutritional values from items
const calculateTotals = (items) => {
  const totals = {
    calories: 0,
    totalFat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    totalCarb: 0,
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
    totals.totalFat += parseNutrient(item.totalFat) * qty;
    totals.saturatedFat += parseNutrient(item.saturatedFat) * qty;
    totals.transFat += parseNutrient(item.transFat) * qty;
    totals.cholesterol += parseNutrient(item.cholesterol) * qty;
    totals.sodium += parseNutrient(item.sodium) * qty;
    totals.totalCarb += parseNutrient(item.totalCarb) * qty;
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
    totalCarb: `${totals.totalCarb.toFixed(1)}g`,
    dietaryFiber: `${totals.dietaryFiber.toFixed(1)}g`,
    sugars: `${totals.sugars.toFixed(1)}g`,
    protein: `${totals.protein.toFixed(1)}g`,
  };
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

    // Get date from query params
    const { date } = req.query;
    if (!date) {
      return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Date parameter is required'));
    }

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
    const summary = {
      date,
      mealCount: meals.length,
      meals: meals.map(m => ({
        id: m.id,
        mealType: m.mealType,
        locationName: m.locationName,
        itemCount: m.items.length,
        totals: m.totals,
      })),
      dailyTotals: calculateTotals(
        meals.flatMap(m => m.items)
      ),
    };

    return res.status(200).json(summary);

  } catch (error) {
    console.error('Error fetching daily summary:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to fetch daily summary.'));
  }
};

