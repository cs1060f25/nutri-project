/**
 * Frontend service for nutrition plan API calls
 */

// In production (Vercel), use relative URLs. In development, use localhost.
const API_BASE = process.env.NODE_ENV === 'production' 
  ? '' 
  : (process.env.REACT_APP_API_URL || 'http://localhost:3000');

/**
 * Get the auth token from storage
 */
const getAuthToken = () => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

/**
 * Create a new nutrition plan
 */
export const createNutritionPlan = async (planData) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(planData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create nutrition plan');
  }

  return response.json();
};

/**
 * Get the active nutrition plan
 */
export const getActiveNutritionPlan = async () => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    // No active plan found - this is not an error
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch nutrition plan');
  }

  const data = await response.json();
  return data.plan;
};

/**
 * Update an existing nutrition plan
 */
export const updateNutritionPlan = async (planId, planData) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(planData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update nutrition plan');
  }

  return response.json();
};

/**
 * Get a specific nutrition plan by ID
 */
export const getNutritionPlanById = async (planId) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch nutrition plan');
  }

  const data = await response.json();
  return data.plan;
};

/**
 * Get nutrition plan history
 */
export const getNutritionPlanHistory = async (limit = 10) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan/history?limit=${limit}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch nutrition plan history');
  }

  const data = await response.json();
  return data.plans;
};

/**
 * Delete a nutrition plan
 */
export const deleteNutritionPlan = async (planId) => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete nutrition plan');
  }

  return response.json();
};

