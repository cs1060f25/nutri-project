// This is just a thin wrapper that imports your backend Express app
// Vercel requires functions in the /api directory
const app = require('../backend/server');

module.exports = app;

