/**
 * Script to inspect all possible fields in the HUDS API response
 * 
 * This script fetches menu data and analyzes all fields present in the API response
 * to help identify what nutrition data is actually available.
 * 
 * Usage (from project root):
 *   node backend/scripts/inspectApiFields.js [locationId] [mealType]
 * 
 * Usage (from backend directory):
 *   node scripts/inspectApiFields.js [locationId] [mealType]
 * 
 * Arguments:
 *   locationId  - Optional location ID or house name (e.g., "38", "Dunster"). Defaults to "38"
 *   mealType    - Optional meal type filter ("breakfast", "lunch", "dinner"). Defaults to all meals
 * 
 * Examples:
 *   node backend/scripts/inspectApiFields.js
 *   node backend/scripts/inspectApiFields.js Dunster breakfast
 *   node backend/scripts/inspectApiFields.js 38 lunch
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

// Collect all unique fields from recipes
const collectAllFields = (menuData, mealTypeFilter = null) => {
  const allFields = new Set();
  const fieldPresence = {}; // Track how many items have each field
  const fieldExamples = {}; // Store example values for each field
  const fieldTypes = {}; // Track types of values
  const recipes = [];

  menuData.forEach(location => {
    if (location.meals) {
      Object.values(location.meals).forEach(meal => {
        const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
        
        // Filter by meal type if provided
        if (mealTypeFilter) {
          const filter = mealTypeFilter.toLowerCase();
          const mealMatches = mealName === filter || 
                              mealName.includes(filter) || 
                              filter.includes(mealName);
          if (!mealMatches) return;
        }

        if (meal.categories) {
          Object.values(meal.categories).forEach(category => {
            if (category.recipes) {
              category.recipes.forEach(recipe => {
                recipes.push(recipe);
                
                // Collect all fields from this recipe
                Object.keys(recipe).forEach(fieldName => {
                  allFields.add(fieldName);
                  
                  // Track presence
                  if (!fieldPresence[fieldName]) {
                    fieldPresence[fieldName] = 0;
                    fieldExamples[fieldName] = [];
                    fieldTypes[fieldName] = new Set();
                  }
                  
                  fieldPresence[fieldName]++;
                  
                  // Store example values (up to 3 different examples)
                  const value = recipe[fieldName];
                  const valueStr = String(value);
                  if (fieldExamples[fieldName].length < 3) {
                    if (!fieldExamples[fieldName].includes(valueStr)) {
                      fieldExamples[fieldName].push(valueStr);
                    }
                  }
                  
                  // Track type
                  if (value === null) {
                    fieldTypes[fieldName].add('null');
                  } else if (value === undefined) {
                    fieldTypes[fieldName].add('undefined');
                  } else {
                    fieldTypes[fieldName].add(typeof value);
                  }
                });
              });
            }
          });
        }
      });
    }
  });

  return {
    allFields: Array.from(allFields).sort(),
    fieldPresence,
    fieldExamples,
    fieldTypes,
    totalRecipes: recipes.length
  };
};

// Main function
const inspectApiFields = async () => {
  try {
    console.log('='.repeat(80));
    console.log('HUDS API Field Inspector');
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

    // Parse arguments
    const args = process.argv.slice(2);
    let locationInput = args[0] || '38';
    const mealTypeFilter = args[1] || null;

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
        console.log(`  Using "${locationInput}" as location ID...`);
        locationName = locationInput;
      }
      console.log('');
    }

    console.log(`Location: ${locationName} (ID: ${locationId})`);
    if (mealTypeFilter) {
      console.log(`Meal Type Filter: ${mealTypeFilter}`);
    } else {
      console.log(`Meal Type Filter: All meals`);
    }
    console.log('');

    // Fetch today's menu
    console.log('Fetching today\'s menu...');
    const menuData = await hudsService.getTodaysMenu(locationId);
    console.log(`  ✓ Fetched menu data: ${menuData.length} location(s)`);
    console.log('');

    // Collect all fields
    console.log('Analyzing API response structure...');
    const analysis = collectAllFields(menuData, mealTypeFilter);
    console.log(`  ✓ Analyzed ${analysis.totalRecipes} recipe(s)`);
    console.log('');

    if (analysis.totalRecipes === 0) {
      console.log('⚠ No recipes found with the specified filters.');
      console.log('  Try different location ID or meal type.');
      return;
    }

    // Display results
    console.log('='.repeat(80));
    console.log(`All Fields Found (${analysis.allFields.length} unique fields)`);
    console.log('='.repeat(80));
    console.log('');

    // Group fields by category (nutrition, identification, etc.)
    const nutritionFields = [];
    const identificationFields = [];
    const otherFields = [];

    analysis.allFields.forEach(field => {
      const lowerField = field.toLowerCase();
      if (lowerField.includes('calorie') || 
          lowerField.includes('protein') || 
          lowerField.includes('carb') || 
          lowerField.includes('fat') || 
          lowerField.includes('fiber') || 
          lowerField.includes('sugar') || 
          lowerField.includes('sodium') ||
          lowerField.includes('cholesterol') ||
          lowerField.includes('vitamin') ||
          lowerField.includes('mineral')) {
        nutritionFields.push(field);
      } else if (lowerField.includes('recipe') || 
                 lowerField.includes('name') || 
                 lowerField.includes('number') || 
                 lowerField.includes('id') ||
                 lowerField.includes('location') ||
                 lowerField.includes('meal') ||
                 lowerField.includes('category')) {
        identificationFields.push(field);
      } else {
        otherFields.push(field);
      }
    });

    // Display nutrition fields
    if (nutritionFields.length > 0) {
      console.log('📊 NUTRITION FIELDS:');
      console.log('-'.repeat(80));
      nutritionFields.forEach(field => {
        const presence = analysis.fieldPresence[field];
        const percentage = ((presence / analysis.totalRecipes) * 100).toFixed(1);
        const examples = analysis.fieldExamples[field].slice(0, 3);
        const types = Array.from(analysis.fieldTypes[field]).join(', ');
        
        console.log(`\n  ${field}`);
        console.log(`    Present in: ${presence}/${analysis.totalRecipes} recipes (${percentage}%)`);
        console.log(`    Type(s): ${types}`);
        console.log(`    Example values: ${examples.join(', ')}`);
      });
      console.log('');
    }

    // Display identification fields
    if (identificationFields.length > 0) {
      console.log('🆔 IDENTIFICATION FIELDS:');
      console.log('-'.repeat(80));
      identificationFields.forEach(field => {
        const presence = analysis.fieldPresence[field];
        const percentage = ((presence / analysis.totalRecipes) * 100).toFixed(1);
        const examples = analysis.fieldExamples[field].slice(0, 3);
        const types = Array.from(analysis.fieldTypes[field]).join(', ');
        
        console.log(`\n  ${field}`);
        console.log(`    Present in: ${presence}/${analysis.totalRecipes} recipes (${percentage}%)`);
        console.log(`    Type(s): ${types}`);
        console.log(`    Example values: ${examples.join(', ')}`);
      });
      console.log('');
    }

    // Display other fields
    if (otherFields.length > 0) {
      console.log('📋 OTHER FIELDS:');
      console.log('-'.repeat(80));
      otherFields.forEach(field => {
        const presence = analysis.fieldPresence[field];
        const percentage = ((presence / analysis.totalRecipes) * 100).toFixed(1);
        const examples = analysis.fieldExamples[field].slice(0, 3);
        const types = Array.from(analysis.fieldTypes[field]).join(', ');
        
        console.log(`\n  ${field}`);
        console.log(`    Present in: ${presence}/${analysis.totalRecipes} recipes (${percentage}%)`);
        console.log(`    Type(s): ${types}`);
        console.log(`    Example values: ${examples.join(', ')}`);
      });
      console.log('');
    }

    // Check specifically for carb-related fields
    console.log('='.repeat(80));
    console.log('CARBOHYDRATE FIELD ANALYSIS');
    console.log('='.repeat(80));
    const carbFields = analysis.allFields.filter(field => 
      field.toLowerCase().includes('carb')
    );
    
    if (carbFields.length > 0) {
      console.log(`\nFound ${carbFields.length} field(s) related to carbohydrates:\n`);
      carbFields.forEach(field => {
        const presence = analysis.fieldPresence[field];
        const percentage = ((presence / analysis.totalRecipes) * 100).toFixed(1);
        const examples = analysis.fieldExamples[field].slice(0, 5);
        console.log(`  ${field}:`);
        console.log(`    Present in: ${presence}/${analysis.totalRecipes} recipes (${percentage}%)`);
        console.log(`    Examples: ${examples.join(', ')}`);
      });
    } else {
      console.log('\n⚠ No fields found containing "carb" in the name.');
      console.log('  This suggests carbohydrate data may not be available in the API response.');
    }
    console.log('');

    // Show a sample recipe with all fields
    console.log('='.repeat(80));
    console.log('SAMPLE RECIPE (showing all fields)');
    console.log('='.repeat(80));
    
    // Find a recipe with the most fields
    let maxFields = 0;
    let sampleRecipe = null;
    
    menuData.forEach(location => {
      if (location.meals) {
        Object.values(location.meals).forEach(meal => {
          const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
          
          if (mealTypeFilter) {
            const filter = mealTypeFilter.toLowerCase();
            const mealMatches = mealName === filter || 
                                mealName.includes(filter) || 
                                filter.includes(mealName);
            if (!mealMatches) return;
          }

          if (meal.categories) {
            Object.values(meal.categories).forEach(category => {
              if (category.recipes) {
                category.recipes.forEach(recipe => {
                  const fieldCount = Object.keys(recipe).length;
                  if (fieldCount > maxFields) {
                    maxFields = fieldCount;
                    sampleRecipe = recipe;
                  }
                });
              }
            });
          }
        });
      }
    });

    if (sampleRecipe) {
      console.log('\nRecipe with most fields:');
      console.log(`  Name: ${sampleRecipe.Recipe_Name || 'N/A'}`);
      console.log(`  Total fields: ${Object.keys(sampleRecipe).length}`);
      console.log('\nAll fields and values:');
      Object.entries(sampleRecipe).forEach(([key, value]) => {
        const valueStr = value === null ? 'null' : 
                        value === undefined ? 'undefined' : 
                        String(value);
        const displayValue = valueStr.length > 50 ? valueStr.substring(0, 50) + '...' : valueStr;
        console.log(`    ${key}: ${displayValue} (${typeof value})`);
      });
    }
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total recipes analyzed: ${analysis.totalRecipes}`);
    console.log(`Total unique fields: ${analysis.allFields.length}`);
    console.log(`Nutrition fields: ${nutritionFields.length}`);
    console.log(`Identification fields: ${identificationFields.length}`);
    console.log(`Other fields: ${otherFields.length}`);
    console.log(`Carb-related fields: ${carbFields.length}`);
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
  inspectApiFields();
}

module.exports = { inspectApiFields, collectAllFields };

