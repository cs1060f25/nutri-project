/**
 * Service for interacting with the leaderboard API
 */

// Use relative URLs for API calls (works in both dev and production)
const API_BASE_URL = '';

/**
 * Make an authenticated API request
 */
const leaderboardRequest = async (endpoint, options = {}) => {
  const accessToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

/**
 * Get leaderboard data with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.classYear - Filter by class year
 * @param {string} filters.residence - Filter by residence/dining hall
 * @param {string} filters.dietaryPattern - Filter by dietary pattern
 * @param {number} limit - Maximum number of results
 */
export const getLeaderboard = async (filters = {}, limit = 100) => {
  const params = new URLSearchParams();
  if (filters.classYear) params.append('classYear', filters.classYear);
  if (filters.residence) params.append('residence', filters.residence);
  if (filters.dietaryPattern) params.append('dietaryPattern', filters.dietaryPattern);
  if (limit) params.append('limit', limit.toString());

  const queryString = params.toString();
  const endpoint = `/api/leaderboard${queryString ? `?${queryString}` : ''}`;
  
  return leaderboardRequest(endpoint);
};

/**
 * Get available filter options
 */
export const getFilterOptions = async () => {
  return leaderboardRequest('/api/leaderboard/filters');
};

