const express = require('express');
const cors = require('cors');
const { homeData, dietPlans } = require('./data');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// GET /home endpoint
app.get('/home', (req, res) => {
  res.json(homeData);
});

// POST /diet-plan - Save a new diet plan
app.post('/diet-plan', (req, res) => {
  try {
    const dietPlan = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    dietPlans.push(dietPlan);
    
    res.status(201).json({
      success: true,
      message: 'Diet plan saved successfully',
      dietPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to save diet plan',
      error: error.message
    });
  }
});

// GET /diet-plan - Get all diet plans
app.get('/diet-plan', (req, res) => {
  res.json({
    success: true,
    dietPlans
  });
});

// PUT /diet-plan/:id - Update an existing diet plan
app.put('/diet-plan/:id', (req, res) => {
  try {
    const { id } = req.params;
    const planIndex = dietPlans.findIndex(plan => plan.id === id);
    
    if (planIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Diet plan not found'
      });
    }
    
    const updatedPlan = {
      ...dietPlans[planIndex],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    
    dietPlans[planIndex] = updatedPlan;
    
    res.json({
      success: true,
      message: 'Diet plan updated successfully',
      dietPlan: updatedPlan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update diet plan',
      error: error.message
    });
  }
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

