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
    let errorMessage = `HTTP error! status: ${response.status}`;
    // Clone the response so we can read it multiple times if needed
    const responseClone = response.clone();
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      // Include details if available (for debugging)
      if (errorData.details && process.env.NODE_ENV === 'development') {
        console.error('Error details:', errorData.details);
      }
    } catch (jsonError) {
      // If response is not JSON, try to get text from the clone
      try {
        const text = await responseClone.text();
        if (text) {
          // Try to parse as JSON if it looks like JSON
          try {
            const parsed = JSON.parse(text);
            errorMessage = parsed.error || parsed.message || errorMessage;
          } catch {
            // If not JSON, use the text directly (but limit length)
            errorMessage = text.length > 200 ? text.substring(0, 200) + '...' : text;
          }
        }
      } catch (textError) {
        // If all else fails, use status-based message
        console.error('Failed to parse error response:', textError);
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Please log in again';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden: You do not have permission to perform this action';
        } else if (response.status === 500) {
          errorMessage = 'Internal server error: Please try again later';
        }
      }
    }
    throw new Error(errorMessage);
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

