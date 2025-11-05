import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysMenu, getLocations } from '../services/hudsService';
import { saveMealLog } from '../services/mealLogService';
import { getTodayProgress } from '../services/nutritionProgressService';
import MealLogger from '../components/MealLogger';
import NutritionProgress from '../components/NutritionProgress';
import './Home.css';

// Houses that share menus (11 houses, excluding Quincy)
const SHARED_MENU_HOUSES = [
  'Pforzheimer House',
  'Cabot House',
  'Currier House',
  'Kirkland House',
  'Leverett House',
  'Lowell House',
  'Eliot House',
  'Adams House',
  'Mather House',
  'Dunster House',
  'Winthrop House'
];

// All 12 houses (including Quincy which has its own menu)
const ALL_HOUSES = [
  ...SHARED_MENU_HOUSES,
  'Quincy House'
];

// Helper to ensure house names have "House" suffix
const normalizeHouseName = (houseName) => {
  const trimmed = houseName.trim();
  
  // Extract base name (remove "House" if present)
  const baseName = trimmed.replace(/\s+House\s*$/i, '').trim();
  
  // Check if this is one of the 12 houses by comparing base names
  const houseBaseNames = ALL_HOUSES.map(h => 
    h.replace(/\s+House\s*$/i, '').trim()
  );
  
  const isHouse = houseBaseNames.some(base => 
    base.toLowerCase() === baseName.toLowerCase()
  );
  
  // If it's a house and doesn't end with "House", add it
  if (isHouse && !trimmed.endsWith('House')) {
    return `${trimmed} House`;
  }
  
  return trimmed;
};

const Home = () => {
  const [menuData, setMenuData] = useState([]);
  const [expandedLocations, setExpandedLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [progressData, setProgressData] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);
  const { accessToken } = useAuth();

  // Fetch locations on mount and expand paired houses
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLocationsLoading(true);
        const locs = await getLocations();
        
        // Expand locations that contain multiple houses
        const expanded = [];
        locs.forEach(loc => {
          const locationName = loc.location_name;
          
          // Check if this location contains " and " (paired houses)
          if (locationName.includes(' and ')) {
            const houses = locationName.split(' and ').map(h => h.trim());
            houses.forEach(house => {
              expanded.push({
                location_number: loc.location_number,
                location_name: normalizeHouseName(house),
                original_name: locationName
              });
            });
          } else {
            expanded.push({
              location_number: loc.location_number,
              location_name: normalizeHouseName(locationName),
              original_name: locationName
            });
          }
        });
        
        setExpandedLocations(expanded);
      } catch (err) {
        console.error('Error fetching locations:', err);
      } finally {
        setLocationsLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // Helper to parse the unique location identifier
  const parseLocationId = useCallback((locationId) => {
    if (!locationId) return null;
    const parts = locationId.split('|');
    if (parts.length === 2) {
      return {
        location_number: parts[0],
        location_name: parts[1]
      };
    }
    return null;
  }, []);

  // Helper to find location object from unique ID
  const findLocationById = useCallback((locationId) => {
    if (!locationId) return null;
    const parsed = parseLocationId(locationId);
    if (!parsed) return null;
    
    return expandedLocations.find(
      loc => loc.location_number === parsed.location_number && 
             loc.location_name === parsed.location_name
    );
  }, [expandedLocations, parseLocationId]);

  // Fetch menu when location is selected
  useEffect(() => {
    const fetchMenu = async () => {
      if (!selectedLocation || expandedLocations.length === 0) {
        setMenuData([]);
        setSelectedMealType(''); // Reset meal type when location changes
        return;
      }

      try {
        setLoading(true);
        
        // Find the selected location details
        const selectedLocationObj = findLocationById(selectedLocation);
        
        if (!selectedLocationObj) {
          setMenuData([]);
          return;
        }

        // Check if this is one of the 11 shared-menu houses (excluding Quincy)
        const isSharedMenuHouse = SHARED_MENU_HOUSES.some(house => 
          selectedLocationObj.location_name.includes(house) || 
          selectedLocationObj.original_name.includes(house)
        );

        let allMenus = [];
        
        if (isSharedMenuHouse) {
          // For shared-menu houses, fetch menus for ALL 11 of them
          // Get unique location numbers for all 11 shared houses
          const sharedHouseLocationNumbers = new Set();
          
          expandedLocations.forEach(loc => {
            const isShared = SHARED_MENU_HOUSES.some(house => 
              loc.location_name.includes(house) || 
              loc.original_name.includes(house)
            );
            if (isShared) {
              sharedHouseLocationNumbers.add(loc.location_number);
            }
          });

          // Fetch menus for all shared houses in parallel
          const menuPromises = Array.from(sharedHouseLocationNumbers).map(locNum => 
            getTodaysMenu(locNum).catch(err => {
              console.warn(`Failed to fetch menu for location ${locNum}:`, err);
              return []; // Return empty array on error
            })
          );
          
          const menuResults = await Promise.all(menuPromises);
          
          // Flatten and aggregate all menus
          allMenus = menuResults.flat();
          
          // Remove duplicates by locationNumber (in case API returns same location multiple times)
          const uniqueMenus = new Map();
          allMenus.forEach(location => {
            const key = location.locationNumber;
            if (!uniqueMenus.has(key)) {
              uniqueMenus.set(key, location);
            } else {
              // Merge meals if location already exists
              const existing = uniqueMenus.get(key);
              if (location.meals && existing.meals) {
                existing.meals = { ...existing.meals, ...location.meals };
              }
            }
          });
          
          allMenus = Array.from(uniqueMenus.values());
        } else {
          // For non-shared houses (like Quincy), just fetch their specific menu
          const parsed = parseLocationId(selectedLocation);
          const locationNumber = parsed ? parsed.location_number : selectedLocation;
          const menu = await getTodaysMenu(locationNumber);
          allMenus = menu;
        }

        setMenuData(allMenus);
        setError(null);
        setSelectedMealType(''); // Reset meal type when new menu loads
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Unable to load menu. Please try again later.');
        setMenuData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [selectedLocation, expandedLocations, findLocationById, parseLocationId]);

  // Fetch nutrition progress
  useEffect(() => {
    const fetchProgress = async () => {
      if (!accessToken) return;
      
      try {
        setProgressLoading(true);
        const progress = await getTodayProgress(accessToken);
        setProgressData(progress);
      } catch (err) {
        console.error('Error fetching nutrition progress:', err);
        // Don't show error to user - just fail silently for progress
      } finally {
        setProgressLoading(false);
      }
    };

    fetchProgress();
  }, [accessToken]);

  const openNutritionModal = (recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeNutritionModal = () => {
    setSelectedRecipe(null);
  };

  const formatNutritionValue = (value) => {
    if (!value || value === '0' || value === 'N/A') return null;
    return value;
  };

  const handleSaveMeal = async (mealData) => {
    try {
      await saveMealLog(mealData, accessToken);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Refresh nutrition progress after saving a meal
      try {
        const progress = await getTodayProgress(accessToken);
        setProgressData(progress);
      } catch (err) {
        console.error('Error refreshing progress:', err);
      }
    } catch (err) {
      console.error('Error saving meal:', err);
      throw err;
    }
  };

  // Helper to normalize meal names (remove "Menu", trim, lowercase)
  const normalizeMealName = (mealName) => {
    return (mealName || '')
      .toLowerCase()
      .trim()
      .replace(/\s+menu\s*$/i, '') // Remove " Menu" or " menu" at the end
      .trim();
  };

  // Get available meal types for the selected location
  const getAvailableMealTypes = () => {
    if (!menuData.length || !selectedLocation) return [];

    // Find the selected location details
    const selectedLocationObj = findLocationById(selectedLocation);
    
    if (!selectedLocationObj) return [];

    const isSharedMenuHouse = SHARED_MENU_HOUSES.some(house => 
      selectedLocationObj.location_name.includes(house) || 
      selectedLocationObj.original_name.includes(house)
    );

    if (isSharedMenuHouse) {
      // For shared menu houses, get meals from ALL aggregated menus
      // Since we already fetched all 11 houses' menus, just aggregate from all menuData
      const allSharedHousesMeals = new Set();
      
      menuData.forEach(location => {
        if (location.meals) {
          Object.values(location.meals).forEach(meal => {
            const normalized = normalizeMealName(meal.mealName);
            allSharedHousesMeals.add(normalized);
          });
        }
      });

      // Convert to array and standardize names
      const meals = Array.from(allSharedHousesMeals);
      const standardMeals = [];
      
      if (meals.some(m => m === 'breakfast')) standardMeals.push('Breakfast');
      if (meals.some(m => m === 'lunch')) standardMeals.push('Lunch');
      if (meals.some(m => m === 'dinner')) standardMeals.push('Dinner');
      if (meals.some(m => m === 'brunch')) standardMeals.push('Brunch');
      
      return standardMeals;
    } else {
      // For non-shared houses, get meals from their specific menu
      const mealsSet = new Set();
      const parsed = parseLocationId(selectedLocation);
      const locationNumber = parsed ? parsed.location_number : null;
      
      menuData.forEach(location => {
        if (location.locationNumber === locationNumber && location.meals) {
          Object.values(location.meals).forEach(meal => {
            const normalized = normalizeMealName(meal.mealName);
            mealsSet.add(normalized);
          });
        }
      });

      const meals = Array.from(mealsSet);
      const standardMeals = [];
      
      if (meals.some(m => m === 'breakfast')) standardMeals.push('Breakfast');
      if (meals.some(m => m === 'lunch')) standardMeals.push('Lunch');
      if (meals.some(m => m === 'dinner')) standardMeals.push('Dinner');
      if (meals.some(m => m === 'brunch')) standardMeals.push('Brunch');
      
      return standardMeals.length > 0 ? standardMeals : [];
    }
  };

  // Filter menu data by selected meal type
  const getFilteredMenu = () => {
    if (!selectedMealType || !menuData.length || !selectedLocation) return [];
    
    const normalizedSelected = normalizeMealName(selectedMealType);
    
    // Find the selected location details
    const selectedLocationObj = findLocationById(selectedLocation);
    
    if (!selectedLocationObj) return [];
    
    const isSharedMenuHouse = SHARED_MENU_HOUSES.some(house => 
      selectedLocationObj.location_name.includes(house) || 
      selectedLocationObj.original_name.includes(house)
    );
    
    if (isSharedMenuHouse) {
      // For shared houses, aggregate all meals from all locations
      const aggregatedMeals = {};
      
      menuData.forEach(location => {
        if (location.meals) {
          Object.values(location.meals).forEach(meal => {
            const normalizedMealName = normalizeMealName(meal.mealName);
            if (normalizedMealName === normalizedSelected && meal.categories) {
              const mealKey = meal.mealNumber;
              
              // Initialize meal if not exists
              if (!aggregatedMeals[mealKey]) {
                aggregatedMeals[mealKey] = {
                  mealNumber: meal.mealNumber,
                  mealName: meal.mealName,
                  categories: {}
                };
              }
              
              // Aggregate categories and recipes
              Object.values(meal.categories).forEach(category => {
                const catKey = category.categoryNumber;
                
                if (!aggregatedMeals[mealKey].categories[catKey]) {
                  aggregatedMeals[mealKey].categories[catKey] = {
                    categoryNumber: category.categoryNumber,
                    categoryName: category.categoryName,
                    recipes: []
                  };
                }
                
                // Add recipes, avoiding duplicates by recipe ID
                if (category.recipes) {
                  category.recipes.forEach(recipe => {
                    const existingRecipes = aggregatedMeals[mealKey].categories[catKey].recipes;
                    if (!existingRecipes.some(r => r.ID === recipe.ID)) {
                      existingRecipes.push(recipe);
                    }
                  });
                }
              });
            }
          });
        }
      });
      
      // Return as a single location with the selected location's name
      if (Object.keys(aggregatedMeals).length > 0) {
        return [{
          locationNumber: selectedLocationObj.location_number,
          locationName: selectedLocationObj.location_name,
          meals: aggregatedMeals
        }];
      }
      
      return [];
    } else {
      // For non-shared houses, use the existing logic
      return menuData.map(location => {
        const filteredMeals = {};
        if (location.meals) {
          Object.entries(location.meals).forEach(([key, meal]) => {
            const normalizedMealName = normalizeMealName(meal.mealName);
            if (normalizedMealName === normalizedSelected) {
              filteredMeals[key] = meal;
            }
          });
        }
        return {
          ...location,
          meals: filteredMeals
        };
      }).filter(location => Object.keys(location.meals).length > 0);
    }
  };

  const filteredMenu = getFilteredMenu();

  return (
    <div className="home-page">
      {saveSuccess && (
        <div className="success-banner">
          <span className="success-icon">✓</span> Meal logged successfully!
        </div>
      )}

      <button
        className="fab-button"
        onClick={() => setIsMealLoggerOpen(true)}
        title="Log a meal"
        aria-label="Log a meal"
      >
        <svg className="fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <MealLogger
        isOpen={isMealLoggerOpen}
        onClose={() => setIsMealLoggerOpen(false)}
        onSave={handleSaveMeal}
      />

      <div className="home-container">
        {/* Date Header */}
        <div className="date-header">
          <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="date-text">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric'
            })}
          </span>
        </div>

        {/* Main Content Grid */}
        <div className="top-cards-row">
          {/* Nutrition Progress Card */}
          {!progressLoading && (
            <div className="progress-card-wrapper">
              <NutritionProgress progressData={progressData} />
            </div>
          )}

          {/* Menu Selector Card */}
          <div className="menu-selector-card">
            <div className="card-header">
              <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <h2 className="card-title">Explore Menu</h2>
            </div>
            
            <div className="selector-content">
              <div className="selector-group">
                <label htmlFor="location-select" className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Dining Hall
                </label>
                <select
                  id="location-select"
                  className="selector-input"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  disabled={locationsLoading}
                >
                  <option value="">Select a dining hall</option>
                  {expandedLocations.map((loc, idx) => {
                    // Create unique identifier for each location
                    const uniqueId = `${loc.location_number}|${loc.location_name}`;
                    return (
                      <option key={`${loc.location_number}-${idx}`} value={uniqueId}>
                        {loc.location_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="selector-group">
                <label htmlFor="meal-select" className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Meal Time
                </label>
                <select
                  id="meal-select"
                  className="selector-input"
                  value={selectedMealType}
                  onChange={(e) => setSelectedMealType(e.target.value)}
                  disabled={!selectedLocation || loading}
                >
                  <option value="">Select a meal</option>
                  {getAvailableMealTypes().map(mealType => (
                    <option key={mealType} value={mealType}>
                      {mealType}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedLocation && (
                <div className="selector-hint">
                  <svg className="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <p>Select a dining hall to view available meal times</p>
                </div>
              )}
              
              {selectedLocation && !loading && !selectedMealType && getAvailableMealTypes().length === 0 && (
                <div className="selector-hint">
                  <svg className="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <p>No meals available for this dining hall today</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Results Section */}
        <div className="menu-results-section">
          {/* Only show menu results if a meal type is selected */}
          {error && selectedLocation && (
            <div className="menu-card error-card">
              <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="error-text">{error}</p>
            </div>
          )}

          {!error && selectedLocation && selectedMealType && filteredMenu.length === 0 && (
            <div className="menu-card empty-card">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <p className="empty-text">No menu items available for this selection</p>
            </div>
          )}

          {!error && selectedMealType && filteredMenu.length > 0 && filteredMenu.map(location => (
            <div key={location.locationNumber} className="menu-card">
              <div className="menu-card-header">
                <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
                <div>
                  <h3 className="menu-location-name">{location.locationName}</h3>
                  <span className="menu-meal-badge">{selectedMealType}</span>
                </div>
              </div>
              
              {location.meals && Object.values(location.meals).map(meal => (
                <div key={meal.mealNumber} className="menu-content">
                  {meal.categories && Object.values(meal.categories).map(category => (
                    <div key={category.categoryNumber} className="category-section">
                      <h4 className="category-name">{category.categoryName}</h4>
                      
                      <div className="recipes-grid">
                        {category.recipes && category.recipes.map(recipe => (
                          <div 
                            key={recipe.ID} 
                            className="recipe-card"
                            onClick={() => openNutritionModal(recipe)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && openNutritionModal(recipe)}
                          >
                            <div className="recipe-header">
                              <h5 className="recipe-name">{recipe.Recipe_Print_As_Name || recipe.Recipe_Name}</h5>
                              {recipe.Recipe_Web_Codes && (
                                <div className="recipe-badges">
                                  {recipe.Recipe_Web_Codes.split(' ').filter(code => code).map(code => (
                                    <span key={code} className="recipe-badge">{code}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            <div className="recipe-quick-info">
                              <span className="calorie-badge">
                                <svg className="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                {recipe.Calories} cal
                              </span>
                              {recipe.Allergens && recipe.Allergens.trim() && (
                                <span className="allergen-indicator" title={`Contains: ${recipe.Allergens}`}>
                                  <svg className="allergen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                                    <line x1="12" y1="9" x2="12" y2="13"/>
                                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                                  </svg>
                                  Allergens
                                </span>
                              )}
                            </div>
                            
                            <div className="recipe-footer">
                              <span className="view-nutrition">
                                View Details
                                <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Nutrition Facts Modal */}
      {selectedRecipe && (
        <div className="modal-overlay" onClick={closeNutritionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeNutritionModal}>&times;</button>
            
            <h2 className="modal-title">{selectedRecipe.Recipe_Print_As_Name || selectedRecipe.Recipe_Name}</h2>
            
            {selectedRecipe.Recipe_Product_Information && (
              <p className="recipe-description">{selectedRecipe.Recipe_Product_Information}</p>
            )}

            <div className="nutrition-facts">
              <div className="nutrition-header">
                <h3>Nutrition Facts</h3>
                <p className="serving-size">Serving Size: {selectedRecipe.Serving_Size}</p>
              </div>

              <div className="nutrition-main">
                <div className="nutrition-row calories-row">
                  <span className="nutrition-label">Calories</span>
                  <span className="nutrition-value">{selectedRecipe.Calories}</span>
                </div>
                {formatNutritionValue(selectedRecipe.Calories_From_Fat) && (
                  <div className="nutrition-subrow">
                    <span className="nutrition-label">Calories from Fat</span>
                    <span className="nutrition-value">{selectedRecipe.Calories_From_Fat}</span>
                  </div>
                )}
              </div>

              <div className="nutrition-section">
                <div className="nutrition-row">
                  <span className="nutrition-label">Total Fat {selectedRecipe.Total_Fat}</span>
                  <span className="nutrition-value">{selectedRecipe.Total_Fat_DV}%</span>
                </div>
                {formatNutritionValue(selectedRecipe.Sat_Fat) && (
                  <div className="nutrition-subrow">
                    <span className="nutrition-label">Saturated Fat {selectedRecipe.Sat_Fat}</span>
                    <span className="nutrition-value">{selectedRecipe.Sat_Fat_DV}%</span>
                  </div>
                )}
                {formatNutritionValue(selectedRecipe.Trans_Fat) && (
                  <div className="nutrition-subrow">
                    <span className="nutrition-label">Trans Fat {selectedRecipe.Trans_Fat}</span>
                  </div>
                )}
              </div>

              <div className="nutrition-section">
                <div className="nutrition-row">
                  <span className="nutrition-label">Cholesterol {selectedRecipe.Cholesterol}</span>
                  <span className="nutrition-value">{selectedRecipe.Cholesterol_DV}%</span>
                </div>
                <div className="nutrition-row">
                  <span className="nutrition-label">Sodium {selectedRecipe.Sodium}</span>
                  <span className="nutrition-value">{selectedRecipe.Sodium_DV}%</span>
                </div>
                <div className="nutrition-row">
                  <span className="nutrition-label">Total Carbohydrate {selectedRecipe.Total_Carb}</span>
                  <span className="nutrition-value">{selectedRecipe.Total_Carb_DV}%</span>
                </div>
                {formatNutritionValue(selectedRecipe.Dietary_Fiber) && (
                  <div className="nutrition-subrow">
                    <span className="nutrition-label">Dietary Fiber {selectedRecipe.Dietary_Fiber}</span>
                    <span className="nutrition-value">{selectedRecipe.Dietary_Fiber_DV}%</span>
                  </div>
                )}
                {formatNutritionValue(selectedRecipe.Sugars) && (
                  <div className="nutrition-subrow">
                    <span className="nutrition-label">Sugars {selectedRecipe.Sugars}</span>
                  </div>
                )}
                <div className="nutrition-row">
                  <span className="nutrition-label">Protein {selectedRecipe.Protein}</span>
                  <span className="nutrition-value">{selectedRecipe.Protein_DV}%</span>
                </div>
              </div>

              {selectedRecipe.Allergens && selectedRecipe.Allergens.trim() && (
                <div className="allergen-section">
                  <h4>Allergens</h4>
                  <p className="allergen-list">{selectedRecipe.Allergens}</p>
                </div>
              )}

              {selectedRecipe.Ingredient_List && (
                <div className="ingredient-section">
                  <h4>Ingredients</h4>
                  <p className="ingredient-list">{selectedRecipe.Ingredient_List}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
