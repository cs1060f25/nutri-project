/**
 * Utility functions for handling API errors with user-friendly messages
 */

/**
 * Convert HTTP status codes and error responses into user-friendly messages
 * @param {Response} response - Fetch API response object
 * @param {string} action - What action was being performed (e.g., "save meal log")
 * @returns {Promise<Error>} Error with user-friendly message
 */
export const handleApiError = async (response, action = 'complete this action') => {
  const status = response.status;
  let errorData = {};
  
  try {
    errorData = await response.json();
  } catch (e) {
    // If JSON parsing fails, use empty object
  }

  // Extract error message from various possible fields
  const serverMessage = errorData.error || errorData.message || errorData.details;

  switch (status) {
    case 400:
      // Bad Request - validation errors
      if (serverMessage) {
        return new Error(serverMessage);
      }
      return new Error(`Invalid data provided. Please check your input and try again.`);

    case 401:
      // Unauthorized - expired or missing token
      return new Error('Your session has expired. Please log in again.');

    case 403:
      // Forbidden - insufficient permissions
      return new Error(`You don't have permission to ${action}.`);

    case 404:
      // Not Found
      return new Error(`The requested item was not found. It may have been deleted.`);

    case 409:
      // Conflict
      if (serverMessage) {
        return new Error(serverMessage);
      }
      return new Error(`This ${action} conflicts with existing data.`);

    case 429:
      // Too Many Requests
      return new Error('Too many requests. Please wait a moment and try again.');

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors
      return new Error('Something went wrong on our end. Please try again later.');

    default:
      // Generic fallback
      if (serverMessage) {
        return new Error(serverMessage);
      }
      return new Error(`Failed to ${action}. Please try again.`);
  }
};

/**
 * Handle network errors (no response received)
 * @param {Error} error - Network error
 * @param {string} action - What action was being performed
 * @returns {Error} Error with user-friendly message
 */
export const handleNetworkError = (error, action = 'complete this action') => {
  const errorMessage = error.message.toLowerCase();

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return new Error('Unable to connect. Please check your internet connection and try again.');
  }

  if (errorMessage.includes('timeout')) {
    return new Error('Request timed out. Please check your connection and try again.');
  }

  if (errorMessage.includes('abort')) {
    return new Error('Request was cancelled. Please try again.');
  }

  // Generic network error
  return new Error(`Network error while trying to ${action}. Please try again.`);
};

/**
 * Wrapper for fetch calls with automatic error handling
 * @param {string} url - API endpoint
 * @param {object} options - Fetch options
 * @param {string} action - User-friendly action description
 * @returns {Promise<any>} Response data
 */
export const fetchWithErrorHandling = async (url, options = {}, action = 'complete this action') => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw await handleApiError(response, action);
    }

    return await response.json();
  } catch (error) {
    // If it's already our formatted error, re-throw it
    if (error.message && (
      error.message.includes('session has expired') ||
      error.message.includes('check your internet') ||
      error.message.includes('try again later')
    )) {
      throw error;
    }

    // Otherwise, handle as network error
    throw handleNetworkError(error, action);
  }
};
