/**
 * Service for meal log API
 */

import { fetchWithErrorHandling } from '../utils/errorHandler';

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

  return fetchWithErrorHandling(
    '/api/meals',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(mealData),
    },
    'save your meal log'
  );
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

  return fetchWithErrorHandling(
    url,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
    'load your meal logs'
  );
};

/**
 * Get daily summary
 */
export const getDailySummary = async (accessToken, date) => {
  return fetchWithErrorHandling(
    `/api/meals/summary/${date}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
    'load your daily summary'
  );
};

/**
 * Update a meal log
 */
export const updateMealLog = async (mealId, updates, accessToken) => {
  return fetchWithErrorHandling(
    `/api/meals/${mealId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(updates),
    },
    'update your meal log'
  );
};

/**
 * Delete a meal log
 */
export const deleteMealLog = async (mealId, accessToken) => {
  return fetchWithErrorHandling(
    `/api/meals/${mealId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    },
    'delete your meal log'
  );
};

