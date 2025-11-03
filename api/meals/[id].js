// Vercel serverless function for /api/meals/[id] (handles GET, PUT, DELETE)
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Get meal ID from query params
    const { id } = req.query;
    if (!id) {
      return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Meal ID is required'));
    }

    const docRef = getDb()
      .collection(USERS_COLLECTION)
      .doc(userId)
      .collection(MEALS_SUBCOLLECTION)
      .doc(id);

    // Handle GET request - Get single meal log
    if (req.method === 'GET') {
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Meal log not found'));
      }

      const data = doc.data();

      return res.status(200).json({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      });
    }

    // Handle PUT request - Update meal log
    if (req.method === 'PUT') {
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Meal log not found'));
      }

      const updates = req.body;

      // Don't allow updating userId, userEmail, or createdAt
      delete updates.userId;
      delete updates.userEmail;
      delete updates.createdAt;

      // Recalculate totals if items changed
      if (updates.items) {
        updates.totals = calculateTotals(updates.items);
      }

      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await docRef.update(updates);

      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();

      return res.status(200).json({
        message: 'Meal log updated successfully',
        meal: {
          id: updatedDoc.id,
          ...data,
          timestamp: data.timestamp?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        },
      });
    }

    // Handle DELETE request - Delete meal log
    if (req.method === 'DELETE') {
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Meal log not found'));
      }

      await docRef.delete();

      return res.status(200).json({
        message: 'Meal log deleted successfully',
        id,
      });
    }

    // Method not allowed
    return res.status(405).json(createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));

  } catch (error) {
    console.error('Error with meal log:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to process meal log request.'));
  }
};

