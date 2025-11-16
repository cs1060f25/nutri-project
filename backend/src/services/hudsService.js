/**
 * Service for interacting with the Harvard University Dining Services (HUDS) API
 */

const axios = require('axios');

const BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
const API_KEY = process.env.HUDS_API_KEY;

/**
 * Format date to MM/DD/YYYY format expected by HUDS API
 */
const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Make a request to the HUDS API
 */
const hudsRequest = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      headers: {
        'X-Api-Key': API_KEY,
        'Accept': 'application/json',
      },
      params,
    });
    return response.data;
  } catch (error) {
    console.error('HUDS API error:', error.message);
    throw error;
  }
};

/**
 * Get all dining locations
 */
const getLocations = async () => {
  return hudsRequest('/locations');
};

/**
 * Get events (meals) for a specific date and/or location
 */
const getEvents = async (date = null, locationId = null) => {
  const params = {};
  if (date) {
    // Handle both Date objects and date strings (YYYY-MM-DD format)
    const dateObj = date instanceof Date ? date : new Date(date);
    params.date = formatDate(dateObj);
  }
  if (locationId) {
    params.locationId = locationId;
  }
  return hudsRequest('/events', params);
};

/**
 * Get recipes (menu items) for a specific date and/or location
 */
const getRecipes = async (date = null, locationId = null) => {
  const params = {};
  if (date) {
    // Handle both Date objects and date strings (YYYY-MM-DD format)
    const dateObj = date instanceof Date ? date : new Date(date);
    params.date = formatDate(dateObj);
  }
  if (locationId) {
    params.locationId = locationId;
  }
  return hudsRequest('/recipes', params);
};

/**
 * Get a single recipe by ID
 */
const getRecipeById = async (id) => {
  return hudsRequest(`/recipes/${id}`);
};

/**
 * Get menu organized by location and meal for a specific date
 */
const getMenuByDate = async (date, locationId = null) => {
  const [recipes, events] = await Promise.all([
    getRecipes(date, locationId),
    getEvents(date, locationId),
  ]);

  // Organize data by location, meal, and menu category
  const menuByLocation = {};

  recipes.forEach(recipe => {
    const locNum = recipe.Location_Number;
    const locName = recipe.Location_Name;
    const mealNum = recipe.Meal_Number;
    const mealName = recipe.Meal_Name;
    const categoryNum = recipe.Menu_Category_Number;
    const categoryName = recipe.Menu_Category_Name;

    if (!menuByLocation[locNum]) {
      menuByLocation[locNum] = {
        locationNumber: locNum,
        locationName: locName,
        meals: {},
      };
    }

    if (!menuByLocation[locNum].meals[mealNum]) {
      menuByLocation[locNum].meals[mealNum] = {
        mealNumber: mealNum,
        mealName: mealName,
        categories: {},
      };
    }

    if (!menuByLocation[locNum].meals[mealNum].categories[categoryNum]) {
      menuByLocation[locNum].meals[mealNum].categories[categoryNum] = {
        categoryNumber: categoryNum,
        categoryName: categoryName,
        recipes: [],
      };
    }

    menuByLocation[locNum].meals[mealNum].categories[categoryNum].recipes.push(recipe);
  });

  return Object.values(menuByLocation);
};

/**
 * Get today's menu organized by location and meal
 */
const getTodaysMenu = async (locationId = null) => {
  const today = new Date();
  return getMenuByDate(today, locationId);
};

module.exports = {
  getLocations,
  getEvents,
  getRecipes,
  getRecipeById,
  getTodaysMenu,
  getMenuByDate,
  formatDate, // Export for use in controllers
};

