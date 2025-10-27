const express = require('express');
const router = express.Router();
const mealLogController = require('../controllers/mealLogController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Get daily summary (must be before /:id to avoid conflict)
router.get('/summary/:date', mealLogController.getDailySummary);

// CRUD operations
router.post('/', mealLogController.createMealLog);
router.get('/', mealLogController.getMealLogs);
router.get('/:id', mealLogController.getMealLogById);
router.put('/:id', mealLogController.updateMealLog);
router.delete('/:id', mealLogController.deleteMealLog);

module.exports = router;

