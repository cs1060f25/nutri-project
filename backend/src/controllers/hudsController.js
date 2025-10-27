const hudsService = require('../services/hudsService');

/**
 * Get all dining locations
 */
const getLocations = async (req, res) => {
  try {
    const locations = await hudsService.getLocations();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch dining locations' });
  }
};

/**
 * Get today's menu
 */
const getTodaysMenu = async (req, res) => {
  try {
    const { locationId } = req.query;
    const menu = await hudsService.getTodaysMenu(locationId || null);
    res.json(menu);
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s menu' });
  }
};

/**
 * Get recipes for a specific date/location
 */
const getRecipes = async (req, res) => {
  try {
    const { date, locationId } = req.query;
    const recipes = await hudsService.getRecipes(date || null, locationId || null);
    res.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
};

/**
 * Get a single recipe by ID
 */
const getRecipeById = async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await hudsService.getRecipeById(id);
    res.json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(404).json({ error: 'Recipe not found' });
  }
};

module.exports = {
  getLocations,
  getTodaysMenu,
  getRecipes,
  getRecipeById,
};

