import React, { useState, useEffect, useCallback } from 'react';
import { getTodaysMenu, getLocations } from '../services/hudsService';
import './MealLogger.css';

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

const MealLogger = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(1); // 1: metadata, 2: select items
  const [expandedLocations, setExpandedLocations] = useState([]);
  const [menuData, setMenuData] = useState([]);
  
  // Helper to normalize meal names (remove "Menu", trim, lowercase)
  const normalizeMealName = (mealName) => {
    return (mealName || '')
      .toLowerCase()
      .trim()
      .replace(/\s+menu\s*$/i, '') // Remove " Menu" or " menu" at the end
      .trim();
  };
  
  // Form state - ALWAYS use today's date (HUDS API only provides current data)
  const today = new Date().toISOString().split('T')[0];
  const [mealTime, setMealTime] = useState(new Date().toTimeString().slice(0, 5)); // HH:MM format
  const [mealType, setMealType] = useState('');
  const [mealName, setMealName] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Load locations on mount and expand paired houses
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
        
        // Set default location if none selected
        if (expanded.length > 0 && !selectedLocation) {
          const defaultLoc = expanded[0];
          const uniqueId = `${defaultLoc.location_number}|${defaultLoc.location_name}`;
          setSelectedLocation(uniqueId);
          setSelectedLocationName(defaultLoc.location_name);
        }
      } catch (err) {
        console.error('Error loading locations:', err);
        setError('Failed to load dining hall locations');
      } finally {
        setLocationsLoading(false);
      }
    };
    
    if (isOpen) {
      fetchLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      
      if (meals.some(m => m === 'breakfast')) standardMeals.push({ value: 'breakfast', label: 'Breakfast' });
      if (meals.some(m => m === 'lunch')) standardMeals.push({ value: 'lunch', label: 'Lunch' });
      if (meals.some(m => m === 'dinner')) standardMeals.push({ value: 'dinner', label: 'Dinner' });
      if (meals.some(m => m === 'brunch')) standardMeals.push({ value: 'brunch', label: 'Brunch' });
      
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
      
      if (meals.some(m => m === 'breakfast')) standardMeals.push({ value: 'breakfast', label: 'Breakfast' });
      if (meals.some(m => m === 'lunch')) standardMeals.push({ value: 'lunch', label: 'Lunch' });
      if (meals.some(m => m === 'dinner')) standardMeals.push({ value: 'dinner', label: 'Dinner' });
      if (meals.some(m => m === 'brunch')) standardMeals.push({ value: 'brunch', label: 'Brunch' });
      
      return standardMeals;
    }
  };

  // Load menu when location changes (fetch for step 2 or when selecting meal type)
  useEffect(() => {
    const fetchMenu = async () => {
      if (!selectedLocation || expandedLocations.length === 0) {
        setMenuData([]);
        setMealType('');
        setMealName('');
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
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Failed to load today\'s menu. Make sure HUDS has published the menu for today.');
        setMenuData([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && selectedLocation) {
      fetchMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation, expandedLocations, isOpen, findLocationById, parseLocationId]);

  // Auto-select first available meal type when menu data loads
  useEffect(() => {
    if (menuData.length > 0 && !mealType) {
      const availableMeals = getAvailableMealTypes();
      if (availableMeals.length > 0) {
        setMealType(availableMeals[0].value);
        setMealName(availableMeals[0].label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuData]);

  const handleNext = () => {
    if (!selectedLocation) {
      setError('Please select a dining hall');
      return;
    }
    if (!mealType) {
      setError('Please select a meal type');
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const toggleItem = (recipe) => {
    const existingIndex = selectedItems.findIndex(item => item.recipeId === recipe.ID);
    
    if (existingIndex >= 0) {
      // Remove item
      setSelectedItems(selectedItems.filter((_, index) => index !== existingIndex));
    } else {
      // Add item with default quantity of 1
      setSelectedItems([...selectedItems, {
        recipeId: recipe.ID,
        recipeName: recipe.Recipe_Print_As_Name || recipe.Recipe_Name,
        quantity: 1,
        servingSize: recipe.Serving_Size || '1 serving',
        calories: recipe.Calories || '0',
        totalFat: recipe.Total_Fat || '0g',
        saturatedFat: recipe.Sat_Fat || '0g',
        transFat: recipe.Trans_Fat || '0g',
        cholesterol: recipe.Cholesterol || '0mg',
        sodium: recipe.Sodium || '0mg',
        totalCarbs: recipe.Total_Carb || '0g',
        dietaryFiber: recipe.Dietary_Fiber || '0g',
        sugars: recipe.Sugars || '0g',
        protein: recipe.Protein || '0g',
        webCodes: recipe.Recipe_Web_Codes || '',
        allergens: recipe.Allergens || '',
      }]);
    }
  };

  const updateQuantity = (recipeId, newQuantity) => {
    const qty = parseFloat(newQuantity) || 0;
    if (qty <= 0) {
      // Remove item if quantity is 0 or less
      setSelectedItems(selectedItems.filter(item => item.recipeId !== recipeId));
    } else {
      setSelectedItems(selectedItems.map(item =>
        item.recipeId === recipeId ? { ...item, quantity: qty } : item
      ));
    }
  };

  const calculateTotals = () => {
    const totals = {
      calories: 0,
      totalFat: 0,
      saturatedFat: 0,
      transFat: 0,
      cholesterol: 0,
      sodium: 0,
      totalCarbs: 0,
      dietaryFiber: 0,
      sugars: 0,
      protein: 0,
    };

    selectedItems.forEach(item => {
      const qty = item.quantity || 1;
      const parseNutrient = (value) => {
        if (!value) return 0;
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      totals.calories += parseNutrient(item.calories) * qty;
      totals.totalFat += parseNutrient(item.totalFat) * qty;
      totals.saturatedFat += parseNutrient(item.saturatedFat) * qty;
      totals.transFat += parseNutrient(item.transFat) * qty;
      totals.cholesterol += parseNutrient(item.cholesterol) * qty;
      totals.sodium += parseNutrient(item.sodium) * qty;
      totals.totalCarbs += parseNutrient(item.totalCarbs || item.totalCarb) * qty;
      totals.dietaryFiber += parseNutrient(item.dietaryFiber) * qty;
      totals.sugars += parseNutrient(item.sugars) * qty;
      totals.protein += parseNutrient(item.protein) * qty;
    });

    return {
      calories: Math.round(totals.calories),
      totalFat: totals.totalFat.toFixed(1),
      saturatedFat: totals.saturatedFat.toFixed(1),
      transFat: totals.transFat.toFixed(1),
      cholesterol: totals.cholesterol.toFixed(1),
      sodium: totals.sodium.toFixed(1),
      totalCarbs: totals.totalCarbs.toFixed(1),
      dietaryFiber: totals.dietaryFiber.toFixed(1),
      sugars: totals.sugars.toFixed(1),
      protein: totals.protein.toFixed(1),
    };
  };

  const handleSave = async () => {
    if (selectedItems.length === 0) {
      setError('Please select at least one item');
      return;
    }

    try {
      setLoading(true);
      
      // Combine today's date and selected time into a single timestamp
      const timestamp = new Date(`${today}T${mealTime}`).toISOString();
      
      // Parse location ID to get the actual location number
      const parsed = parseLocationId(selectedLocation);
      const locationNumber = parsed ? parsed.location_number : selectedLocation;
      
      // Filter out any items with invalid quantities (safety check)
      const validItems = selectedItems.filter(item => item.quantity > 0);
      
      if (validItems.length === 0) {
        setError('Please select at least one item with a valid quantity');
        setLoading(false);
        return;
      }
      
      await onSave({
        mealDate: today,
        mealType,
        mealName,
        timestamp,
        locationId: locationNumber,
        locationName: selectedLocationName,
        items: validItems,
      });
      
      // Reset form
      setStep(1);
      setSelectedItems([]);
      setSearchTerm('');
      setMealType('');
      setMealName('');
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
      setError('Failed to save meal log');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRecipes = () => {
    if (!menuData.length || !mealType) return [];
    
    const normalizedSelected = normalizeMealName(mealType);
    
    // Get recipes for selected meal type
    const recipes = [];
    menuData.forEach(location => {
      if (location.meals) {
        Object.values(location.meals).forEach(meal => {
          const normalizedMealName = normalizeMealName(meal.mealName);
          if (normalizedMealName === normalizedSelected && meal.categories) {
            Object.values(meal.categories).forEach(category => {
              if (category.recipes) {
                recipes.push(...category.recipes);
              }
            });
          }
        });
      }
    });

    // Remove duplicates by recipe ID
    const uniqueRecipes = new Map();
    recipes.forEach(recipe => {
      if (!uniqueRecipes.has(recipe.ID)) {
        uniqueRecipes.set(recipe.ID, recipe);
      }
    });

    const uniqueRecipesArray = Array.from(uniqueRecipes.values());

    // Filter by search term
    if (searchTerm) {
      return uniqueRecipesArray.filter(recipe =>
        (recipe.Recipe_Print_As_Name || recipe.Recipe_Name).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return uniqueRecipesArray;
  };

  const handleLocationChange = (locationId) => {
    const loc = findLocationById(locationId);
    setSelectedLocation(locationId);
    setSelectedLocationName(loc ? loc.location_name : '');
    // Reset meal type when location changes
    setMealType('');
    setMealName('');
  };

  const handleMealTypeChange = (mealTypeValue) => {
    setMealType(mealTypeValue);
    const availableMeals = getAvailableMealTypes();
    const mealTypeObj = availableMeals.find(m => m.value === mealTypeValue);
    setMealName(mealTypeObj ? mealTypeObj.label : mealTypeValue);
  };

  if (!isOpen) return null;

  const totals = calculateTotals();
  const filteredRecipes = getFilteredRecipes();

  return (
    <div className="meal-logger-overlay" onClick={onClose}>
      <div className="meal-logger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meal-logger-header">
          <h2>Log a Meal</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {error && (
          <div className="meal-logger-error">
            {error}
            <button onClick={() => setError(null)}>&times;</button>
          </div>
        )}

        {step === 1 && (
          <div className="meal-logger-step">
            <h3>Log Today's Meal</h3>
            <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1rem' }}>
              📅 {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <p style={{ fontSize: '0.85em', color: '#888', marginBottom: '1.5rem', fontStyle: 'italic' }}>
              Note: You can only log meals from today's menu (HUDS API limitation)
            </p>

            <div className="form-group">
              <label htmlFor="mealTime">Time</label>
              <input
                type="time"
                id="mealTime"
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Dining Hall</label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
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

            <div className="form-group">
              <label htmlFor="mealType">Meal Type</label>
              <select
                id="mealType"
                value={mealType}
                onChange={(e) => handleMealTypeChange(e.target.value)}
                disabled={!selectedLocation || loading}
              >
                <option value="">Select a meal</option>
                {getAvailableMealTypes().map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="meal-logger-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={handleNext}
                disabled={!selectedLocation || !mealType}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="meal-logger-step">
            <div className="step-header">
              <button className="btn-back" onClick={handleBack}>← Back</button>
              <h3>Select Items ({selectedItems.length} selected)</h3>
            </div>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="loading-state">Loading menu...</div>
            ) : (
              <>
                <div className="recipes-list">
                  {filteredRecipes.length === 0 ? (
                    <div className="no-results">No items found</div>
                  ) : (
                    filteredRecipes.map(recipe => {
                      const isSelected = selectedItems.some(item => item.recipeId === recipe.ID);
                      
                      return (
                        <div
                          key={recipe.ID}
                          className={`recipe-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleItem(recipe)}
                        >
                          <div className="recipe-item-info">
                            <div className="recipe-item-name">
                              {recipe.Recipe_Print_As_Name || recipe.Recipe_Name}
                            </div>
                            <div className="recipe-item-meta">
                              {recipe.Calories} cal • {recipe.Serving_Size}
                            </div>
                          </div>
                          <div className="recipe-item-check">
                            {isSelected && '✓'}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {selectedItems.length > 0 && (
                  <div className="selected-items-panel">
                    <h4>Selected Items</h4>
                    {selectedItems.map(item => (
                      <div key={item.recipeId} className="selected-item">
                        <div className="selected-item-name">{item.recipeName}</div>
                        <div className="selected-item-quantity">
                          <label>Servings:</label>
                          <input
                            type="number"
                            min="0.25"
                            max="20"
                            step="0.25"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.recipeId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="totals-summary">
                      <h5>Nutritional Totals</h5>
                      <div className="total-row">
                        <span>Calories:</span>
                        <strong>{totals.calories}</strong>
                      </div>
                      <div className="total-row">
                        <span>Total Fat:</span>
                        <strong>{totals.totalFat}g</strong>
                      </div>
                      <div className="total-row">
                        <span>Protein:</span>
                        <strong>{totals.protein}g</strong>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="meal-logger-actions">
              <button className="btn-secondary" onClick={handleBack}>Back</button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={selectedItems.length === 0 || loading}
              >
                {loading ? 'Saving...' : `Save Meal (${selectedItems.length} items)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealLogger;

