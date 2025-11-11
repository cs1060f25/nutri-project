// Vercel serverless function for Gemini-powered meal analysis
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Using stable model for better rate limits: 15 RPM, 200 RPD vs exp: 50 RPD
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
const HUDS_API_KEY = process.env.HUDS_API_KEY;

// Disable body parsing to handle multipart form data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Get today's HUDS menu
 */
const getTodaysMenu = async () => {
  const today = formatDate(new Date());
  const params = { date: today };

  const response = await axios.get(`${BASE_URL}/recipes`, {
    headers: {
      'X-Api-Key': HUDS_API_KEY,
      'Accept': 'application/json',
    },
    params,
  });

  const recipes = response.data;
  const menuByLocation = {};

  recipes.forEach(recipe => {
    const locNum = recipe.Location_Number;
    const locName = recipe.Location_Name;
    const mealNum = recipe.Meal_Number;
    const mealName = recipe.Meal_Name;
    const categoryNum = recipe.Menu_Category_Number;
    const categoryName = recipe.Menu_Category_Name;

    if (!menuByLocation[locNum]) {
      menuByLocation[locNum] = {
        locationNumber: locNum,
        locationName: locName,
        meals: {},
      };
    }

    if (!menuByLocation[locNum].meals[mealNum]) {
      menuByLocation[locNum].meals[mealNum] = {
        mealNumber: mealNum,
        mealName: mealName,
        categories: {},
      };
    }

    if (!menuByLocation[locNum].meals[mealNum].categories[categoryNum]) {
      menuByLocation[locNum].meals[mealNum].categories[categoryNum] = {
        categoryNumber: categoryNum,
        categoryName: categoryName,
        recipes: [],
      };
    }

    menuByLocation[locNum].meals[mealNum].categories[categoryNum].recipes.push(recipe);
  });

  return Object.values(menuByLocation);
};

/**
 * Format menu data for Gemini
 */
const formatMenuText = (menuData) => {
  if (!menuData || menuData.length === 0) {
    return "No menu data available for today.";
  }

  let menuText = "Today's HUDS Dining Menu:\n\n";
  
  menuData.forEach(location => {
    menuText += `📍 ${location.locationName}\n`;
    
    const meals = Object.values(location.meals || {});
    meals.forEach(meal => {
      menuText += `  🍽️ ${meal.mealName}\n`;
      
      const categories = Object.values(meal.categories || {});
      categories.forEach(category => {
        menuText += `    • ${category.categoryName}:\n`;
        
        category.recipes.forEach(recipe => {
          menuText += `      - ${recipe.Recipe_Print_As_Name || recipe.Recipe_Name}\n`;
        });
      });
    });
    menuText += '\n';
  });
  
  return menuText;
};

/**
 * Parse nutrient string to number (e.g., "12g" -> 12)
 */
const parseNutrient = (value) => {
  if (!value) return 0;
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};

/**
 * Normalize dish name for fuzzy matching
 */
const normalizeDishName = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Calculate similarity score between two dish names (0-1)
 */
const calculateSimilarity = (name1, name2) => {
  const tokens1 = normalizeDishName(name1).split(' ');
  const tokens2 = normalizeDishName(name2).split(' ');
  
  let matches = 0;
  for (const token1 of tokens1) {
    if (token1.length < 3) continue;
    for (const token2 of tokens2) {
      if (token1 === token2 || token1.includes(token2) || token2.includes(token1)) {
        matches++;
        break;
      }
    }
  }
  
  const maxTokens = Math.max(tokens1.length, tokens2.length);
  return maxTokens > 0 ? matches / maxTokens : 0;
};

/**
 * Find matching recipe for a dish name
 */
const findMatchingRecipe = (dishName, menuData) => {
  let bestMatch = null;
  let bestScore = 0;
  const MATCH_THRESHOLD = 0.3;

  menuData.forEach(location => {
    const meals = Object.values(location.meals || {});
    meals.forEach(meal => {
      const categories = Object.values(meal.categories || {});
      categories.forEach(category => {
        category.recipes.forEach(recipe => {
          const recipeName = recipe.Recipe_Print_As_Name || recipe.Recipe_Name;
          const score = calculateSimilarity(dishName, recipeName);
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = recipe;
          }
        });
      });
    });
  });

  return bestScore >= MATCH_THRESHOLD ? bestMatch : null;
};

/**
 * Calculate total macros for predicted dishes
 */
const calculateMealMacros = (predictions, menuData) => {
  const totals = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  };

  const matchedItems = [];
  const unmatchedDishes = [];

  predictions.forEach(prediction => {
    const recipe = findMatchingRecipe(prediction.dish, menuData);
    
    if (recipe) {
      const calories = parseNutrient(recipe.Calories);
      const protein = parseNutrient(recipe.Protein);
      const carbs = parseNutrient(recipe.Total_Carb);
      const fat = parseNutrient(recipe.Total_Fat);

      totals.totalCalories += calories;
      totals.totalProtein += protein;
      totals.totalCarbs += carbs;
      totals.totalFat += fat;

      matchedItems.push({
        predictedName: prediction.dish,
        matchedName: recipe.Recipe_Print_As_Name || recipe.Recipe_Name,
        confidence: prediction.confidence,
        recipeId: recipe.ID,
        calories,
        protein,
        carbs,
        fat,
        servingSize: recipe.Serving_Size || '1 serving'
      });
    } else {
      unmatchedDishes.push(prediction.dish);
    }
  });

  totals.totalCalories = Math.round(totals.totalCalories);
  totals.totalProtein = Math.round(totals.totalProtein * 10) / 10;
  totals.totalCarbs = Math.round(totals.totalCarbs * 10) / 10;
  totals.totalFat = Math.round(totals.totalFat * 10) / 10;

  return {
    nutritionTotals: totals,
    matchedItems,
    unmatchedDishes
  };
};

/**
 * Parse multipart form data to extract image
 */
const parseMultipartForm = async (req) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const boundary = req.headers['content-type'].split('boundary=')[1];
      
      if (!boundary) {
        return reject(new Error('No boundary found in Content-Type'));
      }

      const parts = buffer.toString('binary').split(`--${boundary}`);
      
      for (const part of parts) {
        if (part.includes('Content-Type: image/')) {
          // Extract image data
          const imageStart = part.indexOf('\r\n\r\n') + 4;
          const imageEnd = part.lastIndexOf('\r\n');
          const imageData = part.substring(imageStart, imageEnd);
          const imageBuffer = Buffer.from(imageData, 'binary');
          
          return resolve(imageBuffer);
        }
      }
      
      reject(new Error('No image found in request'));
    });
    req.on('error', reject);
  });
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: 'GEMINI_API_KEY is not configured',
        success: false 
      });
    }

    // Parse multipart form data to get image
    let imageBuffer;
    
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      imageBuffer = await parseMultipartForm(req);
    } else if (req.body && req.body.image) {
      // Handle base64 encoded image from body
      imageBuffer = Buffer.from(req.body.image, 'base64');
    } else {
      return res.status(400).json({ 
        error: 'No image provided. Please upload an image.',
        success: false 
      });
    }

    // Get today's HUDS menu
    const menuData = await getTodaysMenu();
    
    if (!menuData || menuData.length === 0) {
      return res.status(404).json({ 
        error: 'No menu data available for today.',
        success: false 
      });
    }

    // Format menu text
    const menuText = formatMenuText(menuData);
    
    // Convert image to base64
    const base64Image = imageBuffer.toString('base64');
    
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

    // Call Gemini API
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

    // Parse JSON from response
    let jsonText = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }
    
    const predictions = JSON.parse(jsonText);
    
    // Calculate nutrition totals from predictions
    const macros = calculateMealMacros(
      Array.isArray(predictions) ? predictions : [],
      menuData
    );
    
    return res.status(200).json({
      success: true,
      predictions: Array.isArray(predictions) ? predictions : [],
      nutritionTotals: macros.nutritionTotals,
      matchedItems: macros.matchedItems,
      unmatchedDishes: macros.unmatchedDishes,
      menuAvailable: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing meal image:', error);
    
    const statusCode = error.response?.status === 400 ? 400 : 
                       error.response?.status === 403 ? 500 : 500;
    
    return res.status(statusCode).json({ 
      error: error.message || 'Failed to analyze meal image',
      success: false
    });
  }
};

