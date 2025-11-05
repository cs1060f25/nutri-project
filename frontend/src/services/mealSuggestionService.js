/**
 * Service for meal suggestion API calls
 */

/**
 * Generate meal suggestion using AI
 * @param {Array} menuItems - Array of menu items with nutrition data
 * @param {string} mealType - Type of meal (Breakfast, Lunch, Dinner, etc.)
 * @param {string} accessToken - Authentication token
 * @returns {Promise<Object>} - AI suggestion response
 */
export const generateMealSuggestion = async (menuItems, mealType, accessToken) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch('/api/meal-suggestion', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      menuItems,
      mealType,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage = error.error?.message || 'Failed to generate meal suggestion';
    
    // Provide more helpful error messages
    if (errorMessage.includes('Insufficient Balance')) {
      throw new Error('Your DeepSeek API account has insufficient balance. Please add credits to continue using meal suggestions.');
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

