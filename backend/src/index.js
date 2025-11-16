const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const hudsRoutes = require('./routes/hudsRoutes');
const mealLogRoutes = require('./routes/mealLogRoutes');
const profileRoutes = require('./routes/profileRoutes');
const nutritionPlanRoutes = require('./routes/nutritionPlanRoutes');
const nutritionProgressRoutes = require('./routes/nutritionProgressRoutes');
const mealSuggestionRoutes = require('./routes/mealSuggestionRoutes');
const socialRoutes = require('./routes/socialRoutes');
const mealPlanRoutes = require('./routes/mealPlanRoutes');
const { homeData } = require('../data');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for large menu item arrays
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize Firebase
try {
  initializeFirebase();
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nutri-auth-backend',
  });
});

// Home endpoint
app.get('/home', (req, res) => {
  res.status(200).json(homeData);
});

// Auth routes
app.use('/auth', authRoutes);

// HUDS API routes
app.use('/api/huds', hudsRoutes);

// Meal log routes
app.use('/api/meals', mealLogRoutes);

// User profile routes
app.use('/api/profile', profileRoutes);

// Nutrition plan routes
app.use('/api/nutrition-plan', nutritionPlanRoutes);

// Nutrition progress routes
app.use('/api/nutrition-progress', nutritionProgressRoutes);

// Meal suggestion routes
app.use('/api/meal-suggestion', mealSuggestionRoutes);

// Social routes (friends and posts)
app.use('/api/social', socialRoutes);

// Meal plan routes
app.use('/api/meal-plans', mealPlanRoutes);

// Home endpoint - returns app data
app.get('/home', (req, res) => {
  const homeData = {
    title: 'HUDS Nutrition Analyzer',
    welcomeMessage: 'Welcome to the HUDS Nutrition Analyzer!',
    description: 'Track your dining hall consumption, create diet goals, and monitor your nutritional intake.',
    features: [
      'View HUDS menu nutritional facts',
      'Analyze plate photos for nutritional content',
      'Create and track personalized diet goals',
      'Monitor your progress over time'
    ]
  };
  res.status(200).json(homeData);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested endpoint does not exist.',
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An internal server error occurred.',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 Home: http://localhost:${PORT}/home`);
  console.log(`🔐 Auth endpoints available at: http://localhost:${PORT}/auth`);
  console.log(`🍽️  HUDS API endpoints available at: http://localhost:${PORT}/api/huds`);
  console.log(`📝  Meal logs endpoints available at: http://localhost:${PORT}/api/meals`);
  console.log('\nAvailable endpoints:');
  console.log('  GET    /home');
  console.log('  POST   /auth/register');
  console.log('  POST   /auth/login');
  console.log('  POST   /auth/refresh');
  console.log('  POST   /auth/logout');
  console.log('  GET    /auth/me');
  console.log('  GET    /api/huds/locations');
  console.log('  GET    /api/huds/events');
  console.log('  GET    /api/huds/menu/today');
  console.log('  GET    /api/huds/menu/date');
  console.log('  GET    /api/huds/recipes');
  console.log('  GET    /api/huds/recipes/:id');
  console.log('  POST   /api/meals');
  console.log('  GET    /api/meals');
  console.log('  GET    /api/meals/:id');
  console.log('  PUT    /api/meals/:id');
  console.log('  DELETE /api/meals/:id');
  console.log('  GET    /api/meals/summary/:date');
  console.log('  GET    /api/profile');
  console.log('  PUT    /api/profile');
  console.log('  POST   /api/nutrition-plan');
  console.log('  GET    /api/nutrition-plan');
  console.log('  GET    /api/nutrition-plan/history');
  console.log('  GET    /api/nutrition-plan/:planId');
  console.log('  PUT    /api/nutrition-plan/:planId');
  console.log('  DELETE /api/nutrition-plan/:planId');
  console.log('  POST   /api/meal-suggestion');
  console.log('');
});

module.exports = app;
