/**
 * Service for nutrition progress tracking
 */

/**
 * Get today's nutrition progress
 */
export const getTodayProgress = async (accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch('/api/nutrition-plan/progress/today', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch nutrition progress');
  }

  return response.json();
};

