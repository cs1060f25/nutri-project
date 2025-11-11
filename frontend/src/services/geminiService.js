/**
 * Service for Gemini-powered meal image analysis
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

/**
 * Analyze a meal image and get dish predictions
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise<Object>} Analysis results with predictions
 */
export const analyzeMealImage = async (imageFile) => {
  try {
    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`${API_BASE_URL}/api/analyze-meal`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze image');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error analyzing meal image:', error);
    throw error;
  }
};

