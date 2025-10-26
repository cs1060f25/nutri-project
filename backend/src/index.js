const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeFirebase } = require('./config/firebase');
const authRoutes = require('./routes/authRoutes');
const { homeData } = require('../data');

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

// Home endpoint
app.get('/home', (req, res) => {
  res.status(200).json(homeData);
});

// Auth routes
app.use('/auth', authRoutes);

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
  console.log('\nAvailable endpoints:');
  console.log('  GET    /home');
  console.log('  POST   /auth/register');
  console.log('  POST   /auth/login');
  console.log('  POST   /auth/refresh');
  console.log('  POST   /auth/logout');
  console.log('  GET    /auth/me');
  console.log('');
});

module.exports = app;

