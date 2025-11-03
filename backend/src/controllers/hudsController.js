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
 * Get events (meal types available) for a specific date/location
 */
const getEvents = async (req, res) => {
  try {
    const { date, locationId } = req.query;
    const events = await hudsService.getEvents(date || null, locationId || null);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
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
 * Get menu for a specific date
 */
const getMenuByDate = async (req, res) => {
  try {
    const { date, locationId } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }
    const menu = await hudsService.getMenuByDate(date, locationId || null);
    res.json(menu);
  } catch (error) {
    console.error('Error fetching menu by date:', error);
    res.status(500).json({ error: 'Failed to fetch menu for the specified date' });
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
  getEvents,
  getTodaysMenu,
  getMenuByDate,
  getRecipes,
  getRecipeById,
};

