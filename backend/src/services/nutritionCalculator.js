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
 * Find the best matching recipe for a dish name from menu data
 */
const findMatchingRecipe = (dishName, menuData) => {
  let bestMatch = null;
  let bestScore = 0;
  const MATCH_THRESHOLD = 0.3;

  menuData.forEach((location) => {
    const meals = Object.values(location.meals || {});
    meals.forEach((meal) => {
      const categories = Object.values(meal.categories || {});
      categories.forEach((category) => {
        category.recipes.forEach((recipe) => {
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

const clampServings = (value) => {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) return 1;
  return Math.min(1.5, Math.max(0.25, num));
};

const calculateMealMacros = (predictions, menuData) => {
  const totals = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    saturatedFat: 0,
    transFat: 0,
    cholesterol: 0,
    sodium: 0,
    fiber: 0,
    sugars: 0,
    caloriesFromFat: 0,
  };

  const matchedItems = [];
  const unmatchedDishes = [];

  predictions.forEach((prediction) => {
    const recipe = findMatchingRecipe(prediction.dish, menuData);

    if (recipe) {
      const estimatedServings = clampServings(
        prediction.estimatedServings ?? prediction.portionMultiplier ?? 1
      );
      const portionDescription = prediction.portionDescription || null;

      const calories = parseNutrient(recipe.Calories) * estimatedServings;
      const protein = parseNutrient(recipe.Protein) * estimatedServings;
      const carbs = parseNutrient(recipe.Total_Carb) * estimatedServings;
      const fat = parseNutrient(recipe.Total_Fat) * estimatedServings;
      const saturatedFat = parseNutrient(recipe.Sat_Fat) * estimatedServings;
      const transFat = parseNutrient(recipe.Trans_Fat) * estimatedServings;
      const cholesterol = parseNutrient(recipe.Cholesterol) * estimatedServings;
      const sodium = parseNutrient(recipe.Sodium) * estimatedServings;
      const fiber = parseNutrient(recipe.Dietary_Fiber) * estimatedServings;
      const sugars = parseNutrient(recipe.Sugars) * estimatedServings;
      const caloriesFromFat = parseNutrient(recipe.Calories_From_Fat) * estimatedServings;

      totals.totalCalories += calories;
      totals.totalProtein += protein;
      totals.totalCarbs += carbs;
      totals.totalFat += fat;
      totals.saturatedFat += saturatedFat;
      totals.transFat += transFat;
      totals.cholesterol += cholesterol;
      totals.sodium += sodium;
      totals.fiber += fiber;
      totals.sugars += sugars;
      totals.caloriesFromFat += caloriesFromFat;

      matchedItems.push({
        predictedName: prediction.dish,
        matchedName: recipe.Recipe_Print_As_Name || recipe.Recipe_Name,
        confidence: prediction.confidence,
        estimatedServings,
        portionDescription,
        recipeId: recipe.ID,
        calories,
        protein,
        carbs,
        fat,
        saturatedFat,
        transFat,
        cholesterol,
        sodium,
        fiber,
        sugars,
        caloriesFromFat,
        servingSize: recipe.Serving_Size || '1 serving',
      });
    } else {
      unmatchedDishes.push(prediction.dish);
    }
  });

  totals.totalCalories = Math.round(totals.totalCalories);
  totals.totalProtein = Math.round(totals.totalProtein * 10) / 10;
  totals.totalCarbs = Math.round(totals.totalCarbs * 10) / 10;
  totals.totalFat = Math.round(totals.totalFat * 10) / 10;
  totals.saturatedFat = Math.round(totals.saturatedFat * 10) / 10;
  totals.transFat = Math.round(totals.transFat * 10) / 10;
  totals.cholesterol = Math.round(totals.cholesterol * 10) / 10;
  totals.sodium = Math.round(totals.sodium * 10) / 10;
  totals.fiber = Math.round(totals.fiber * 10) / 10;
  totals.sugars = Math.round(totals.sugars * 10) / 10;
  totals.caloriesFromFat = Math.round(totals.caloriesFromFat);

  return {
    nutritionTotals: totals,
    matchedItems,
    unmatchedDishes,
  };
};

module.exports = {
  calculateMealMacros,
  findMatchingRecipe,
  parseNutrient,
  normalizeDishName,
  calculateSimilarity,
};
