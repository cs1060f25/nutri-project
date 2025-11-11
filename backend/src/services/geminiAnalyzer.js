/**
 * Service for analyzing meal images using Google Gemini API
 */

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using stable model for better rate limits: 15 RPM, 200 RPD vs exp: 50 RPD
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Convert menu data to formatted text for Gemini with full nutrition info
 */
const formatMenuText = (menuData) => {
  if (!menuData || menuData.length === 0) {
    return "No menu data available for today.";
  }

  let menuText = "Today's HUDS Dining Menu with Nutrition Information:\n\n";
  
  menuData.forEach(location => {
    menuText += `📍 ${location.locationName}\n`;
    
    const meals = Object.values(location.meals || {});
    meals.forEach(meal => {
      menuText += `  🍽️ ${meal.mealName}\n`;
      
      const categories = Object.values(meal.categories || {});
      categories.forEach(category => {
        menuText += `    • ${category.categoryName}:\n`;
        
        category.recipes.forEach(recipe => {
          const dishName = recipe.Recipe_Print_As_Name || recipe.Recipe_Name;
          const calories = recipe.Calories || 'N/A';
          const protein = recipe.Protein || 'N/A';
          const carbs = recipe.Total_Carb || 'N/A';
          const fat = recipe.Total_Fat || 'N/A';
          const serving = recipe.Serving_Size || 'N/A';
          
          // Format: Dish Name (Serving: X) - Calories: Y, Protein: Z, Carbs: A, Fat: B
          menuText += `      - ${dishName} (${serving})\n`;
          menuText += `        Nutrition: ${calories} cal, Protein: ${protein}, Carbs: ${carbs}, Fat: ${fat}\n`;
        });
      });
    });
    menuText += '\n';
  });
  
  return menuText;
};

/**
 * Analyze a meal image using Gemini API with menu context
 * @param {Buffer} imageBuffer - Image file buffer
 * @param {Array} menuData - HUDS menu data from getTodaysMenu()
 * @returns {Object} Parsed predictions with dish names and confidence scores
 */
const analyzeMealImage = async (imageBuffer, menuData) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Convert image to base64
  const base64Image = imageBuffer.toString('base64');
  
  // Format menu text
  const menuText = formatMenuText(menuData);
  
  // Construct prompt
  const prompt = `${menuText}

Based on the dining menu above, analyze the food image and identify which dishes from today's menu appear in the image. For each identified dish, provide:
1. The exact dish name from the menu
2. A confidence score (0-1) indicating how certain you are

Return your response as a JSON array with this format:
[
  {"dish": "dish name from menu", "confidence": 0.95},
  {"dish": "another dish name", "confidence": 0.82}
]

If you cannot identify any dishes from the menu with reasonable confidence, return an empty array.
Only include dishes that you can see in the image and that match items from today's menu.`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Image
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // Extract text from Gemini response
    const candidate = response.data?.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content returned from Gemini API');
    }

    // Parse JSON from response (Gemini sometimes wraps in markdown)
    let jsonText = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const predictions = JSON.parse(jsonText);
    
    return {
      predictions: Array.isArray(predictions) ? predictions : [],
      menuContext: menuText
    };

  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    
    if (error.response?.status === 400) {
      throw new Error('Invalid image format or request. Please upload a valid JPEG or PNG image.');
    } else if (error.response?.status === 403) {
      throw new Error('API key is invalid or expired');
    } else if (error.response?.status === 429) {
      throw new Error('⏰ Rate limit exceeded! Free tier: 15 requests/min. Wait 60 seconds and try again.');
    } else if (error.response?.status === 500) {
      throw new Error('Gemini API server error - try again in a moment');
    }
    
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
};

module.exports = {
  analyzeMealImage,
  formatMenuText
};

