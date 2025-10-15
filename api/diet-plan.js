// Serverless function for /diet-plan endpoint
// Imports shared data from backend
const { dietPlans } = require('../backend/data');

module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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
  } else if (req.method === 'PUT') {
    try {
      // Extract ID from URL path (e.g., /diet-plan/123456789)
      const urlParts = req.url.split('/');
      const id = urlParts[urlParts.length - 1].split('?')[0];
      
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
      
      res.status(200).json({
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
  } else if (req.method === 'GET') {
    res.status(200).json({
      success: true,
      dietPlans
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

