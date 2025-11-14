/**
 * Frontend service for user profile API calls
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
 * Get user profile
 */
export const getUserProfile = async () => {
  const response = await fetchWithAuth(`${API_BASE}/api/profile`, {
    method: 'GET',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch profile');
  }

  const data = await response.json();
  return data.profile;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (profileData) => {
  const response = await fetchWithAuth(`${API_BASE}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update profile');
  }

  const data = await response.json();
  return data.profile;
};

