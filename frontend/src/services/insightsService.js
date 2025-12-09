/**
 * Service for Insights page data fetching
 */

const API_BASE = process.env.NODE_ENV === 'production'
  ? ''
  : (process.env.REACT_APP_API_URL || 'http://localhost:3000');

/**
 * Fetch nutrition progress for a date range
 */
export const getRangeProgress = async ({ start, end }, accessToken) => {
  if (!start || !end) {
    throw new Error('Start and end dates are required');
  }

  const url = new URL(`${API_BASE}/api/nutrition-progress/range`, window.location.origin);
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message || error?.error || 'Failed to fetch insights data';
    throw new Error(message);
  }

  return response.json();
};

/**
 * Fetch AI-powered summary for a date range
 */
export const getAiSummary = async ({ start, end }, accessToken) => {
  if (!start || !end) {
    throw new Error('Start and end dates are required');
  }

  const url = new URL(`${API_BASE}/api/nutrition-progress/range/ai-summary`, window.location.origin);
  url.searchParams.set('start', start);
  url.searchParams.set('end', end);

  const headers = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    const message = error?.error?.message || error?.error || 'Failed to fetch AI summary';
    throw new Error(message);
  }

  return response.json();
};
