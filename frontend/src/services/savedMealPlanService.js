/**
 * Service for saved meal plans (templates)
 */

const API_BASE = '/api/saved-meal-plans';

/**
 * Make an authenticated request
 */
const makeRequest = async (endpoint, options = {}) => {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

/**
 * Create a new saved meal plan
 */
export const createSavedMealPlan = async (savedPlanData, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(API_BASE, {
    method: 'POST',
    headers,
    body: JSON.stringify(savedPlanData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create saved meal plan');
  }

  return response.json();
};

/**
 * Get all saved meal plans for the user
 */
export const getSavedMealPlans = async (accessToken) => {
  return makeRequest('');
};

/**
 * Get a single saved meal plan by ID
 */
export const getSavedMealPlanById = async (id, accessToken) => {
  return makeRequest(`/${id}`);
};

/**
 * Update a saved meal plan
 */
export const updateSavedMealPlan = async (id, updates, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update saved meal plan');
  }

  return response.json();
};

/**
 * Increment usage count
 */
export const incrementSavedMealPlanUsage = async (id, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/${id}/use`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to increment usage count');
  }

  return response.json();
};

/**
 * Delete a saved meal plan
 */
export const deleteSavedMealPlan = async (id, accessToken) => {
  const headers = {};
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete saved meal plan');
  }

  return response.json();
};

