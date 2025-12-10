import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysMenu, getLocations } from '../services/hudsService';
import { saveMealLog } from '../services/mealLogService';
import { getTodayProgress } from '../services/nutritionProgressService';
import { generateMealSuggestion } from '../services/mealSuggestionService';
import MealLogger from '../components/MealLogger';
import NutritionProgress from '../components/NutritionProgress';
import CustomSelect from '../components/CustomSelect';
import { HARVARD_DINING_HALLS } from '../config/diningHalls';
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

// All 13 standard dining halls (including Annenberg)
const ALL_HOUSES = HARVARD_DINING_HALLS;

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
  const [suggestionLocation, setSuggestionLocation] = useState('');
  const [suggestionMealType, setSuggestionMealType] = useState('');
  const [suggestionMenuData, setSuggestionMenuData] = useState([]);
  const [suggestionMenuLoading, setSuggestionMenuLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState(null);
  const [suggestionData, setSuggestionData] = useState(null);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [hypotheticalMeals, setHypotheticalMeals] = useState([]);
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
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
        
        // Create a map of existing locations by name for quick lookup
        const existingByName = new Map();
        expanded.forEach(loc => {
          existingByName.set(loc.location_name.toLowerCase(), loc);
        });
        
        // Ensure all standard dining halls are present
        // Use a shared location number for houses that share menus
        const sharedMenuLocationNumber = expanded.find(loc => 
          SHARED_MENU_HOUSES.some(h => loc.location_name.toLowerCase() === h.toLowerCase())
        )?.location_number || '05'; // Default to a common location number
        
        const annenbergLocation = expanded.find(loc => 
          loc.location_name.toLowerCase().includes('annenberg')
        )?.location_number || '03';
        
        const quincyLocation = expanded.find(loc => 
          loc.location_name.toLowerCase().includes('quincy')
        )?.location_number || '30';
        
        const allHalls = HARVARD_DINING_HALLS.map(hallName => {
          const existing = existingByName.get(hallName.toLowerCase());
          if (existing) {
            return existing;
          }
          // Create entry for missing hall
          let locationNumber = sharedMenuLocationNumber;
          if (hallName === 'Annenberg Hall') {
            locationNumber = annenbergLocation;
          } else if (hallName === 'Quincy House') {
            locationNumber = quincyLocation;
          }
          return {
            location_number: locationNumber,
            location_name: hallName,
            original_name: hallName
          };
        });
        
        // Sort alphabetically
        allHalls.sort((a, b) => a.location_name.localeCompare(b.location_name));
        
        setExpandedLocations(allHalls);
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

  // Fetch menu for suggestion location when it's selected
  useEffect(() => {
    const fetchSuggestionMenu = async () => {
      if (!suggestionLocation || expandedLocations.length === 0) {
        setSuggestionMenuData([]);
        setSuggestionMealType(''); // Reset meal type when location changes
        return;
      }

      try {
        setSuggestionMenuLoading(true);
        
        // Find the selected location details
        const selectedLocationObj = findLocationById(suggestionLocation);
        
        if (!selectedLocationObj) {
          setSuggestionMenuData([]);
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
          
          // Remove duplicates by locationNumber
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
          const parsed = parseLocationId(suggestionLocation);
          const locationNumber = parsed ? parsed.location_number : suggestionLocation;
          const menu = await getTodaysMenu(locationNumber);
          allMenus = menu;
        }

        setSuggestionMenuData(allMenus);
        setSuggestionMealType(''); // Reset meal type when new menu loads
      } catch (err) {
        console.error('Error fetching suggestion menu:', err);
        setSuggestionMenuData([]);
      } finally {
        setSuggestionMenuLoading(false);
      }
    };

    fetchSuggestionMenu();
  }, [suggestionLocation, expandedLocations, findLocationById, parseLocationId]);

  // Fetch nutrition progress
  const fetchProgress = useCallback(async () => {
      if (!accessToken) return;
      
      try {
        setProgressLoading(true);
        // Add a cache-busting parameter to ensure fresh data
        const progress = await getTodayProgress(accessToken);
        setProgressData(progress);
      } catch (err) {
        console.error('Error fetching nutrition progress:', err);
        // Don't show error to user - just fail silently for progress
      } finally {
        setProgressLoading(false);
      }
  }, [accessToken]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Listen for meal log updates (from post creation, etc.)
  useEffect(() => {
    const handleMealLogUpdate = () => {
      fetchProgress();
    };

    window.addEventListener('mealLogUpdated', handleMealLogUpdate);
    return () => {
      window.removeEventListener('mealLogUpdated', handleMealLogUpdate);
    };
  }, [fetchProgress]);

  // Refresh progress when page becomes visible (user returns to tab/window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && accessToken) {
        fetchProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchProgress, accessToken]);

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
      
      // Dispatch event to notify other components (Insights, MealPlanning) to refresh
      window.dispatchEvent(new CustomEvent('mealLogUpdated'));
      
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

  // Filter menu items by search query
  const getSearchFilteredMenu = () => {
    if (!menuSearchQuery.trim()) return filteredMenu;
    
    const query = menuSearchQuery.toLowerCase().trim();
    
    return filteredMenu.map(location => {
      const filteredMeals = {};
      
      if (location.meals) {
        Object.entries(location.meals).forEach(([mealKey, meal]) => {
          const filteredCategories = {};
          
          if (meal.categories) {
            Object.entries(meal.categories).forEach(([catKey, category]) => {
              const matchingRecipes = category.recipes?.filter(recipe => {
                const name = (recipe.Recipe_Print_As_Name || recipe.Recipe_Name || '').toLowerCase();
                return name.includes(query);
              }) || [];
              
              if (matchingRecipes.length > 0) {
                filteredCategories[catKey] = {
                  ...category,
                  recipes: matchingRecipes
                };
              }
            });
          }
          
          if (Object.keys(filteredCategories).length > 0) {
            filteredMeals[mealKey] = {
              ...meal,
              categories: filteredCategories
            };
          }
        });
      }
      
      return {
        ...location,
        meals: filteredMeals
      };
    }).filter(location => Object.keys(location.meals).length > 0);
  };

  const searchFilteredMenu = getSearchFilteredMenu();

  // Get available meal types for suggestion card
  const getSuggestionMealTypes = () => {
    if (!suggestionLocation || !suggestionMenuData.length) return [];

    // Find the selected location details
    const selectedLocationObj = findLocationById(suggestionLocation);
    
    if (!selectedLocationObj) return [];

    const isSharedMenuHouse = SHARED_MENU_HOUSES.some(house => 
      selectedLocationObj.location_name.includes(house) || 
      selectedLocationObj.original_name.includes(house)
    );

    if (isSharedMenuHouse) {
      // For shared menu houses, get meals from ALL aggregated menus
      const allSharedHousesMeals = new Set();
      
      suggestionMenuData.forEach(location => {
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
      const parsed = parseLocationId(suggestionLocation);
      const locationNumber = parsed ? parsed.location_number : null;
      
      suggestionMenuData.forEach(location => {
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

  // Get menu items for suggestion
  const getMenuItemsForSuggestion = () => {
    if (!suggestionLocation || !suggestionMealType || !suggestionMenuData.length) return [];
    
    const normalizedSelected = normalizeMealName(suggestionMealType);
    
    // Find the selected location details
    const selectedLocationObj = findLocationById(suggestionLocation);
    
    if (!selectedLocationObj) return [];
    
    const isSharedMenuHouse = SHARED_MENU_HOUSES.some(house => 
      selectedLocationObj.location_name.includes(house) || 
      selectedLocationObj.original_name.includes(house)
    );
    
    const allItems = [];
    
    if (isSharedMenuHouse) {
      // For shared houses, aggregate all meals from all locations
      suggestionMenuData.forEach(location => {
        if (location.meals) {
          Object.values(location.meals).forEach(meal => {
            const normalizedMealName = normalizeMealName(meal.mealName);
            if (normalizedMealName === normalizedSelected && meal.categories) {
              Object.values(meal.categories).forEach(category => {
                if (category.recipes) {
                  category.recipes.forEach(recipe => {
                    // Avoid duplicates by recipe ID
                    if (!allItems.some(item => item.ID === recipe.ID)) {
                      allItems.push(recipe);
                    }
                  });
                }
              });
            }
          });
        }
      });
    } else {
      // For non-shared houses, use the specific location's menu
      const parsed = parseLocationId(suggestionLocation);
      const locationNumber = parsed ? parsed.location_number : null;
      
      suggestionMenuData.forEach(location => {
        if (location.locationNumber === locationNumber && location.meals) {
          Object.values(location.meals).forEach(meal => {
            const normalizedMealName = normalizeMealName(meal.mealName);
            if (normalizedMealName === normalizedSelected && meal.categories) {
              Object.values(meal.categories).forEach(category => {
                if (category.recipes) {
                  category.recipes.forEach(recipe => {
                    if (!allItems.some(item => item.ID === recipe.ID)) {
                      allItems.push(recipe);
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
    
    return allItems;
  };

  // Handle getting meal suggestion
  const handleGetSuggestion = async () => {
    if (!suggestionLocation || !suggestionMealType) {
      setSuggestionError('Please select both dining hall and meal type');
      return;
    }

    if (!accessToken) {
      setSuggestionError('Please log in to get meal suggestions');
      return;
    }

    try {
      setSuggestionLoading(true);
      setSuggestionError(null);
      setSuggestionData(null);
      setSuggestedItems([]);

      const menuItems = getMenuItemsForSuggestion();
      if (menuItems.length === 0) {
        setSuggestionError('No menu items available for this selection');
        setSuggestionLoading(false);
        return;
      }

      const response = await generateMealSuggestion(menuItems, suggestionMealType, accessToken);
      
      // The backend returns { success: true, suggestion: {...}, rawResponse: "..." }
      // The backend now validates and returns the correct structure
      const parsedSuggestion = response.suggestion;
      
      // Validate the response structure
      if (!parsedSuggestion || typeof parsedSuggestion !== 'object' || Array.isArray(parsedSuggestion)) {
        console.error('Invalid suggestion format:', parsedSuggestion);
        setSuggestionError('Invalid AI suggestion format. Please try again.');
        return;
      }
      
      // Ensure we have the expected fields
      if (!parsedSuggestion.explanation || typeof parsedSuggestion.explanation !== 'string') {
        console.error('Suggestion missing explanation field:', parsedSuggestion);
        setSuggestionError('Invalid AI suggestion format. Please try again.');
        return;
      }
      
      if (!Array.isArray(parsedSuggestion.suggestedItems)) {
        console.error('Suggestion missing suggestedItems array:', parsedSuggestion);
        parsedSuggestion.suggestedItems = [];
      }
      
      if (!parsedSuggestion.expectedNutrition || typeof parsedSuggestion.expectedNutrition !== 'object') {
        console.error('Suggestion missing expectedNutrition:', parsedSuggestion);
        parsedSuggestion.expectedNutrition = {};
      }
      
      setSuggestionData(parsedSuggestion);

      // Match suggested items with actual menu items
      const matchedItems = [];
      if (parsedSuggestion.suggestedItems && Array.isArray(parsedSuggestion.suggestedItems)) {
        parsedSuggestion.suggestedItems.forEach(suggested => {
          // Try to find matching menu item by name
          const matched = menuItems.find(item => {
            const itemName = (item.Recipe_Print_As_Name || item.Recipe_Name || '').toLowerCase();
            const suggestedName = (suggested.itemName || '').toLowerCase();
            return itemName.includes(suggestedName) || suggestedName.includes(itemName);
          });
          
          if (matched) {
            matchedItems.push({
              ...matched,
              suggestedPortion: suggested.portion,
              reasoning: suggested.reasoning,
            });
          }
        });
      }
      
      setSuggestedItems(matchedItems);

      // Calculate hypothetical nutrition
      // Helper function to evaluate formulas like "156 + 38 + 19 + 90"
      const evaluateFormula = (value) => {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return 0;
        try {
          // Remove any non-numeric, non-operator characters except + and -
          const cleaned = value.replace(/[^0-9+\-.\s]/g, '');
          // Safely evaluate simple addition/subtraction by splitting and summing
          const parts = cleaned.split(/[\s+]+/).filter(part => part.trim());
          let result = 0;
          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed) {
              const num = parseFloat(trimmed);
              if (!isNaN(num)) {
                result += num;
              }
            }
          }
          return result;
        } catch (e) {
          // If evaluation fails, try to parse as number
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        }
      };

      if (parsedSuggestion.expectedNutrition) {
        const expected = parsedSuggestion.expectedNutrition;
        const hypotheticalMeal = {
          calories: evaluateFormula(expected.calories || 0),
          protein: evaluateFormula(expected.protein || 0),
          totalFat: evaluateFormula(expected.totalFat || 0),
          saturatedFat: evaluateFormula(expected.saturatedFat || 0),
          totalCarbs: evaluateFormula(expected.totalCarbs || expected.totalCarb || 0),
          dietaryFiber: evaluateFormula(expected.fiber || expected.dietaryFiber || 0),
          sugars: evaluateFormula(expected.sugars || 0),
          sodium: evaluateFormula(expected.sodium || 0),
        };
        setHypotheticalMeals([hypotheticalMeal]);
      }
    } catch (err) {
      console.error('Error getting meal suggestion:', err);
      setSuggestionError(err.message || 'Failed to generate meal suggestion');
    } finally {
      setSuggestionLoading(false);
    }
  };

  // Clear hypothetical meals
  const handleClearHypothetical = () => {
    setHypotheticalMeals([]);
    setSuggestionData(null);
    setSuggestedItems([]);
  };

  // Calculate progress with hypothetical meals
  const getProgressWithHypothetical = () => {
    if (!progressData || !progressData.hasActivePlan || hypotheticalMeals.length === 0) {
      return progressData;
    }

    const parseNutrient = (value) => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      if (typeof value !== 'string') return 0;
      
      // Check if it's a formula (contains + or -)
      if (value.includes('+') || value.includes('-')) {
        try {
          // Remove any non-numeric, non-operator characters except + and -
          const cleaned = value.replace(/[^0-9+\-.\s]/g, '');
          // Safely evaluate simple addition/subtraction by splitting and summing
          const parts = cleaned.split(/[\s+]+/).filter(part => part.trim());
          let result = 0;
          for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed) {
              const num = parseFloat(trimmed);
              if (!isNaN(num)) {
                result += num;
              }
            }
          }
          return result;
        } catch (e) {
          // If evaluation fails, try to parse as number
          const num = parseFloat(value);
          return isNaN(num) ? 0 : num;
        }
      }
      
      // Regular number parsing
      const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // Sum up hypothetical nutrition
    const hypotheticalTotals = hypotheticalMeals.reduce((acc, meal) => {
      // Use parseNutrient which handles both numbers and strings
      acc.calories += parseNutrient(meal.calories);
      acc.protein += parseNutrient(meal.protein);
      acc.totalFat += parseNutrient(meal.totalFat);
      acc.saturatedFat += parseNutrient(meal.saturatedFat);
      acc.totalCarbs += parseNutrient(meal.totalCarbs || meal.totalCarb);
      acc.fiber += parseNutrient(meal.dietaryFiber);
      acc.sugars += parseNutrient(meal.sugars);
      acc.sodium += parseNutrient(meal.sodium);
      return acc;
    }, {
      calories: 0,
      protein: 0,
      totalFat: 0,
      saturatedFat: 0,
      totalCarbs: 0,
      fiber: 0,
      sugars: 0,
      sodium: 0,
    });

    // Combine with current progress
    // Map our keys to the progress keys
    const keyMapping = {
      calories: 'calories',
      protein: 'protein',
      totalFat: 'totalFat',
      saturatedFat: 'saturatedFat',
      totalCarbs: 'totalCarbs',
      fiber: 'fiber',
      sugars: 'sugars',
      sodium: 'sodium',
    };

    const updatedProgress = { ...progressData.progress };
    Object.keys(updatedProgress).forEach(key => {
      const current = updatedProgress[key].current || 0;
      // Map the key to our hypothetical totals key
      const hypotheticalKey = keyMapping[key];
      const hypothetical = hypotheticalKey ? (hypotheticalTotals[hypotheticalKey] || 0) : 0;
      const newCurrent = current + hypothetical;
      const target = updatedProgress[key].target || 0;
      const percentage = target > 0 ? Math.round((newCurrent / target) * 100) : 0;

      updatedProgress[key] = {
        ...updatedProgress[key],
        current: newCurrent,
        percentage,
        remaining: Math.max(0, target - newCurrent),
        status: percentage >= 100 ? 'met' : percentage >= 80 ? 'close' : 'below',
      };
    });

    return {
      ...progressData,
      progress: updatedProgress,
      isHypothetical: true,
    };
  };


  const progressWithHypothetical = getProgressWithHypothetical();

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
              <NutritionProgress 
                progressData={progressWithHypothetical || progressData} 
              />
            </div>
          )}

          {/* Explore Menu Card */}
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
                <CustomSelect
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  options={[
                    { value: '', label: 'Select a dining hall' },
                    ...expandedLocations.map((loc, idx) => {
                    const uniqueId = `${loc.location_number}|${loc.location_name}`;
                      return {
                        value: uniqueId,
                        label: loc.location_name
                      };
                    })
                  ]}
                  placeholder="Select a dining hall"
                  disabled={locationsLoading}
                  className="selector-input-wrapper"
                />
              </div>

              <div className="selector-group">
                <label htmlFor="meal-select" className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Meal Time
                </label>
                <CustomSelect
                  value={selectedMealType}
                  onChange={setSelectedMealType}
                  options={[
                    { value: '', label: 'Select a meal' },
                    ...getAvailableMealTypes().map(mealType => ({
                      value: mealType,
                      label: mealType
                    }))
                  ]}
                  placeholder="Select a meal"
                  disabled={!selectedLocation || loading}
                  className="selector-input-wrapper"
                />
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

          {/* AI Meal Suggestion Card */}
          <div className="menu-selector-card">
            <div className="card-header">
              <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <h2 className="card-title">AI Meal Suggestion</h2>
            </div>
            
            <div className="selector-content">
              <div className="selector-group">
                <label htmlFor="suggestion-location-select" className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Dining Hall
                </label>
                <CustomSelect
                  value={suggestionLocation}
                  onChange={(value) => {
                    setSuggestionLocation(value);
                    setSuggestionMealType('');
                  }}
                  options={[
                    { value: '', label: 'Select a dining hall' },
                    ...expandedLocations.map((loc, idx) => {
                    const uniqueId = `${loc.location_number}|${loc.location_name}`;
                      return {
                        value: uniqueId,
                        label: loc.location_name
                      };
                    })
                  ]}
                  placeholder="Select a dining hall"
                  disabled={locationsLoading}
                  className="selector-input-wrapper"
                />
              </div>

              <div className="selector-group">
                <label htmlFor="suggestion-meal-select" className="selector-label">
                  <svg className="label-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  Meal Time
                </label>
                <CustomSelect
                  value={suggestionMealType}
                  onChange={setSuggestionMealType}
                  options={[
                    { value: '', label: 'Select a meal' },
                    ...getSuggestionMealTypes().map(mealType => ({
                      value: mealType,
                      label: mealType
                    }))
                  ]}
                  placeholder="Select a meal"
                  disabled={!suggestionLocation || suggestionMenuLoading}
                  className="selector-input-wrapper"
                />
              </div>

              {hypotheticalMeals.length > 0 && (
                <button
                  className="clear-hypothetical-btn"
                  onClick={handleClearHypothetical}
                >
                  <svg className="clear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  Clear Hypothetical Meal
                </button>
              )}

              <button
                className="get-suggestion-btn"
                onClick={handleGetSuggestion}
                disabled={!suggestionLocation || !suggestionMealType || suggestionLoading || !accessToken}
              >
                {suggestionLoading ? (
                  <>
                    <svg className="loading-spinner-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                      <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round"/>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
                    </svg>
                    Get Suggestion
                  </>
                )}
              </button>

              {suggestionError && (
                <div className="suggestion-error">
                  <svg className="error-icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {suggestionError}
                </div>
              )}

              {!suggestionLocation && (
                <div className="selector-hint">
                  <svg className="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <p>Select a dining hall and meal type to get AI-powered meal suggestions based on your nutrition goals</p>
                </div>
              )}

              {suggestionLocation && !suggestionMenuLoading && !suggestionMealType && getSuggestionMealTypes().length === 0 && (
                <div className="selector-hint">
                  <svg className="hint-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  <p>No meals available for this dining hall today</p>
                </div>
              )}

              {/* Suggestion Results - Displayed within the same card */}
              {suggestionData && typeof suggestionData === 'object' && !Array.isArray(suggestionData) && (
                <div className="suggestion-results-in-card">
                  <div className="suggestion-divider"></div>
                  
                  {/* AI Summary - Show a concise 2-3 sentence summary */}
                  {suggestionData.explanation && typeof suggestionData.explanation === 'string' && (
                    <div className="suggestion-summary">
                      <h4 className="suggestion-summary-title">AI Recommendation</h4>
                      <p className="suggestion-summary-text">
                        {suggestionData.explanation.length > 500 
                          ? suggestionData.explanation.substring(0, 500) + '...' 
                          : suggestionData.explanation}
                      </p>
                    </div>
                  )}

                  {/* Suggested Items */}
                  {suggestedItems.length > 0 && (
                    <div className="suggested-items-section">
                      <h4 className="suggested-items-title">Suggested Items</h4>
                      <div className="recipes-grid">
                        {suggestedItems.map((item, idx) => (
                          <div 
                            key={`${item.ID}-${idx}`} 
                            className="recipe-card suggestion-recipe-card"
                            onClick={() => openNutritionModal(item)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && openNutritionModal(item)}
                          >
                            <div className="recipe-header">
                              <h5 className="recipe-name">{item.Recipe_Print_As_Name || item.Recipe_Name}</h5>
                              {item.Recipe_Web_Codes && (
                                <div className="recipe-badges">
                                  {item.Recipe_Web_Codes.split(' ').filter(code => code).map(code => (
                                    <span key={code} className="recipe-badge">{code}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            
                            {item.suggestedPortion && (
                              <div className="suggested-portion">
                                <svg className="portion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <path d="M12 6v6l4 2"/>
                                </svg>
                                <strong>Recommended:</strong> {item.suggestedPortion}
                              </div>
                            )}

                            {item.reasoning && (
                              <div className="suggestion-reasoning">
                                <p>{item.reasoning}</p>
                              </div>
                            )}
                            
                            <div className="recipe-quick-info">
                              <span className="calorie-badge">
                                <svg className="cal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                  <circle cx="9" cy="7" r="4"/>
                                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                {item.Calories} cal
                              </span>
                              {item.Allergens && item.Allergens.trim() && (
                                <span className="allergen-indicator" title={`Contains: ${item.Allergens}`}>
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Results Section */}
        <div className="menu-results-section">
          {/* Search bar - only show when menu items are available */}
          {!error && selectedMealType && filteredMenu.length > 0 && (
            <div className="menu-search-container">
              <svg className="menu-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="menu-search-input"
                placeholder="Search menu items..."
                value={menuSearchQuery}
                onChange={(e) => setMenuSearchQuery(e.target.value)}
              />
              {menuSearchQuery && (
                <button 
                  className="menu-search-clear"
                  onClick={() => setMenuSearchQuery('')}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          )}

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

          {!error && selectedMealType && filteredMenu.length > 0 && searchFilteredMenu.length === 0 && menuSearchQuery && (
            <div className="menu-card empty-card">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <p className="empty-text">No items match "{menuSearchQuery}"</p>
            </div>
          )}

          {!error && selectedMealType && searchFilteredMenu.length > 0 && searchFilteredMenu.map(location => (
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
