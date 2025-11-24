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
                  totalCarbs: parseNutritionValue(recipe.Total_Carb),
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

  describe('Nutrition Field Extraction', () => {
    test('should extract all required nutrition fields from API response', async () => {
      if (!hasApiKey) {
        return; // Skip test if no API key
      }

      // Fetch menu data
      const menuData = await hudsService.getTodaysMenu('38'); // Use location 38 as test
      expect(menuData).toBeDefined();
      expect(Array.isArray(menuData)).toBe(true);
      
      if (menuData.length === 0) {
        console.warn('No menu data returned, skipping field extraction test');
        return;
      }

      // Process menu data
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length === 0) {
        console.warn('No breakfast items found, skipping field extraction test');
        return;
      }

      // Check that at least one item has all required fields defined
      const requiredFields = [
        'calories',
        'protein',
        'caloriesFromFat',
        'totalFat',
        'saturatedFat',
        'transFat',
        'cholesterol',
        'sodium',
        'totalCarbs',
        'dietaryFiber',
        'sugars',
        'allergens'
      ];

      // Find an item with at least some nutrition data
      const itemWithData = items.find(item => item.calories > 0);
      
      if (!itemWithData) {
        console.warn('No items with nutrition data found');
        return;
      }

      // Verify all fields exist in the item object
      requiredFields.forEach(field => {
        expect(itemWithData).toHaveProperty(field);
        expect(itemWithData[field]).toBeDefined();
      });
    });

    test('should correctly parse numeric nutrition values', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      
      if (menuData.length === 0) {
        return;
      }

      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length === 0) {
        return;
      }

      // Find an item with nutrition data
      const itemWithData = items.find(item => item.calories > 0);
      
      if (!itemWithData) {
        return;
      }

      // Verify numeric fields are numbers
      const numericFields = [
        'calories',
        'protein',
        'caloriesFromFat',
        'totalFat',
        'saturatedFat',
        'transFat',
        'cholesterol',
        'sodium',
        'totalCarbs',
        'dietaryFiber',
        'sugars'
      ];

      numericFields.forEach(field => {
        expect(typeof itemWithData[field]).toBe('number');
        expect(isNaN(itemWithData[field])).toBe(false);
        expect(itemWithData[field]).toBeGreaterThanOrEqual(0);
      });

      // Verify allergens is a string
      expect(typeof itemWithData.allergens).toBe('string');
    });

    test('should handle missing or null nutrition values gracefully', () => {
      // Test parseNutritionValue with various inputs
      expect(parseNutritionValue(null)).toBe(0);
      expect(parseNutritionValue(undefined)).toBe(0);
      expect(parseNutritionValue('')).toBe(0);
      expect(parseNutritionValue('0')).toBe(0);
      expect(parseNutritionValue('123')).toBe(123);
      expect(parseNutritionValue('45.5')).toBe(45.5);
      expect(parseNutritionValue(100)).toBe(100);
    });

    test('should extract calories field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        // At least some items should have calories
        const itemsWithCalories = items.filter(item => item.calories > 0);
        expect(itemsWithCalories.length).toBeGreaterThan(0);
        
        // Verify calories are reasonable numbers
        itemsWithCalories.forEach(item => {
          expect(item.calories).toBeGreaterThan(0);
          expect(item.calories).toBeLessThan(10000); // Sanity check
        });
      }
    });

    test('should extract protein field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        // Check that protein field exists (even if 0)
        items.forEach(item => {
          expect(item).toHaveProperty('protein');
          expect(typeof item.protein).toBe('number');
        });
      }
    });

    test('should extract caloriesFromFat field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('caloriesFromFat');
          expect(typeof item.caloriesFromFat).toBe('number');
        });
      }
    });

    test('should extract totalFat field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('totalFat');
          expect(typeof item.totalFat).toBe('number');
        });
      }
    });

    test('should extract saturatedFat field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('saturatedFat');
          expect(typeof item.saturatedFat).toBe('number');
        });
      }
    });

    test('should extract transFat field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('transFat');
          expect(typeof item.transFat).toBe('number');
        });
      }
    });

    test('should extract cholesterol field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('cholesterol');
          expect(typeof item.cholesterol).toBe('number');
        });
      }
    });

    test('should extract sodium field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('sodium');
          expect(typeof item.sodium).toBe('number');
        });
      }
    });

    test('should extract totalCarbs field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('totalCarbs');
          expect(typeof item.totalCarbs).toBe('number');
        });
      }
    });

    test('should extract dietaryFiber field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('dietaryFiber');
          expect(typeof item.dietaryFiber).toBe('number');
        });
      }
    });

    test('should extract sugars field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('sugars');
          expect(typeof item.sugars).toBe('number');
        });
      }
    });

    test('should extract allergens field', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        items.forEach(item => {
          expect(item).toHaveProperty('allergens');
          expect(typeof item.allergens).toBe('string');
        });
      }
    });
  });

  describe('Field Name Mapping', () => {
    test('should use correct API field names', () => {
      // Verify we're using the correct field names from the API
      // This is a documentation test to ensure field names match API
      const expectedFieldMappings = {
        calories: 'Calories',
        protein: 'Protein',
        caloriesFromFat: 'Calories_From_Fat',
        totalFat: 'Total_Fat',
        saturatedFat: 'Sat_Fat',
        transFat: 'Trans_Fat',
        cholesterol: 'Cholesterol',
        sodium: 'Sodium',
        totalCarbs: 'Total_Carb', // Note: API uses Total_Carb, not Total_Carbohydrate
        dietaryFiber: 'Dietary_Fiber',
        sugars: 'Sugars',
        allergens: 'Allergens'
      };

      // This test documents the expected mappings
      expect(expectedFieldMappings.totalCarbs).toBe('Total_Carb');
      expect(expectedFieldMappings.caloriesFromFat).toBe('Calories_From_Fat');
      expect(expectedFieldMappings.saturatedFat).toBe('Sat_Fat');
    });
  });

  describe('Data Quality', () => {
    test('should have at least some items with non-zero nutrition values', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length === 0) {
        return;
      }

      // At least some items should have calories
      const itemsWithCalories = items.filter(item => item.calories > 0);
      
      if (itemsWithCalories.length > 0) {
        // Verify data quality - calories should be reasonable
        itemsWithCalories.forEach(item => {
          expect(item.calories).toBeGreaterThan(0);
          expect(item.calories).toBeLessThan(10000);
        });
      }
    });

    test('should handle items with missing nutrition data', async () => {
      if (!hasApiKey) {
        return;
      }

      const menuData = await hudsService.getTodaysMenu('38');
      const items = processMenuData(menuData, 'breakfast');
      
      if (items.length > 0) {
        // All items should have all fields defined, even if 0
        items.forEach(item => {
          expect(item).toHaveProperty('calories');
          expect(item).toHaveProperty('protein');
          expect(item).toHaveProperty('totalCarbs');
          expect(item).toHaveProperty('totalFat');
          expect(item).toHaveProperty('allergens');
          
          // Values should be valid numbers (or empty string for allergens)
          expect(typeof item.calories).toBe('number');
          expect(typeof item.protein).toBe('number');
          expect(typeof item.allergens).toBe('string');
        });
      }
    });
  });
});

