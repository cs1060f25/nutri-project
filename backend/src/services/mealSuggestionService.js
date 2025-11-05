/**
 * Service for generating meal suggestions using DeepSeek API
 */

const axios = require('axios');

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

/**
 * Generate meal suggestion using DeepSeek API
 * @param {Object} params - Parameters for meal suggestion
 * @param {Array} params.menuItems - Array of menu items with nutrition data
 * @param {Object} params.currentProgress - Current nutrition progress
 * @param {Object} params.nutritionGoals - Nutrition goals from active plan
 * @param {string} params.mealType - Type of meal (Breakfast, Lunch, Dinner, etc.)
 * @returns {Promise<Object>} - AI suggestion response
 */
const generateMealSuggestion = async ({ menuItems, currentProgress, nutritionGoals, mealType }) => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  if (!menuItems || !Array.isArray(menuItems) || menuItems.length === 0) {
    throw new Error('Menu items are required and must not be empty');
  }

  if (!mealType) {
    throw new Error('Meal type is required');
  }

  // Format menu items for the prompt
  const menuItemsText = menuItems.map(item => {
    const name = item.Recipe_Print_As_Name || item.Recipe_Name || 'Unknown Item';
    const calories = item.Calories || 'N/A';
    const protein = item.Protein || 'N/A';
    const totalFat = item.Total_Fat || 'N/A';
    const totalCarbs = item.Total_Carb || 'N/A';
    const fiber = item.Dietary_Fiber || 'N/A';
    const sodium = item.Sodium || 'N/A';
    const servingSize = item.Serving_Size || 'N/A';
    
    return `- ${name} (${servingSize}): ${calories} cal, ${protein}g protein, ${totalFat}g fat, ${totalCarbs}g carbs, ${fiber}g fiber, ${sodium}mg sodium`;
  }).join('\n');

  // Format current progress
  const progressText = currentProgress && typeof currentProgress === 'object' 
    ? Object.entries(currentProgress).map(([key, value]) => {
        if (!value || typeof value !== 'object') return null;
        const unit = value.unit || '';
        const current = value.current !== undefined ? value.current : 0;
        const target = value.target !== undefined ? value.target : 0;
        const percentage = value.percentage !== undefined ? value.percentage : 0;
        return `- ${key}: ${current}${unit} / ${target}${unit} (${percentage}%)`;
      }).filter(Boolean).join('\n')
    : 'No current progress data available';

  // Format nutrition goals
  const goalsText = nutritionGoals && typeof nutritionGoals === 'object'
    ? Object.entries(nutritionGoals).map(([key, metric]) => {
        if (!metric || typeof metric !== 'object' || !metric.enabled) return null;
        const target = metric.target || 0;
        const unit = metric.unit || '';
        return `- ${key}: ${target}${unit}`;
      }).filter(Boolean).join('\n')
    : 'No nutrition goals available';

  // Create the prompt
  const prompt = `You are a nutrition advisor helping a student choose a meal from their dining hall menu to meet their daily nutrition goals.

AVAILABLE MENU ITEMS FOR ${mealType.toUpperCase()}:
${menuItemsText}

CURRENT NUTRITION PROGRESS TODAY:
${progressText}

DAILY NUTRITION GOALS:
${goalsText}

Based on the menu items above, the student's current progress, and their daily goals, suggest a specific meal combination that will help them achieve their nutrition goals. Consider:
1. What items to select from the menu
2. Recommended portions/serving sizes
3. How this meal will help them meet their remaining goals for the day

Please respond in a clear, helpful format with:
- A brief explanation of why these items were chosen
- Specific items with their recommended portions
- Expected nutritional contribution from the suggested meal

Format your response as JSON with the following structure:
{
  "explanation": "Brief explanation of the recommendation",
  "suggestedItems": [
    {
      "itemName": "Exact name of the menu item",
      "portion": "Recommended portion/serving size",
      "reasoning": "Why this item was chosen"
    }
  ],
  "expectedNutrition": {
    "calories": 0,
    "protein": 0,
    "totalFat": 0,
    "totalCarbs": 0,
    "fiber": 0,
    "sodium": 0
  }
}

IMPORTANT: Use the EXACT item names from the menu list above. Be specific about portions.`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful nutrition advisor. Always respond with valid JSON only, no additional text before or after the JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0]?.message?.content || '';
    
    // Try to parse JSON from the response
    let suggestionData;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestionData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, return the raw response with a fallback structure
      console.error('Failed to parse AI response as JSON:', parseError);
      suggestionData = {
        explanation: aiResponse || 'AI suggestion generated successfully.',
        suggestedItems: [],
        expectedNutrition: {},
      };
    }

    return {
      success: true,
      data: suggestionData,
      rawResponse: aiResponse,
    };
  } catch (error) {
    console.error('DeepSeek API error:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // Handle specific API errors
    const errorMessage = error.response?.data?.error?.message || error.message;
    
    if (errorMessage.includes('Insufficient Balance') || errorMessage.includes('insufficient')) {
      throw new Error('Insufficient Balance: Your DeepSeek API key has no credits remaining. Please add credits to your DeepSeek account.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Invalid API Key: The DeepSeek API key is invalid or expired. Please check your API key in the .env file.');
    }
    
    throw new Error(`Failed to generate meal suggestion: ${errorMessage}`);
  }
};

module.exports = {
  generateMealSuggestion,
};

