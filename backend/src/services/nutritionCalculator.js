/**
 * Service for calculating nutritional totals from HUDS menu items
 */

/**
 * Parse nutrient string to number (e.g., "12g" -> 12, "450" -> 450)
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
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
};

/**
 * Calculate similarity score between two dish names (0-1)
 * Uses simple token-based matching
 */
const calculateSimilarity = (name1, name2) => {
  const tokens1 = normalizeDishName(name1).split(' ');
  const tokens2 = normalizeDishName(name2).split(' ');
  
  let matches = 0;
  for (const token1 of tokens1) {
    if (token1.length < 3) continue; // Skip short words
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
 * Find the best matching recipe for a dish name from menu data
 * @param {string} dishName - Name of the dish from Gemini prediction
 * @param {Array} menuData - Today's menu data from HUDS
 * @returns {Object|null} Best matching recipe or null if no good match
 */
const findMatchingRecipe = (dishName, menuData) => {
  let bestMatch = null;
  let bestScore = 0;
  const MATCH_THRESHOLD = 0.3; // Minimum similarity to consider a match

  // Search through all locations, meals, and categories
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

  // Only return match if it meets threshold
  return bestScore >= MATCH_THRESHOLD ? bestMatch : null;
};

/**
 * Calculate total macros for predicted dishes
 * @param {Array} predictions - Array of {dish, confidence} from Gemini
 * @param {Array} menuData - Today's menu data from HUDS
 * @returns {Object} Nutrition totals and matched items
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
      // Parse nutrition values
      const calories = parseNutrient(recipe.Calories);
      const protein = parseNutrient(recipe.Protein);
      const carbs = parseNutrient(recipe.Total_Carb);
      const fat = parseNutrient(recipe.Total_Fat);

      // Add to totals
      totals.totalCalories += calories;
      totals.totalProtein += protein;
      totals.totalCarbs += carbs;
      totals.totalFat += fat;

      // Track matched item
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
      // Track unmatched dish
      unmatchedDishes.push(prediction.dish);
    }
  });

  // Round totals
  totals.totalCalories = Math.round(totals.totalCalories);
  totals.totalProtein = Math.round(totals.totalProtein * 10) / 10; // 1 decimal
  totals.totalCarbs = Math.round(totals.totalCarbs * 10) / 10;
  totals.totalFat = Math.round(totals.totalFat * 10) / 10;

  return {
    nutritionTotals: totals,
    matchedItems,
    unmatchedDishes
  };
};

module.exports = {
  calculateMealMacros,
  findMatchingRecipe,
  parseNutrient,
  normalizeDishName,
  calculateSimilarity
};

