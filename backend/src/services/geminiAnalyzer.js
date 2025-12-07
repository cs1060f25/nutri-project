/**
 * Service for analyzing meal images using Google Gemini API
 */

const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Gemini 2.5 Flash Lite
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

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

Inspect the food image carefully and identify which dishes from today's HUDS menu are clearly present. Follow these guardrails:
- Only include dishes that are visibly present and match the menu above.
- Estimate the actual portion size visible in the image (e.g., "about 6 oz of chicken" or "roughly 1 cup of rice"). Compare it directly to the HUDS serving size and state how many HUDS servings it represents (e.g., if the plate shows ~6 oz of chicken and the HUDS serving is 4 oz, report 1.5 servings of that chicken).
- If you cannot reasonably judge the portion, default to 1 HUDS serving and note the uncertainty.
- Do not list items that are out of frame, obscured, or uncertain.
- If the plate does not contain recognizable HUDS dishes (or the image quality is too poor), return an empty array.

Return your response strictly as a JSON array where each object looks like:
{
  "dish": "exact dish name from the menu",
  "estimatedServings": 1.5,
  "portionDescription": "about 6 oz of chicken breast (HUDS serving is 4 oz)"
}

If no valid dishes are detected, return [] with no additional commentary.`;

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

    // Parse JSON from response (Gemini sometimes wraps in markdown or adds prose)
    let jsonText = content.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    let predictions;

    try {
      // First, try to parse the whole string as JSON
      predictions = JSON.parse(jsonText);
    } catch (parseError) {
      // If that fails, try to extract the first JSON array in the text
      const startIdx = jsonText.indexOf('[');
      const endIdx = jsonText.lastIndexOf(']');

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        const arrayText = jsonText.slice(startIdx, endIdx + 1);
        try {
          predictions = JSON.parse(arrayText);
        } catch (innerError) {
          console.error('Failed to parse JSON array from Gemini response:', innerError.message);
          throw new Error('Gemini returned an unexpected format. Please try again with a clearer photo.');
        }
      } else {
        console.error('No JSON array found in Gemini response text:', jsonText.slice(0, 200));
        throw new Error('We could not detect any HUDS menu items in this photo. Try a clearer picture of your plate.');
      }
    }
    
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
      throw new Error('⏰ Rate limit exceeded! Gemini 2.5 Flash Lite: 10 requests/min, 20 per day. Wait 60 seconds and try again.');
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

