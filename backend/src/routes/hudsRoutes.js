const express = require('express');
const router = express.Router();
const hudsController = require('../controllers/hudsController');

// Get all dining locations
router.get('/locations', hudsController.getLocations);

// Get events (meal types) for a specific date/location
router.get('/events', hudsController.getEvents);

// Get today's menu
router.get('/menu/today', hudsController.getTodaysMenu);

// Get menu for a specific date
router.get('/menu/date', hudsController.getMenuByDate);

// Get recipes
router.get('/recipes', hudsController.getRecipes);

// Get recipe by ID
router.get('/recipes/:id', hudsController.getRecipeById);

module.exports = router;

