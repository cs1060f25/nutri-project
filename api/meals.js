// Consolidated Vercel serverless function for ALL meal endpoints
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    const path = req.url.replace('/api/meals', '');

    // Route: GET /api/meals/summary/:date
    if (req.method === 'GET' && path.startsWith('/summary/')) {
      const date = path.split('/summary/')[1].split('?')[0];
      
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
        dailyTotals: calculateTotals(meals.flatMap(m => m.items)),
      };

      return res.status(200).json(summary);
    }

    // Route: GET /api/meals/:id (specific meal by ID)
    if (req.method === 'GET' && path.match(/^\/[^/]+$/) && !path.includes('?')) {
      const id = path.substring(1);
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION)
        .doc(id);
      
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

    // Route: PUT /api/meals/:id (update meal)
    if (req.method === 'PUT' && path.match(/^\/[^/]+$/)) {
      const id = path.substring(1);
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION)
        .doc(id);
      
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Meal log not found'));
      }

      const updates = req.body;
      delete updates.userId;
      delete updates.userEmail;
      delete updates.createdAt;

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

    // Route: DELETE /api/meals/:id (delete meal)
    if (req.method === 'DELETE' && path.match(/^\/[^/]+$/)) {
      const id = path.substring(1);
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION)
        .doc(id);
      
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

    // Route: GET /api/meals (list meals with filters)
    if (req.method === 'GET' && (path === '' || path === '/' || path.startsWith('?'))) {
      const { startDate, endDate, mealType, limit } = req.query;
      
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
      if (mealType) {
        query = query.where('mealType', '==', mealType);
      }

      query = query.orderBy('timestamp', 'desc');

      const limitNum = limit ? parseInt(limit, 10) : 50;
      query = query.limit(limitNum);

      const snapshot = await query.get();
      
      const meals = [];
      snapshot.forEach(doc => {
        meals.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate(),
        });
      });

      return res.status(200).json({
        meals,
        count: meals.length,
      });
    }

    // Route: POST /api/meals (create new meal)
    if (req.method === 'POST') {
      const { mealDate, mealType, mealName, timestamp, locationId, locationName, items, imageUrl } = req.body;

      if (!mealDate || !mealType || !locationId || !items || items.length === 0) {
        return res.status(400).json(
          createErrorResponse('INVALID_REQUEST', 'Missing required fields: mealDate, mealType, locationId, items')
        );
      }

      const totals = calculateTotals(items);
      
      const mealLog = {
        userId,
        userEmail,
        mealDate,
        mealType,
        mealName: mealName || mealType,
        locationId,
        locationName,
        items,
        totals,
        timestamp: timestamp ? admin.firestore.Timestamp.fromDate(new Date(timestamp)) : admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Add imageUrl if provided
      if (imageUrl) {
        mealLog.imageUrl = imageUrl;
      }

      const mealsRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION);
      
      const docRef = await mealsRef.add(mealLog);
      
      const savedDoc = await docRef.get();
      const savedMeal = {
        id: savedDoc.id,
        ...savedDoc.data(),
        timestamp: savedDoc.data().timestamp?.toDate(),
        createdAt: savedDoc.data().createdAt?.toDate(),
        updatedAt: savedDoc.data().updatedAt?.toDate(),
      };

      return res.status(201).json({
        message: 'Meal logged successfully',
        meal: savedMeal,
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

