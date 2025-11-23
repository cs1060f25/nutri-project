/**
 * Routes for meal plan endpoints
 */

const express = require('express');
const router = express.Router();
const mealPlanController = require('../controllers/mealPlanController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Create a new meal plan
router.post('/', mealPlanController.createMealPlan);

// Get meal plans for a date range
router.get('/', mealPlanController.getMealPlans);

// Get a single meal plan by ID
router.get('/:id', mealPlanController.getMealPlanById);

// Update a meal plan
router.put('/:id', mealPlanController.updateMealPlan);

// Delete a meal plan
router.delete('/:id', mealPlanController.deleteMealPlan);

module.exports = router;

