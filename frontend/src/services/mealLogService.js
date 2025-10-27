/**
 * Service for meal log API
 */

/**
 * Save a new meal log
 */
export const saveMealLog = async (mealData, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch('/api/meals', {
    method: 'POST',
    headers,
    body: JSON.stringify(mealData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save meal log');
  }

  return response.json();
};

/**
 * Get user's meal logs
 */
export const getMealLogs = async (filters = {}, accessToken) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.mealType) params.append('mealType', filters.mealType);
  if (filters.limit) params.append('limit', filters.limit);

  const queryString = params.toString();
  const url = queryString ? `/api/meals?${queryString}` : '/api/meals';

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch meal logs');
  }

  return response.json();
};

/**
 * Get daily summary
 */
export const getDailySummary = async (accessToken, date) => {
  const response = await fetch(`/api/meals/summary/${date}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch daily summary');
  }

  return response.json();
};

/**
 * Update a meal log
 */
export const updateMealLog = async (mealId, updates, accessToken) => {
  const response = await fetch(`/api/meals/${mealId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update meal log');
  }

  return response.json();
};

/**
 * Delete a meal log
 */
export const deleteMealLog = async (mealId, accessToken) => {
  const response = await fetch(`/api/meals/${mealId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete meal log');
  }

  return response.json();
};

