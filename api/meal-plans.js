/**
 * Serverless function for meal plan endpoints
 * Mirrors the Express routes in backend/src/routes/mealPlanRoutes.js
 */

const admin = require('firebase-admin');
const { initializeFirebase } = require('../backend/src/config/firebase');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
  try {
    initializeFirebase();
  } catch (error) {
    console.error('Error initializing Firebase via config:', error);
    // If initializeFirebase fails, try direct initialization
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase initialized directly');
      } catch (initError) {
        console.error('Error initializing Firebase directly:', initError);
        throw initError;
      }
    }
  }
}

// Load service after Firebase is initialized
const mealPlanService = require('../backend/src/services/mealPlanService');

// Extract user from JWT token
const extractUserFromToken = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No authorization token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
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
    const user = await extractUserFromToken(req);
    req.user = user;

    const { method, url } = req;
    const path = url.split('?')[0];
    const pathParts = path.split('/').filter(Boolean);
    const mealPlanId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : null;

    // Route handling
    if (method === 'POST' && pathParts.length === 0) {
      // Create meal plan
      console.log('Creating meal plan for user:', user.uid);
      console.log('Request body:', JSON.stringify(req.body));
      const mealPlan = await mealPlanService.createMealPlan(user.uid, req.body);
      res.status(201).json(mealPlan);
    } else if (method === 'GET' && pathParts.length === 0) {
      // Get meal plans for date range
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
      }
      const mealPlans = await mealPlanService.getMealPlans(user.uid, startDate, endDate);
      res.json({ mealPlans });
    } else if (method === 'GET' && mealPlanId) {
      // Get single meal plan
      const mealPlan = await mealPlanService.getMealPlanById(mealPlanId);
      res.json(mealPlan);
    } else if (method === 'PUT' && mealPlanId) {
      // Update meal plan
      const mealPlan = await mealPlanService.updateMealPlan(mealPlanId, user.uid, req.body);
      res.json(mealPlan);
    } else if (method === 'DELETE' && mealPlanId) {
      // Delete meal plan
      await mealPlanService.deleteMealPlan(mealPlanId, user.uid);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  } catch (error) {
    console.error('Error in meal-plans API:', error);
    console.error('Error stack:', error.stack);
    const statusCode = error.message.includes('Unauthorized') ? 403 :
                      error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

