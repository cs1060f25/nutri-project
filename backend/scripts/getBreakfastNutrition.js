/**
 * Script to get all breakfast items and nutrition facts for a location
 * 
 * Usage (from project root):
 *   node backend/scripts/getBreakfastNutrition.js [locationId]
 * 
 * Usage (from backend directory):
 *   node scripts/getBreakfastNutrition.js [locationId]
 * 
 * Usage (via npm script from backend directory):
 *   cd backend && npm run get-breakfast-nutrition [locationId]
 * 
 * Arguments:
 *   location    - Optional location ID (e.g., "38", "05", "07") or house name 
 *                 (e.g., "Dunster", "Dunster House", "Quincy"). Defaults to "38" if not provided.
 * 
 * Examples:
 *   node backend/scripts/getBreakfastNutrition.js
 *   node backend/scripts/getBreakfastNutrition.js 38
 *   node backend/scripts/getBreakfastNutrition.js Dunster
 *   node backend/scripts/getBreakfastNutrition.js "Dunster House"
 *   node backend/scripts/getBreakfastNutrition.js Quincy
 */

// Load environment variables from backend directory
const path = require('path');
const fs = require('fs');
// Try backend directory first, then project root as fallback
const backendEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');
const envPath = fs.existsSync(backendEnvPath) ? backendEnvPath : rootEnvPath;
require('dotenv').config({ path: envPath });

// Import hudsService
const hudsService = require('../src/services/hudsService');

// Helper to capitalize food names
const capitalizeFoodName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to safely parse nutrition values
const parseNutritionValue = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Get breakfast items for a location
const getBreakfastNutrition = async (locationInput = '38') => {
  try {
    console.log('='.repeat(80));
    console.log('Breakfast Nutrition Facts');
    console.log('='.repeat(80));
    console.log('');

    // Check for required environment variables
    if (!process.env.HUDS_API_KEY) {
      console.error('❌ Error: HUDS_API_KEY environment variable is not set.');
      console.error('');
      console.error('Environment check:');
      console.error(`  Checking backend/.env: ${fs.existsSync(backendEnvPath) ? 'Found' : 'Not found'}`);
      console.error(`  Checking root/.env: ${fs.existsSync(rootEnvPath) ? 'Found' : 'Not found'}`);
      console.error(`  Using .env file: ${envPath}`);
      console.error(`  HUDS_API_KEY set: ${process.env.HUDS_API_KEY ? 'Yes' : 'No'}`);
      console.error('');
      console.error('To fix this:');
      console.error('  1. Make sure you have a .env file in the backend directory (backend/.env)');
      console.error('  2. Add HUDS_API_KEY=your_api_key_here to the .env file');
      process.exit(1);
    }

    // Try to resolve location - could be a location ID or house name
    let locationId = locationInput;
    let locationName = locationInput;

    // If input looks like a house name (contains letters), try to find location ID
    if (/[a-zA-Z]/.test(locationInput)) {
      console.log(`Looking up location for: ${locationInput}...`);
      const locations = await hudsService.getLocations();
      
      // Normalize input (handle "Dunster", "Dunster House", etc.)
      const normalizedInput = locationInput.toLowerCase().replace(/\s+house\s*$/i, '').trim();
      
      // Find matching location
      const matchingLocation = locations.find(loc => {
        const locName = (loc.location_name || '').toLowerCase();
        const baseName = locName.replace(/\s+house\s*$/i, '').trim();
        return baseName === normalizedInput || locName.includes(normalizedInput);
      });
      
      if (matchingLocation) {
        locationId = matchingLocation.location_number;
        locationName = matchingLocation.location_name;
        console.log(`  ✓ Found: ${locationName} (Location ID: ${locationId})`);
      } else {
        console.log(`  ⚠ Could not find location for "${locationInput}"`);
        console.log(`  Available locations:`);
        locations.slice(0, 10).forEach(loc => {
          console.log(`    - ${loc.location_name} (ID: ${loc.location_number})`);
        });
        if (locations.length > 10) {
          console.log(`    ... and ${locations.length - 10} more`);
        }
        console.log(`  Using "${locationInput}" as location ID...`);
        locationName = locationInput;
      }
      console.log('');
    }

    console.log(`Location: ${locationName} (ID: ${locationId})`);
    console.log(`Meal Type: Breakfast`);
    console.log('');

    // Fetch today's menu
    console.log('Fetching today\'s menu...');
    const menuData = await hudsService.getTodaysMenu(locationId);
    console.log(`  ✓ Fetched menu data: ${menuData.length} location(s)`);
    console.log('');

    // Extract breakfast items
    const breakfastItems = [];

    menuData.forEach(location => {
      if (location.meals) {
        Object.values(location.meals).forEach(meal => {
          const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
          
          // Filter for breakfast
          if (mealName.includes('breakfast') || mealName === 'breakfast') {
            if (meal.categories) {
              Object.values(meal.categories).forEach(category => {
                if (category.recipes) {
                  category.recipes.forEach(recipe => {
                    breakfastItems.push({
                      id: recipe.Recipe_Number,
                      name: capitalizeFoodName(recipe.Recipe_Name),
                      category: category.categoryName,
                      location: location.locationName,
                      nutrition: {
                        calories: parseNutritionValue(recipe.Calories),
                        protein: parseNutritionValue(recipe.Protein),
                        carbs: parseNutritionValue(recipe.Total_Carbohydrate),
                        fat: parseNutritionValue(recipe.Total_Fat),
                      },
                      raw: {
                        Calories: recipe.Calories,
                        Protein: recipe.Protein,
                        Total_Carbohydrate: recipe.Total_Carbohydrate,
                        Total_Fat: recipe.Total_Fat,
                      }
                    });
                  });
                }
              });
            }
          }
        });
      }
    });

    if (breakfastItems.length === 0) {
      console.log('⚠ No breakfast items found for this location.');
      console.log('  Try a different location ID or check if breakfast is available today.');
      return;
    }

    // Display results
    console.log('='.repeat(80));
    console.log(`Breakfast Items (${breakfastItems.length} total)`);
    console.log('='.repeat(80));
    console.log('');

    // Group by category
    const byCategory = {};
    breakfastItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(item);
    });

    // Display by category
    Object.entries(byCategory)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([category, items]) => {
        console.log(`\n${category} (${items.length} items)`);
        console.log('-'.repeat(80));
        
        items.forEach((item, idx) => {
          console.log(`\n${idx + 1}. ${item.name}`);
          console.log(`   ID: ${item.id}`);
          console.log(`   Location: ${item.location}`);
          console.log(`   Nutrition Facts:`);
          console.log(`     Calories: ${item.nutrition.calories} cal`);
          console.log(`     Protein: ${item.nutrition.protein}g`);
          console.log(`     Carbs: ${item.nutrition.carbs}g`);
          console.log(`     Fat: ${item.nutrition.fat}g`);
          
          // Show raw values for debugging
          const hasAllData = item.raw.Calories !== null && item.raw.Calories !== undefined &&
                            item.raw.Protein !== null && item.raw.Protein !== undefined &&
                            item.raw.Total_Carbohydrateohydrate !== null && item.raw.Total_Carbohydrateohydrate !== undefined &&
                            item.raw.Total_Fat !== null && item.raw.Total_Fat !== undefined;
          
          if (!hasAllData) {
            console.log(`   Raw API values:`);
            if (item.raw.Calories !== null && item.raw.Calories !== undefined) {
              console.log(`     Calories: ${item.raw.Calories} (${typeof item.raw.Calories})`);
            } else {
              console.log(`     Calories: null/undefined`);
            }
            if (item.raw.Protein !== null && item.raw.Protein !== undefined) {
              console.log(`     Protein: ${item.raw.Protein} (${typeof item.raw.Protein})`);
            } else {
              console.log(`     Protein: null/undefined`);
            }
            if (item.raw.Total_Carbohydrateohydrate !== null && item.raw.Total_Carbohydrateohydrate !== undefined) {
              console.log(`     Total_Carbohydrateohydrate: ${item.raw.Total_Carbohydrateohydrate} (${typeof item.raw.Total_Carbohydrateohydrate})`);
            } else {
              console.log(`     Total_Carbohydrateohydrate: null/undefined`);
            }
            if (item.raw.Total_Fat !== null && item.raw.Total_Fat !== undefined) {
              console.log(`     Total_Fat: ${item.raw.Total_Fat} (${typeof item.raw.Total_Fat})`);
            } else {
              console.log(`     Total_Fat: null/undefined`);
            }
          }
        });
      });

    // Summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('Summary');
    console.log('='.repeat(80));
    console.log(`Total breakfast items: ${breakfastItems.length}`);
    console.log(`Categories: ${Object.keys(byCategory).length}`);
    console.log('');
    
    // Count items with complete nutrition data
    const withAllData = breakfastItems.filter(item => 
      item.nutrition.calories > 0 && 
      item.nutrition.protein > 0 && 
      item.nutrition.carbs > 0 && 
      item.nutrition.fat > 0
    ).length;
    
    const withCalories = breakfastItems.filter(item => item.nutrition.calories > 0).length;
    const withProtein = breakfastItems.filter(item => item.nutrition.protein > 0).length;
    const withCarbs = breakfastItems.filter(item => item.nutrition.carbs > 0).length;
    const withFat = breakfastItems.filter(item => item.nutrition.fat > 0).length;

    console.log('Nutrition Data Availability:');
    console.log(`  Items with calories: ${withCalories}/${breakfastItems.length} (${((withCalories / breakfastItems.length) * 100).toFixed(1)}%)`);
    console.log(`  Items with protein: ${withProtein}/${breakfastItems.length} (${((withProtein / breakfastItems.length) * 100).toFixed(1)}%)`);
    console.log(`  Items with carbs: ${withCarbs}/${breakfastItems.length} (${((withCarbs / breakfastItems.length) * 100).toFixed(1)}%)`);
    console.log(`  Items with fat: ${withFat}/${breakfastItems.length} (${((withFat / breakfastItems.length) * 100).toFixed(1)}%)`);
    console.log(`  Items with all four metrics: ${withAllData}/${breakfastItems.length} (${((withAllData / breakfastItems.length) * 100).toFixed(1)}%)`);
    console.log('');

    // Export as JSON option
    console.log('='.repeat(80));
    console.log('JSON Output (for programmatic use)');
    console.log('='.repeat(80));
    console.log(JSON.stringify(breakfastItems, null, 2));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error running script:');
    
    // Provide helpful error messages for common issues
    if (error.message && error.message.includes('401')) {
      console.error('Authentication failed (401 Unauthorized)');
      console.error('');
      console.error('This usually means:');
      console.error('  • The HUDS_API_KEY is missing or incorrect');
      console.error('  • The API key has expired or been revoked');
      console.error('');
      console.error('To fix:');
      console.error('  1. Verify your HUDS_API_KEY in the .env file');
      console.error('  2. Make sure the .env file is in the backend directory');
      console.error('  3. Check that the API key is valid and has not expired');
    } else if (error.message && error.message.includes('403')) {
      console.error('Access forbidden (403)');
      console.error('The API key may not have permission to access this resource.');
    } else if (error.message && error.message.includes('404')) {
      console.error('Resource not found (404)');
      console.error('The requested menu data may not be available for this location.');
    } else {
      console.error(error.message);
    }
    
    if (error.stack && process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
};

// Run the script
if (require.main === module) {
  const args = process.argv.slice(2);
  const locationId = args[0] || '38'; // Default to location 38
  getBreakfastNutrition(locationId);
}

module.exports = { getBreakfastNutrition };

