const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Auth routes
app.use('/auth', authRoutes);

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
  console.log(`🔐 Auth endpoints available at: http://localhost:${PORT}/auth`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /auth/register');
  console.log('  POST   /auth/login');
  console.log('  POST   /auth/refresh');
  console.log('  POST   /auth/logout');
  console.log('  GET    /auth/me');
  console.log('');
});

module.exports = app;

