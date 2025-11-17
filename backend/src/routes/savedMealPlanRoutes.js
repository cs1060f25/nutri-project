/**
 * Routes for saved meal plan endpoints
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const savedMealPlanController = require('../controllers/savedMealPlanController');

// All routes require authentication
router.use(verifyToken);

// Create a new saved meal plan
router.post('/', savedMealPlanController.createSavedMealPlan);

// Get all saved meal plans for the user
router.get('/', savedMealPlanController.getSavedMealPlans);

// Get a single saved meal plan
router.get('/:id', savedMealPlanController.getSavedMealPlanById);

// Update a saved meal plan
router.put('/:id', savedMealPlanController.updateSavedMealPlan);

// Increment usage count
router.post('/:id/use', savedMealPlanController.useSavedMealPlan);

// Delete a saved meal plan
router.delete('/:id', savedMealPlanController.deleteSavedMealPlan);

module.exports = router;

