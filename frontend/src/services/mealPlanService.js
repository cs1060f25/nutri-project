/**
 * Service for interacting with meal plan API endpoints
 */

const API_BASE = '/api/meal-plans';

/**
 * Make an authenticated request to the meal plan API
 */
const mealPlanRequest = async (endpoint, options = {}, accessToken) => {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Create a new meal plan
 */
export const createMealPlan = async (mealPlanData, accessToken) => {
  return mealPlanRequest('', {
    method: 'POST',
    body: JSON.stringify(mealPlanData),
  }, accessToken);
};

/**
 * Get meal plans for a date range
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export const getMealPlans = async (startDate, endDate, accessToken) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  return mealPlanRequest(`?${params.toString()}`, {
    method: 'GET',
  }, accessToken);
};

/**
 * Get a single meal plan by ID
 */
export const getMealPlanById = async (mealPlanId, accessToken) => {
  return mealPlanRequest(`/${mealPlanId}`, {
    method: 'GET',
  }, accessToken);
};

/**
 * Update a meal plan
 */
export const updateMealPlan = async (mealPlanId, updates, accessToken) => {
  return mealPlanRequest(`/${mealPlanId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }, accessToken);
};

/**
 * Delete a meal plan
 */
export const deleteMealPlan = async (mealPlanId, accessToken) => {
  return mealPlanRequest(`/${mealPlanId}`, {
    method: 'DELETE',
  }, accessToken);
};

