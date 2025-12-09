/**
 * Tests for meal planning nutrition data parsing
 * 
 * Tests that all required nutrition fields are correctly extracted from the HUDS API
 * and match the expected field names.
 * 
 * Run with: npm test -- mealPlanningData.test.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const hudsService = require('../services/hudsService');

// Helper to capitalize food names (same as frontend)
const capitalizeFoodName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to safely parse nutrition values (same as frontend)
const parseNutritionValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Process menu data the same way the frontend does
const processMenuData = (menuData, selectedMealType = null) => {
  const items = [];

  if (!menuData || menuData.length === 0) {
    return items;
  }

  menuData.forEach(location => {
    if (location.meals) {
      Object.values(location.meals).forEach(meal => {
        const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
        
        // Filter by selected meal type if provided
        if (selectedMealType) {
          const selected = selectedMealType.toLowerCase();
          const mealMatches = mealName === selected || 
                              mealName.includes(selected) || 
                              selected.includes(mealName);
          if (!mealMatches) return;
        }

        if (meal.categories) {
          Object.values(meal.categories).forEach(category => {
            if (category.recipes) {
              category.recipes.forEach(recipe => {
                items.push({
                  id: recipe.Recipe_Number,
                  name: capitalizeFoodName(recipe.Recipe_Name),
                  category: category.categoryName,
                  mealType: mealName,
                  // All required nutrition fields
                  calories: parseNutritionValue(recipe.Calories),
                  protein: parseNutritionValue(recipe.Protein),
                  caloriesFromFat: parseNutritionValue(recipe.Calories_From_Fat),
                  totalFat: parseNutritionValue(recipe.Total_Fat),
                  saturatedFat: parseNutritionValue(recipe.Sat_Fat),
                  transFat: parseNutritionValue(recipe.Trans_Fat),
                  cholesterol: parseNutritionValue(recipe.Cholesterol),
                  sodium: parseNutritionValue(recipe.Sodium),
                  totalCarbs: parseNutritionValue(recipe.Total_Carbohydrate),
                  dietaryFiber: parseNutritionValue(recipe.Dietary_Fiber),
                  sugars: parseNutritionValue(recipe.Sugars),
                  allergens: recipe.Allergens ? String(recipe.Allergens).trim() : '',
                });
              });
            }
          });
        }
      });
    }
  });

  return items;
};

describe('Meal Planning Nutrition Data', () => {
  // Skip tests if API key is not available
  const hasApiKey = !!process.env.HUDS_API_KEY;
  
  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('⚠️  HUDS_API_KEY not set. Skipping integration tests.');
    }
  });

  test('should extract all required nutrition fields from API', async () => {
    if (!hasApiKey) {
      return;
    }

    // Fetch menu data
    const menuData = await hudsService.getTodaysMenu('38');
    const items = processMenuData(menuData, 'breakfast');
    
    if (items.length === 0) {
      return;
    }

    // Required nutrition fields
    const requiredFields = {
      calories: 'number',
      protein: 'number',
      caloriesFromFat: 'number',
      totalFat: 'number',
      saturatedFat: 'number',
      transFat: 'number',
      cholesterol: 'number',
      sodium: 'number',
      totalCarbs: 'number',
      dietaryFiber: 'number',
      sugars: 'number',
      allergens: 'string'
    };

    // Verify all items have all required fields
    items.forEach(item => {
      Object.entries(requiredFields).forEach(([field, type]) => {
        expect(item).toHaveProperty(field);
        expect(typeof item[field]).toBe(type);
      });
    });
    // Check raw API to verify field names
    let sampleRecipe = null;
    menuData.forEach(location => {
      if (location.meals) {
        Object.values(location.meals).forEach(meal => {
          if (meal.mealName && meal.mealName.toLowerCase().includes('breakfast')) {
            if (meal.categories) {
              Object.values(meal.categories).forEach(category => {
                if (category.recipes && category.recipes.length > 0) {
                  sampleRecipe = category.recipes[0];
                  return;
                }
              });
            }
          }
        });
      }
    });

    if (sampleRecipe) {
      expect(sampleRecipe).toHaveProperty('Total_Carbohydrate');
      expect(sampleRecipe.Total_Carbohydrate).toBeDefined();
      
      const apiHasCarbs = parseNutritionValue(sampleRecipe.Total_Carbohydrate) > 0;
      if (apiHasCarbs) {
        // At least some items should have carbs > 0 (proving we're using correct field)
        const itemsWithCarbs = items.filter(item => item.totalCarbs > 0);
        expect(itemsWithCarbs.length).toBeGreaterThan(0);
      }
    }
  });
});

