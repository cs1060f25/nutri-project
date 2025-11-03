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
 * Fetch with automatic token refresh on 401
 */
const fetchWithAuth = async (url, options = {}) => {
  let token = getAuthToken();
  
  const makeRequest = async (authToken) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`,
      },
    });
  };

  let response = await makeRequest(token);

  // If 401, try to refresh token and retry once
  if (response.status === 401) {
    try {
      const refreshToken = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const refreshResponse = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await refreshResponse.json();
      
      // Update tokens in storage
      const storage = localStorage.getItem('refreshToken') ? localStorage : sessionStorage;
      storage.setItem('accessToken', data.accessToken);
      storage.setItem('refreshToken', data.refreshToken);

      // Retry the original request with new token
      response = await makeRequest(data.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens and redirect to login
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      window.location.href = '/auth';
      throw error;
    }
  }

  return response;
};

/**
 * Create a new nutrition plan
 */
export const createNutritionPlan = async (planData) => {
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan`, {
    method: 'GET',
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
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
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
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'GET',
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
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan/history?limit=${limit}`, {
    method: 'GET',
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
  const response = await fetchWithAuth(`${API_BASE}/api/nutrition-plan/${planId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete nutrition plan');
  }

  return response.json();
};

