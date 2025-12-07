/**
 * Serverless function for analyzing meal images using Gemini API
 * Handles /api/analyze-meal POST requests
 */

const admin = require('firebase-admin');
const axios = require('axios');

// Use busboy for multipart form parsing
let Busboy;
try {
  Busboy = require('busboy');
} catch (e) {
  // Fallback: try to use built-in parsing or alternative
  console.warn('busboy not found, will attempt alternative parsing');
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

const getDb = () => {
  return admin.firestore();
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const HUDS_API_BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
const HUDS_API_KEY = process.env.HUDS_API_KEY;

/**
 * Format date to MM/DD/YYYY format expected by HUDS API
 */
const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

/**
 * Get combined menus from multiple dining halls
 * Uses the same approach as backend/src/services/hudsService.js
 */
const getCombinedMenus = async () => {
  try {
    const today = new Date();
    const todayStr = formatDate(today);
    
    // Get recipes and events for today
    const [recipesResponse, eventsResponse] = await Promise.all([
      axios.get(`${HUDS_API_BASE_URL}/recipes`, {
        headers: {
          'X-Api-Key': HUDS_API_KEY,
          'Accept': 'application/json',
        },
        params: {
          date: todayStr,
        },
      }),
      axios.get(`${HUDS_API_BASE_URL}/events`, {
        headers: {
          'X-Api-Key': HUDS_API_KEY,
          'Accept': 'application/json',
        },
        params: {
          date: todayStr,
        },
      }),
    ]);

    const recipes = Array.isArray(recipesResponse.data) ? recipesResponse.data : [];
    const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : [];

    if (recipes.length === 0) {
      console.warn('No recipes found for today');
      return [];
    }

    // Organize data by location, meal, and menu category (same structure as backend)
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
          location_number: locNum, // For compatibility
          location_name: locName, // For compatibility
          meals: {},
        };
      }

      if (!menuByLocation[locNum].meals[mealNum]) {
        menuByLocation[locNum].meals[mealNum] = {
          mealNumber: mealNum,
          mealName: mealName,
          meal_name: mealName, // For compatibility
          categories: {},
        };
      }

      if (!menuByLocation[locNum].meals[mealNum].categories[categoryNum]) {
        menuByLocation[locNum].meals[mealNum].categories[categoryNum] = {
          categoryNumber: categoryNum,
          categoryName: categoryName,
          category_name: categoryName, // For compatibility
          recipes: [],
        };
      }

      menuByLocation[locNum].meals[mealNum].categories[categoryNum].recipes.push(recipe);
    });

    // Convert to array format and filter to primary locations (Annenberg, Quincy, Winthrop)
    const primaryNames = new Set(['Annenberg Hall', 'Quincy House', 'Winthrop House']);
    const allMenus = Object.values(menuByLocation);
    const combinedMenus = allMenus.filter(loc => primaryNames.has(loc.locationName));

    // If no primary locations found, return all menus
    return combinedMenus.length > 0 ? combinedMenus : allMenus;
  } catch (error) {
    console.error('Error getting combined menus:', error);
    if (error.response) {
      console.error('HUDS API error response:', error.response.status, error.response.data);
    }
    throw error;
  }
};

/**
 * Format menu data to text for Gemini
 */
const formatMenuText = (menuData) => {
  if (!menuData || menuData.length === 0) {
    return "No menu data available for today.";
  }

  let menuText = "Today's HUDS Dining Menu with Nutrition Information:\n\n";
  
  menuData.forEach(location => {
    const locationName = location.locationName || location.location_name;
    menuText += `📍 ${locationName}\n`;
    
    const meals = Object.values(location.meals || {});
    meals.forEach(meal => {
      const mealName = meal.mealName || meal.meal_name;
      menuText += `  🍽️ ${mealName}\n`;
      
      const categories = Object.values(meal.categories || {});
      categories.forEach(category => {
        const categoryName = category.categoryName || category.category_name;
        menuText += `    • ${categoryName}:\n`;
        
        category.recipes.forEach(recipe => {
          const dishName = recipe.Recipe_Print_As_Name || recipe.Recipe_Name;
          const calories = recipe.Calories || 'N/A';
          const protein = recipe.Protein || 'N/A';
          const carbs = recipe.Total_Carb || 'N/A';
          const fat = recipe.Total_Fat || 'N/A';
          const serving = recipe.Serving_Size || 'N/A';
          
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
 * Analyze meal image with Gemini
 */
const analyzeMealImage = async (imageBuffer, menuData) => {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const base64Image = imageBuffer.toString('base64');
  const menuText = formatMenuText(menuData);
  
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
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Image
              }
            },
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        }
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const candidate = response.data?.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text;
    
    if (!content) {
      throw new Error('No content returned from Gemini API');
    }

    let jsonText = content.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    let predictions;
    try {
      predictions = JSON.parse(jsonText);
    } catch (parseError) {
      const startIdx = jsonText.indexOf('[');
      const endIdx = jsonText.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        predictions = JSON.parse(jsonText.slice(startIdx, endIdx + 1));
      } else {
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

/**
 * Parse nutrient string to number
 */
const parseNutrient = (value) => {
  if (!value) return 0;
  const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
};

/**
 * Normalize dish name for matching
 */
const normalizeDishName = (name) => {
  return name.toLowerCase().trim().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
};

/**
 * Calculate similarity between dish names
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
 * Find matching recipe from menu data
 */
const findMatchingRecipe = (dishName, menuData) => {
  let bestMatch = null;
  let bestScore = 0;

  menuData.forEach(location => {
    const meals = Object.values(location.meals || {});
    meals.forEach(meal => {
      const categories = Object.values(meal.categories || {});
      categories.forEach(category => {
        category.recipes.forEach(recipe => {
          const recipeName = recipe.Recipe_Print_As_Name || recipe.Recipe_Name;
          const score = calculateSimilarity(dishName, recipeName);
          if (score > bestScore && score > 0.3) {
            bestScore = score;
            bestMatch = recipe;
          }
        });
      });
    });
  });

  return bestMatch;
};

/**
 * Calculate meal macros from predictions
 */
const calculateMealMacros = (predictions, menuData) => {
  const matchedItems = [];
  const unmatchedDishes = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let saturatedFat = 0;
  let transFat = 0;
  let cholesterol = 0;
  let sodium = 0;
  let fiber = 0;
  let sugars = 0;
  let caloriesFromFat = 0;

  predictions.forEach(pred => {
    const recipe = findMatchingRecipe(pred.dish, menuData);
    const servings = pred.estimatedServings || 1;

    if (recipe) {
      const calories = parseNutrient(recipe.Calories) * servings;
      const protein = parseNutrient(recipe.Protein) * servings;
      const carbs = parseNutrient(recipe.Total_Carb) * servings;
      const fat = parseNutrient(recipe.Total_Fat) * servings;
      const satFat = parseNutrient(recipe.Sat_Fat) * servings;
      const trFat = parseNutrient(recipe.Trans_Fat) * servings;
      const chol = parseNutrient(recipe.Cholesterol) * servings;
      const sod = parseNutrient(recipe.Sodium) * servings;
      const fib = parseNutrient(recipe.Dietary_Fiber) * servings;
      const sug = parseNutrient(recipe.Sugars) * servings;
      const calFromFat = parseNutrient(recipe.Calories_From_Fat) * servings;

      totalCalories += calories;
      totalProtein += protein;
      totalCarbs += carbs;
      totalFat += fat;
      saturatedFat += satFat;
      transFat += trFat;
      cholesterol += chol;
      sodium += sod;
      fiber += fib;
      sugars += sug;
      caloriesFromFat += calFromFat;

      matchedItems.push({
        predictedName: pred.dish,
        matchedName: recipe.Recipe_Print_As_Name || recipe.Recipe_Name,
        estimatedServings: servings,
        portionDescription: pred.portionDescription || '',
        calories: calories.toFixed(1),
        protein: protein.toFixed(1),
        carbs: carbs.toFixed(1),
        fat: fat.toFixed(1),
        saturatedFat: satFat.toFixed(1),
        transFat: trFat.toFixed(1),
        cholesterol: chol.toFixed(1),
        sodium: sod.toFixed(1),
        fiber: fib.toFixed(1),
        sugars: sug.toFixed(1),
        caloriesFromFat: calFromFat.toFixed(1),
        recipe: recipe,
      });
    } else {
      unmatchedDishes.push({
        dish: pred.dish,
        estimatedServings: servings,
        portionDescription: pred.portionDescription || '',
      });
    }
  });

  return {
    nutritionTotals: {
      totalCalories: Math.round(totalCalories),
      totalProtein: totalProtein.toFixed(1),
      totalCarbs: totalCarbs.toFixed(1),
      totalFat: totalFat.toFixed(1),
      saturatedFat: saturatedFat.toFixed(1),
      transFat: transFat.toFixed(1),
      cholesterol: cholesterol.toFixed(1),
      sodium: sodium.toFixed(1),
      fiber: fiber.toFixed(1),
      sugars: sugars.toFixed(1),
      caloriesFromFat: Math.round(caloriesFromFat),
      // Also include non-prefixed versions for backward compatibility
      calories: Math.round(totalCalories),
      protein: totalProtein.toFixed(1),
      carbs: totalCarbs.toFixed(1),
      fat: totalFat.toFixed(1),
    },
    matchedItems,
    unmatchedDishes,
  };
};

/**
 * Parse multipart form data
 */
const parseMultipartForm = (req) => {
  return new Promise((resolve, reject) => {
    if (!Busboy) {
      return reject(new Error('busboy is required for multipart form parsing. Please install it: npm install busboy'));
    }

    const busboy = Busboy({ headers: req.headers });
    const fileData = { buffer: null, mimetype: null };

    busboy.on('file', (name, file, info) => {
      const { filename, encoding, mimeType } = info;
      if (name === 'image') {
        fileData.mimetype = mimeType;
        const chunks = [];
        file.on('data', (chunk) => {
          chunks.push(chunk);
        });
        file.on('end', () => {
          fileData.buffer = Buffer.concat(chunks);
        });
      } else {
        file.resume();
      }
    });

    busboy.on('finish', () => {
      resolve(fileData);
    });

    busboy.on('error', (error) => {
      reject(error);
    });

    req.pipe(busboy);
  });
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    const { buffer, mimetype } = await parseMultipartForm(req);

    if (!buffer) {
      return res.status(400).json({ 
        error: 'No image file provided. Please upload an image.' 
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a JPEG or PNG image.' 
      });
    }

    // Check file size (Vercel limit is 4.5MB, but we'll be more conservative)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (buffer.length > maxSize) {
      return res.status(413).json({ 
        error: 'Image too large. Please upload an image smaller than 4MB.' 
      });
    }

    // Get combined menus
    const menuData = await getCombinedMenus();
    
    if (!menuData || menuData.length === 0) {
      return res.status(404).json({ 
        error: 'No menu data available for today. Please try again later.' 
      });
    }

    console.log(`🍽️  Analyzing with menus from ${menuData.length} dining hall(s)`);

    // Analyze the image
    const result = await analyzeMealImage(buffer, menuData);

    if (!result.predictions || result.predictions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'We could not detect any HUDS menu items in this photo. Try a clearer picture of your plate.'
      });
    }

    // Calculate nutrition totals
    const macros = calculateMealMacros(result.predictions, menuData);

    return res.status(200).json({
      success: true,
      predictions: result.predictions,
      nutritionTotals: macros.nutritionTotals,
      matchedItems: macros.matchedItems,
      unmatchedDishes: macros.unmatchedDishes,
      menuAvailable: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing meal image:', error);
    
    let errorMessage = 'Failed to analyze meal image';
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    const statusCode = errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY') ? 500 : 400;
    return res.status(statusCode).json({ 
      error: errorMessage,
      success: false
    });
  }
};

