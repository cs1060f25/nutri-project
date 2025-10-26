const express = require('express');
const cors = require('cors');
const { homeData } = require('./data');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// GET /home endpoint
app.get('/home', (req, res) => {
  res.json(homeData);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Only start server if not in Vercel/serverless environment
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;

