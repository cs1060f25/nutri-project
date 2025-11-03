const express = require('express');
const router = express.Router();
const {
  createNutritionPlan,
  getActivePlan,
  updateNutritionPlan,
  getPlanById,
  getPlanHistory,
  deletePlan,
} = require('../controllers/nutritionPlanController');
const { getTodayProgress } = require('../controllers/nutritionProgressController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Create a new nutrition plan
router.post('/', createNutritionPlan);

// Get active nutrition plan
router.get('/', getActivePlan);

// Get today's nutrition progress (consolidated route)
router.get('/progress/today', getTodayProgress);

// Get plan history
router.get('/history', getPlanHistory);

// Get specific plan by ID
router.get('/:planId', getPlanById);

// Update a nutrition plan
router.put('/:planId', updateNutritionPlan);

// Delete a nutrition plan
router.delete('/:planId', deletePlan);

module.exports = router;

