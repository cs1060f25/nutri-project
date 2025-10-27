/**
 * Service for interacting with the HUDS API through our backend
 */

const API_BASE = '/api/huds';

/**
 * Make a request to the backend HUDS API proxy
 */
const hudsRequest = async (endpoint, params = {}) => {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key]) {
      url.searchParams.append(key, params[key]);
    }
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HUDS API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Get all dining locations
 */
export const getLocations = async () => {
  return hudsRequest('/locations');
};

/**
 * Get today's menu organized by location and meal
 */
export const getTodaysMenu = async (locationId = null) => {
  const params = {};
  if (locationId) {
    params.locationId = locationId;
  }
  return hudsRequest('/menu/today', params);
};

/**
 * Get recipes (menu items) for a specific date and/or location
 */
export const getRecipes = async (date = null, locationId = null) => {
  const params = {};
  if (date) {
    params.date = date;
  }
  if (locationId) {
    params.locationId = locationId;
  }
  return hudsRequest('/recipes', params);
};

/**
 * Get a single recipe by ID
 */
export const getRecipeById = async (id) => {
  return hudsRequest(`/recipes/${id}`);
};

