const express = require('express');
const router = express.Router();
const hudsController = require('../controllers/hudsController');

// Get all dining locations
router.get('/locations', hudsController.getLocations);

// Get today's menu
router.get('/menu/today', hudsController.getTodaysMenu);

// Get recipes
router.get('/recipes', hudsController.getRecipes);

// Get recipe by ID
router.get('/recipes/:id', hudsController.getRecipeById);

module.exports = router;

