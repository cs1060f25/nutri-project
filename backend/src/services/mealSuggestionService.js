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

  // Create the prompt with a clear example
  const prompt = `You are a nutrition advisor helping a student choose a meal from their dining hall menu to meet their daily nutrition goals.

AVAILABLE MENU ITEMS FOR ${mealType.toUpperCase()}:
${menuItemsText}

CURRENT NUTRITION PROGRESS TODAY:
${progressText}

DAILY NUTRITION GOALS:
${goalsText}

Based on the menu items above, the student's current progress, and their daily goals, suggest a specific meal combination that will help them achieve their nutrition goals.

IMPORTANT INSTRUCTIONS:
1. Use EXACT item names from the menu list above (match them exactly as shown)
2. Recommend realistic portions (e.g., "1 EACH", "4 OZ", "1 CUP")
3. Calculate expectedNutrition as NUMBERS (sum of all selected items' nutrition values)
4. Provide a brief, clear explanation (2-3 sentences)

You MUST respond with ONLY valid JSON in this exact format (no markdown, no code blocks, no additional text):

{
  "explanation": "Brief explanation of why these items were chosen and how they help meet nutrition goals",
  "suggestedItems": [
    {
      "itemName": "Exact menu item name from the list above",
      "portion": "Recommended portion like '1 EACH' or '4 OZ'",
      "reasoning": "Brief reason why this item was selected"
    }
  ],
  "expectedNutrition": {
    "calories": 450,
    "protein": 35.5,
    "totalFat": 15.2,
    "totalCarbs": 45.8,
    "fiber": 8.3,
    "sodium": 650.4
  }
}

EXAMPLE OUTPUT:
{
  "explanation": "This meal combination focuses on high protein to help meet the daily goal while keeping calories moderate. The grilled chicken provides lean protein, and the vegetables add fiber and essential nutrients.",
  "suggestedItems": [
    {
      "itemName": "Grilled Chicken Breast",
      "portion": "1 EACH",
      "reasoning": "High in protein (25g) with low fat, helping meet protein goals"
    },
    {
      "itemName": "Steamed Broccoli",
      "portion": "4 OZ",
      "reasoning": "Provides fiber (3.6g) and essential nutrients with minimal calories"
    }
  ],
  "expectedNutrition": {
    "calories": 194,
    "protein": 27.6,
    "totalFat": 6.2,
    "totalCarbs": 7.8,
    "fiber": 3.6,
    "sodium": 218.4
  }
}

Remember: Return ONLY the JSON object, nothing else.`;

  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        stream: false,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful nutrition advisor. You MUST respond with ONLY valid JSON in the exact format specified. Do not include any markdown code blocks, explanations before or after the JSON, or any other text. Return ONLY the raw JSON object.'
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
    
    console.log('Raw AI response:', aiResponse);
    console.log('AI response type:', typeof aiResponse);
    
    // Try to parse JSON from the response
    let suggestionData;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      
      // Remove markdown code blocks (```json ... ```)
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/^```\s*/i, '');
      cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
      cleanedResponse = cleanedResponse.trim();
      
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestionData = JSON.parse(jsonMatch[0]);
        console.log('Parsed suggestionData successfully');
        console.log('suggestionData keys:', Object.keys(suggestionData));
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, return the raw response with a fallback structure
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Parse error details:', parseError.message);
      throw new Error(`Failed to parse AI response: ${parseError.message}. Raw response: ${aiResponse.substring(0, 200)}`);
    }

    // Validate and ensure suggestionData has the correct structure
    if (!suggestionData || typeof suggestionData !== 'object' || Array.isArray(suggestionData)) {
      console.error('Invalid suggestionData after parsing:', suggestionData);
      throw new Error('Invalid suggestion data structure: expected an object');
    }

    // Ensure required fields exist with correct types
    if (!suggestionData.explanation || typeof suggestionData.explanation !== 'string') {
      suggestionData.explanation = suggestionData.explanation || 'AI suggestion generated successfully.';
    }
    
    if (!Array.isArray(suggestionData.suggestedItems)) {
      suggestionData.suggestedItems = [];
    }
    
    if (!suggestionData.expectedNutrition || typeof suggestionData.expectedNutrition !== 'object') {
      suggestionData.expectedNutrition = {};
    }

    // Ensure expectedNutrition values are numbers, not strings
    const nutritionFields = ['calories', 'protein', 'totalFat', 'totalCarbs', 'fiber', 'sodium'];
    nutritionFields.forEach(field => {
      if (suggestionData.expectedNutrition[field] !== undefined) {
        const value = suggestionData.expectedNutrition[field];
        if (typeof value === 'string') {
          // Try to evaluate formulas like "156 + 38 + 19"
          try {
            const cleaned = value.replace(/[^0-9+\-.\s]/g, '');
            suggestionData.expectedNutrition[field] = Function('"use strict"; return (' + cleaned + ')')();
          } catch (e) {
            // If evaluation fails, try to parse as number
            suggestionData.expectedNutrition[field] = parseFloat(value) || 0;
          }
        } else if (typeof value !== 'number') {
          suggestionData.expectedNutrition[field] = 0;
        }
      }
    });

    console.log('Returning validated suggestionData');
    
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

