const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// GET /home endpoint
app.get('/home', (req, res) => {
  res.json({
    title: 'HUDS Nutrition Analyzer',
    welcomeMessage: 'Welcome to the HUDS Nutrition Analyzer!',
    description: 'Track your dining hall consumption, create diet goals, and monitor your nutritional intake.',
    features: [
      'View HUDS menu nutritional facts',
      'Analyze plate photos for nutritional content',
      'Create and track personalized diet goals',
      'Monitor your progress over time'
    ]
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

