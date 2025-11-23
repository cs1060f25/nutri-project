import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocations, getMenuByDate, getTodaysMenu } from '../services/hudsService';
import { getMealPlans, createMealPlan, deleteMealPlan, updateMealPlan } from '../services/mealPlanService';
import { getActiveNutritionPlan } from '../services/nutritionPlanService';
import { getTodayProgress } from '../services/nutritionProgressService';
import { getMealLogs } from '../services/mealLogService';
import { getSavedMealPlans, createSavedMealPlan, deleteSavedMealPlan, incrementSavedMealPlanUsage, updateSavedMealPlan } from '../services/savedMealPlanService';
import CustomSelect from '../components/CustomSelect';
import CreatePostModal from '../components/CreatePostModal';
import './MealPlanning.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

// Color mapping for dining halls
const DINING_HALL_COLORS = {
  'Adams House': { bg: '#e3f2fd', border: '#2196f3', hover: '#bbdefb' },
  'Annenberg Hall': { bg: '#fff8e1', border: '#ffc107', hover: '#ffecb3' },
  'Cabot House': { bg: '#f3e5f5', border: '#9c27b0', hover: '#e1bee7' },
  'Currier House': { bg: '#fff3e0', border: '#ff9800', hover: '#ffe0b2' },
  'Dunster House': { bg: '#e8f5e9', border: '#4caf50', hover: '#c8e6c9' },
  'Eliot House': { bg: '#fce4ec', border: '#e91e63', hover: '#f8bbd0' },
  'Kirkland House': { bg: '#e0f2f1', border: '#009688', hover: '#b2dfdb' },
  'Leverett House': { bg: '#fff9c4', border: '#fbc02d', hover: '#fff59d' },
  'Lowell House': { bg: '#f1f8e9', border: '#8bc34a', hover: '#dcedc8' },
  'Mather House': { bg: '#e1f5fe', border: '#03a9f4', hover: '#b3e5fc' },
  'Pforzheimer House': { bg: '#fce4ec', border: '#e91e63', hover: '#f8bbd0' },
  'Quincy House': { bg: '#ede7f6', border: '#673ab7', hover: '#d1c4e9' },
  'Winthrop House': { bg: '#fff3e0', border: '#ff9800', hover: '#ffe0b2' },
};

// Helper function to get color for a dining hall
const getDiningHallColor = (locationName) => {
  if (!locationName) {
    console.warn('No location name provided, using default color');
    return DINING_HALL_COLORS['Dunster House'];
  }
  
  // Normalize the location name - remove extra spaces
  const normalized = locationName.trim();
  
  // Debug: log what we're trying to match
  console.log('Looking up color for location:', normalized);
  console.log('Available keys:', Object.keys(DINING_HALL_COLORS));
  
  // Handle paired houses (e.g., "Dunster and Mather House")
  if (normalized.includes(' and ')) {
    const firstHouse = normalized.split(' and ')[0].trim() + ' House';
    console.log('Paired house detected, using first house:', firstHouse);
    return DINING_HALL_COLORS[firstHouse] || DINING_HALL_COLORS['Dunster House'];
  }
  
  // Try exact match first
  if (DINING_HALL_COLORS[normalized]) {
    console.log('Exact match found:', normalized);
    return DINING_HALL_COLORS[normalized];
  }
  
  // Try with "House" suffix if not present
  const withHouse = normalized.endsWith(' House') ? normalized : `${normalized} House`;
  if (DINING_HALL_COLORS[withHouse]) {
    console.log('Match found with House suffix:', withHouse);
    return DINING_HALL_COLORS[withHouse];
  }
  
  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(DINING_HALL_COLORS)) {
    const keyLower = key.toLowerCase();
    if (keyLower === lowerNormalized || keyLower === lowerNormalized + ' house') {
      console.log('Case-insensitive match found:', key);
      return value;
    }
  }
  
  // Try partial match (e.g., "Dunster" matches "Dunster House")
  // Also handle "Hall" vs "House" (e.g., "Annenberg Hall" matches "Annenberg Hall")
  for (const [key, value] of Object.entries(DINING_HALL_COLORS)) {
    // Remove "House" or "Hall" from both for comparison
    const keyBase = key.replace(/\s+(House|Hall)\s*$/i, '').toLowerCase();
    const normalizedBase = normalized.replace(/\s+(House|Hall)\s*$/i, '').toLowerCase();
    if (keyBase === normalizedBase) {
      console.log('Partial match found:', key);
      return value;
    }
  }
  
  // Try matching with "Hall" converted to "House" and vice versa
  const normalizedWithHouse = normalized.replace(/\s+Hall\s*$/i, ' House');
  if (DINING_HALL_COLORS[normalizedWithHouse]) {
    console.log('Match found by converting Hall to House:', normalizedWithHouse);
    return DINING_HALL_COLORS[normalizedWithHouse];
  }
  
  const normalizedWithHall = normalized.replace(/\s+House\s*$/i, ' Hall');
  if (DINING_HALL_COLORS[normalizedWithHall]) {
    console.log('Match found by converting House to Hall:', normalizedWithHall);
    return DINING_HALL_COLORS[normalizedWithHall];
  }
  
  // Default fallback
  console.warn('No match found for:', normalized, 'using default color');
  return DINING_HALL_COLORS['Dunster House'];
};

const MealPlanning = () => {
  const { accessToken, refreshAccessToken } = useAuth();
  // Only plan for today
  const [today] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [mealPlans, setMealPlans] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [menuItems, setMenuItems] = useState({});
  const [selectedItems, setSelectedItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [mealPlanToUpdate, setMealPlanToUpdate] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeModalScanData, setCompleteModalScanData] = useState(null);
  const [isMealPlanCompleted, setIsMealPlanCompleted] = useState(false);
  const [savedMealPlans, setSavedMealPlans] = useState([]);
  const [filteredSavedMealPlans, setFilteredSavedMealPlans] = useState([]);
  const [todaysMenu, setTodaysMenu] = useState([]);
  const [showSavedPlansFilters, setShowSavedPlansFilters] = useState(false);
  const [savedPlanFilterStar, setSavedPlanFilterStar] = useState('');
  const [savedPlanFilterHouse, setSavedPlanFilterHouse] = useState('');
  const [savedPlanFilterMealType, setSavedPlanFilterMealType] = useState('');
  const [savedPlanFilterAvailability, setSavedPlanFilterAvailability] = useState('');
  const [selectedSavedPlan, setSelectedSavedPlan] = useState(null);
  const [isSavedPlanModalOpen, setIsSavedPlanModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [mealPlanName, setMealPlanName] = useState('');
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [confirmationType, setConfirmationType] = useState('success'); // 'success' or 'error'
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteType, setDeleteType] = useState('mealPlan'); // 'mealPlan' or 'savedMealPlan'
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  
  // Only show today
  const todayDates = [today];

  // Format date as YYYY-MM-DD
  // Handles both Date objects and date strings (YYYY-MM-DD format)
  const formatDate = (date) => {
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    // If it's a string but not in the right format, try to parse it
    if (typeof date === 'string') {
      date = new Date(date);
    }
    // Ensure it's a Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date passed to formatDate:', date);
      return new Date().toISOString().split('T')[0]; // Return today's date as fallback
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  // Handles both Date objects and date strings
  const formatDateDisplay = (date) => {
    // If it's a string, convert to Date object
    if (typeof date === 'string') {
      date = new Date(date);
    }
    // Ensure it's a Date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date passed to formatDateDisplay:', date);
      date = new Date(); // Use today as fallback
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };


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

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
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
        
        // Sort locations by name
        expanded.sort((a, b) => a.location_name.localeCompare(b.location_name));
        
        // Ensure uniqueness - remove any duplicates based on location_name
        const uniqueLocations = [];
        const seenNames = new Set();
        expanded.forEach(loc => {
          const uniqueKey = `${loc.location_name}-${loc.location_number}`;
          if (!seenNames.has(uniqueKey)) {
            seenNames.add(uniqueKey);
            uniqueLocations.push(loc);
          }
        });
        
        setLocations(uniqueLocations);
      } catch (error) {
        console.error('Error fetching locations:', error);
        setLocations([]);
      }
    };
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch active nutrition plan
  useEffect(() => {
    const fetchNutritionPlan = async () => {
      if (!accessToken) return;
      try {
        const plan = await getActiveNutritionPlan();
        setNutritionPlan(plan);
      } catch (error) {
        console.error('Error fetching nutrition plan:', error);
      }
    };
    fetchNutritionPlan();
  }, [accessToken]);

  // Fetch meal plans for current week
  useEffect(() => {
    const fetchMealPlans = async () => {
      if (!accessToken) return;
      try {
        setLoading(true);
        const todayDate = formatDate(today);
        const data = await getMealPlans(todayDate, todayDate, accessToken);
        setMealPlans(data.mealPlans || []);
      } catch (error) {
        console.error('Error fetching meal plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMealPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, today]);

  // Fetch saved meal plans
  useEffect(() => {
    const fetchSavedMealPlans = async () => {
      if (!accessToken) return;
      try {
        const data = await getSavedMealPlans(accessToken);
        setSavedMealPlans(data.savedPlans || []);
        setFilteredSavedMealPlans(data.savedPlans || []);
      } catch (error) {
        console.error('Error fetching saved meal plans:', error);
      }
    };
    fetchSavedMealPlans();
  }, [accessToken]);

  // Filter saved meal plans
  useEffect(() => {
    let filtered = [...savedMealPlans];

    // Filter by star rating
    if (savedPlanFilterStar) {
      const minStars = parseInt(savedPlanFilterStar, 10);
      filtered = filtered.filter(plan => (plan.stars || 0) >= minStars);
    }

    // Filter by house (location)
    if (savedPlanFilterHouse) {
      filtered = filtered.filter(plan => 
        plan.locationName?.toLowerCase() === savedPlanFilterHouse.toLowerCase()
      );
    }

    // Filter by meal type
    if (savedPlanFilterMealType) {
      filtered = filtered.filter(plan => 
        plan.mealType?.toLowerCase() === savedPlanFilterMealType.toLowerCase()
      );
    }

    // Filter by availability
    if (savedPlanFilterAvailability) {
      filtered = filtered.filter(plan => {
        const availability = checkSavedPlanAvailability(plan);
        if (savedPlanFilterAvailability === 'available') {
          return availability.canMake;
        } else if (savedPlanFilterAvailability === 'unavailable') {
          return !availability.canMake;
        }
        return true;
      });
    }

    setFilteredSavedMealPlans(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedMealPlans, savedPlanFilterStar, savedPlanFilterHouse, savedPlanFilterMealType, savedPlanFilterAvailability, todaysMenu]);

  // Fetch today's menu for availability checking
  useEffect(() => {
    const fetchTodaysMenu = async () => {
      try {
        const menu = await getTodaysMenu();
        setTodaysMenu(menu || []);
      } catch (error) {
        console.error('Error fetching today\'s menu:', error);
      }
    };
    fetchTodaysMenu();
  }, []);

  // Listen for meal log updates to refresh completion status
  useEffect(() => {
    const handleMealLogUpdated = async () => {
      if (selectedMealPlan && accessToken) {
        // Add a small delay to ensure the meal log is saved to Firestore
        setTimeout(async () => {
          try {
            // Query only by date to avoid index requirement, then filter by meal type in memory
            const mealLogs = await getMealLogs({
              startDate: selectedMealPlan.date,
              endDate: selectedMealPlan.date,
            }, accessToken);
            
            // Compare case-insensitively since meal plans use lowercase but meal logs might use capitalized
            // Normalize dates to YYYY-MM-DD format for comparison
            const isCompleted = mealLogs.meals && mealLogs.meals.some(meal => {
              const mealDateStr = meal.mealDate ? String(meal.mealDate).split('T')[0] : '';
              const planDateStr = selectedMealPlan.date ? String(selectedMealPlan.date).split('T')[0] : '';
              const dateMatch = mealDateStr === planDateStr;
              const typeMatch = meal.mealType?.toLowerCase() === selectedMealPlan.mealType?.toLowerCase();
              return dateMatch && typeMatch;
            });
            
            setIsMealPlanCompleted(isCompleted || false);
          } catch (error) {
            console.error('Error checking meal plan completion:', error);
          }
        }, 1000); // Wait 1 second for Firestore to save
      }
    };

    window.addEventListener('mealLogUpdated', handleMealLogUpdated);
    return () => {
      window.removeEventListener('mealLogUpdated', handleMealLogUpdated);
    };
  }, [selectedMealPlan, accessToken]);

  // Get meal plan for a specific date and meal type
  const getMealPlanForCell = (date, mealType) => {
    const dateStr = formatDate(date);
    return mealPlans.find(
      plan => plan.date === dateStr && plan.mealType === mealType
    );
  };

  // Open add modal
  const handleAddClick = (date = null, mealType = '') => {
    // Always use today's date
    const todayDate = formatDate(today);
    setSelectedDate(todayDate);
    setSelectedMealType(mealType);
    setSelectedLocationId('');
    setSelectedLocationName('');
    setMenuItems({});
    setSelectedItems([]);
    setMealPlanToUpdate(null);
    setIsAddModalOpen(true);
  };

  // Handle clicking on an empty calendar cell
  const handleCellClick = (date, mealType) => {
    const plan = getMealPlanForCell(date, mealType);
    // If there's already a plan, open the side panel (existing behavior)
    if (plan) {
      handleMealPlanClick(plan);
    } else {
      // If empty, open the add modal with date and meal type pre-filled
      handleAddClick(date, mealType);
    }
  };


  // Handle meal type change in modal
  const handleMealTypeChange = async (value) => {
    setSelectedMealType(value);
    setSelectedItems([]);
    setMenuItems({});
    
    // If location and date are already selected, fetch menu items
    if (value && selectedLocationId && selectedDate) {
      await fetchMenuItems(selectedDate, selectedLocationId);
    }
  };

  // Handle location change in modal
  const handleLocationChange = async (locationId) => {
    // Find the location by location_number
    const location = locations.find(loc => loc.location_number === locationId);
    
    setSelectedLocationId(locationId);
    setSelectedLocationName(location ? location.location_name : '');
    setSelectedItems([]);
    setMenuItems({});

    if (locationId && selectedDate && selectedMealType) {
      await fetchMenuItems(selectedDate, locationId);
    }
  };

  // Fetch menu items for selected date and location
  const fetchMenuItems = async (date, locationId) => {
    try {
      setMenuLoading(true);
      
      // Check if the selected date is today
      const today = formatDate(new Date());
      const isToday = date === today;
      
      // Find the selected location to check if it's a shared-menu house
      const selectedLocation = locations.find(loc => loc.location_number === locationId);
      const isSharedMenuHouse = selectedLocation && SHARED_MENU_HOUSES.some(house => 
        selectedLocation.location_name.includes(house) || 
        selectedLocation.original_name?.includes(house)
      );

      let menuData = [];
      
      if (isSharedMenuHouse) {
        // For shared-menu houses, they all share the same menu
        // Try to fetch from the selected location first, or use a known working location
        // Since they share menus, we only need to fetch from one location
        try {
          if (isToday) {
            // Use getTodaysMenu for today (same as home page)
            menuData = await getTodaysMenu(locationId);
          } else {
          menuData = await getMenuByDate(date, locationId);
          }
        } catch (error) {
          // If the selected location fails, try a few common location numbers
          const fallbackLocations = ['38', '05', '07'];
          let success = false;
          for (const fallbackLoc of fallbackLocations) {
            try {
              if (isToday) {
                menuData = await getTodaysMenu(fallbackLoc);
              } else {
              menuData = await getMenuByDate(date, fallbackLoc);
              }
              success = true;
              break;
            } catch (err) {
              console.warn(`Failed to fetch menu for fallback location ${fallbackLoc}:`, err);
            }
          }
          if (!success) {
            throw new Error('Unable to fetch menu for shared-menu houses');
          }
        }
      } else {
        // For non-shared houses (like Quincy), fetch their specific menu
        if (isToday) {
          // Use getTodaysMenu for today (same as home page)
          menuData = await getTodaysMenu(locationId);
        } else {
        menuData = await getMenuByDate(date, locationId);
        }
      }
      
      // Flatten menu structure to get all items
      // The API already filters by location, so we only need to filter by meal type
      const items = [];
      
      // Log for debugging
      console.log('Menu data received:', {
        date,
        locationId,
        isToday,
        menuDataLength: menuData?.length || 0,
        selectedMealType,
        menuData: menuData?.map(loc => ({
          locationNumber: loc.locationNumber,
          locationName: loc.locationName,
          mealCount: Object.keys(loc.meals || {}).length
        }))
      });
      
      if (menuData && menuData.length > 0) {
        menuData.forEach(location => {
          // The API already filtered by locationId, so all locations in menuData are relevant
          if (location.meals) {
            Object.values(location.meals).forEach(meal => {
              const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
              
              // Filter by selected meal type - only process meals that match
              if (!selectedMealType) {
                // If no meal type selected yet, include all items
                if (meal.categories) {
                  Object.values(meal.categories).forEach(category => {
                    if (category.recipes) {
                      category.recipes.forEach(recipe => {
                        // Helper to safely parse nutrition values
                        const parseNutritionValue = (value) => {
                          if (value === null || value === undefined || value === '') return 0;
                          const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
                          return isNaN(parsed) ? 0 : parsed;
                        };

                        items.push({
                          id: recipe.Recipe_Number,
                          name: capitalizeFoodName(recipe.Recipe_Name),
                          category: category.categoryName,
                          mealType: mealName,
                          calories: parseNutritionValue(recipe.Calories),
                          totalFat: parseNutritionValue(recipe.Total_Fat),
                          protein: parseNutritionValue(recipe.Protein),
                          totalCarb: parseNutritionValue(recipe.Total_Carbohydrate),
                        });
                      });
                    }
                  });
                }
              } else {
                // Filter by selected meal type
                const selected = selectedMealType.toLowerCase();
                const mealMatches = mealName === selected || 
                                    mealName.includes(selected) || 
                                    selected.includes(mealName);
                
                if (mealMatches && meal.categories) {
                  Object.values(meal.categories).forEach(category => {
                    if (category.recipes) {
                      category.recipes.forEach(recipe => {
                        // Helper to safely parse nutrition values
                        const parseNutritionValue = (value) => {
                          if (value === null || value === undefined || value === '') return 0;
                          const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
                          return isNaN(parsed) ? 0 : parsed;
                        };

                        items.push({
                          id: recipe.Recipe_Number,
                          name: capitalizeFoodName(recipe.Recipe_Name),
                          category: category.categoryName,
                          mealType: mealName,
                          calories: parseNutritionValue(recipe.Calories),
                          totalFat: parseNutritionValue(recipe.Total_Fat),
                          protein: parseNutritionValue(recipe.Protein),
                          totalCarb: parseNutritionValue(recipe.Total_Carbohydrate),
                        });
                      });
                    }
                  });
                }
              }
            });
          }
        });
      }

      // Additional filter by selected meal type as a safety check (only if meal type is selected)
      const filteredItems = selectedMealType ? items.filter(item => {
        const itemMealType = item.mealType || '';
        const selected = selectedMealType.toLowerCase();
        // Match exact or check if meal type is contained in the meal name
        return itemMealType === selected || 
               itemMealType.includes(selected) || 
               selected.includes(itemMealType);
      }) : items;
      
      // Group items by category
      const groupedItems = {};
      filteredItems.forEach(item => {
        const category = item.category || 'Other';
        if (!groupedItems[category]) {
          groupedItems[category] = [];
        }
        groupedItems[category].push(item);
      });
      
      setMenuItems(groupedItems);
      
      // Log final result
      console.log('Menu items processed:', {
        totalItems: items.length,
        filteredItems: filteredItems.length,
        groupedCategories: Object.keys(groupedItems).length,
        hasItems: filteredItems.length > 0
      });
    } catch (error) {
      console.error('Error fetching menu items:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        date,
        locationId,
        selectedMealType
      });
      setMenuItems({});
    } finally {
      setMenuLoading(false);
    }
  };

  // Auto-set today's date when modal opens
  useEffect(() => {
    if (isAddModalOpen && !selectedDate) {
      const todayDate = formatDate(today);
      setSelectedDate(todayDate);
    }
  }, [isAddModalOpen, selectedDate, today]);

  // Update menu items when date, location, or meal type changes
  useEffect(() => {
    if (selectedDate && selectedLocationId && selectedMealType) {
      fetchMenuItems(selectedDate, selectedLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedLocationId, selectedMealType]);

  // Toggle item selection
  const toggleItemSelection = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      } else {
        return [...prev, item];
      }
    });
  };

  // Submit meal plan (create or update)
  const handleSubmit = async () => {
    if (!selectedDate || !selectedMealType || !selectedLocationId || !selectedLocationName || selectedItems.length === 0) {
      alert('Please fill in all fields and select at least one item');
      return;
    }

    if (!accessToken) {
      alert('You must be logged in to save a meal plan');
      return;
    }

    try {
      let currentToken = accessToken;
      
      // Helper function to attempt API call with token refresh
      const attemptApiCall = async (apiCall) => {
        try {
          return await apiCall(currentToken);
        } catch (error) {
          // Check if it's a token expiration error
          if (error.message && (
            error.message.includes('401') || 
            error.message.includes('Unauthorized') ||
            error.message.includes('token') ||
            error.message.includes('expired')
          )) {
            // Try to refresh the token
            try {
              const newToken = await refreshAccessToken();
              currentToken = newToken;
              // Retry the API call with the new token
              return await apiCall(newToken);
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              throw new Error('Session expired. Please log in again.');
            }
          }
          throw error;
        }
      };

      if (mealPlanToUpdate) {
        // Update existing meal plan
        // Clean item names (remove "Vgn") before saving, but keep vegan flag
        const cleanedItems = selectedItems.map(item => {
          const { cleanedName, isVegan } = cleanItemName(item.name);
          return {
            ...item,
            name: cleanedName,
            isVegan: isVegan // Store vegan flag
          };
        });
        await attemptApiCall((token) => updateMealPlan(mealPlanToUpdate, {
          date: selectedDate,
          mealType: selectedMealType,
          locationId: selectedLocationId,
          locationName: selectedLocationName,
          selectedItems: cleanedItems,
        }, token));
      } else {
        // Create new meal plan
        // Clean item names (remove "Vgn") before saving, but keep original for vegan detection
        const cleanedItems = selectedItems.map(item => {
          const { cleanedName, isVegan } = cleanItemName(item.name);
          return {
            ...item,
            name: cleanedName,
            isVegan: isVegan // Store vegan flag
          };
        });
        await attemptApiCall((token) => createMealPlan({
          date: selectedDate,
          mealType: selectedMealType,
          locationId: selectedLocationId,
          locationName: selectedLocationName,
          selectedItems: cleanedItems,
        }, token));
      }

      // Refresh meal plans
      const todayDate = formatDate(today);
      const data = await attemptApiCall((token) => getMealPlans(todayDate, todayDate, token));
      setMealPlans(data.mealPlans || []);

      // Close modal and reset form
      setIsAddModalOpen(false);
      setSelectedDate('');
      setSelectedMealType('');
      setSelectedLocationId('');
      setSelectedLocationName('');
      setMenuItems({});
      setSelectedItems([]);
      setMealPlanToUpdate(null);
      
      // Show success message
      setConfirmationMessage('Meal plan saved successfully!');
      setConfirmationType('success');
      setIsConfirmationModalOpen(true);
    } catch (error) {
      console.error('Error saving meal plan:', error);
      setConfirmationMessage('Failed to save meal plan: ' + (error.message || 'Unknown error'));
      setConfirmationType('error');
      setIsConfirmationModalOpen(true);
    }
  };

  // Handle meal plan click
  const handleMealPlanClick = async (plan) => {
    setSelectedMealPlan(plan);
    setIsSidePanelOpen(true);
    // Reset completion status when opening a meal plan
    setIsMealPlanCompleted(false);
    
    // Check if this meal plan has been completed (has a matching meal log)
    if (accessToken) {
      try {
        // Query only by date to avoid index requirement, then filter by meal type in memory
        const mealLogs = await getMealLogs({
          startDate: plan.date,
          endDate: plan.date,
        }, accessToken);
        
        // Check if there's a meal log matching this meal plan's date and meal type
        // Compare case-insensitively since meal plans use lowercase but meal logs might use capitalized
        console.log('Checking completion for meal plan:', {
          planDate: plan.date,
          planMealType: plan.mealType,
          mealLogsCount: mealLogs.meals?.length || 0,
          mealLogs: mealLogs.meals?.map(m => ({ date: m.mealDate, type: m.mealType })) || []
        });
        
        const isCompleted = mealLogs.meals && mealLogs.meals.some(meal => {
          // Normalize dates to YYYY-MM-DD format for comparison
          const mealDateStr = meal.mealDate ? String(meal.mealDate).split('T')[0] : '';
          const planDateStr = plan.date ? String(plan.date).split('T')[0] : '';
          const dateMatch = mealDateStr === planDateStr;
          
          // Compare meal types case-insensitively
          const typeMatch = meal.mealType?.toLowerCase() === plan.mealType?.toLowerCase();
          
          // Also check if the meal log items match the meal plan items
          // This ensures we only mark as completed if the actual meal was logged, not just any meal
          const planItemNames = (plan.selectedItems || []).map(item => item.name?.toLowerCase() || '');
          const mealItemNames = (meal.items || []).map(item => item.recipeName?.toLowerCase() || item.name?.toLowerCase() || '');
          
          // Check if at least some items from the meal plan are in the meal log
          const hasMatchingItems = planItemNames.length > 0 && planItemNames.some(planItem => 
            mealItemNames.some(mealItem => 
              mealItem.includes(planItem) || planItem.includes(mealItem)
            )
          );
          
          console.log('Comparing:', {
            mealDate: meal.mealDate,
            mealDateStr,
            planDate: plan.date,
            planDateStr,
            dateMatch,
            mealType: meal.mealType,
            planMealType: plan.mealType,
            typeMatch,
            planItems: planItemNames,
            mealItems: mealItemNames,
            hasMatchingItems,
            overallMatch: dateMatch && typeMatch && hasMatchingItems
          });
          
          // Only mark as completed if date, meal type, AND items match
          return dateMatch && typeMatch && hasMatchingItems;
        });
        
        console.log('Meal plan completed:', isCompleted);
        setIsMealPlanCompleted(isCompleted || false);
      } catch (error) {
        console.error('Error checking meal plan completion:', error);
        setIsMealPlanCompleted(false);
      }
    }
    
    // Fetch daily progress for the meal plan's date
    // Only fetch if the date is today (since we only have today's progress endpoint)
    const planDateStr = plan.date ? String(plan.date).split('T')[0] : '';
    const todayStr = formatDate(new Date());
    const isToday = planDateStr === todayStr;
    
    console.log('Fetching progress for meal plan:', { 
      planDate: plan.date, 
      planDateStr, 
      todayStr, 
      isToday 
    });
    
    if (isToday && accessToken) {
      try {
        const progress = await getTodayProgress(accessToken);
        console.log('Fetched progress:', progress);
        setDailyProgress(progress);
      } catch (error) {
        console.error('Error fetching daily progress:', error);
        setDailyProgress(null);
      }
    } else {
      // For future dates, we don't have progress data yet
      console.log('Not today, setting dailyProgress to null');
      setDailyProgress(null);
    }
  };

  // Close side panel
  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedMealPlan(null);
    setDailyProgress(null);
  };

  // Delete meal plan - opens confirmation modal
  const handleDelete = () => {
    if (!selectedMealPlan) return;
    setDeleteType('mealPlan');
    setDeleteTargetId(selectedMealPlan.id);
    setIsDeleteModalOpen(true);
  };

  // Confirm and execute meal plan deletion
  const handleConfirmDelete = async () => {
    if (!deleteTargetId || !accessToken) return;

    try {
      if (deleteType === 'mealPlan') {
        await deleteMealPlan(deleteTargetId, accessToken);
      
      // Refresh meal plans
      const todayDate = formatDate(today);
      const data = await getMealPlans(todayDate, todayDate, accessToken);
      setMealPlans(data.mealPlans || []);
      
      // Close side panel
      setIsSidePanelOpen(false);
      setSelectedMealPlan(null);
      setDailyProgress(null);
      } else if (deleteType === 'savedMealPlan') {
        await deleteSavedMealPlan(deleteTargetId, accessToken);
        
        // Refresh saved meal plans
        const data = await getSavedMealPlans(accessToken);
        setSavedMealPlans(data.savedPlans || []);
        
        // Close modals if open
        setIsSavedPlanModalOpen(false);
        setSelectedSavedPlan(null);
      }
      
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      
      // Show success message
      setConfirmationMessage(deleteType === 'mealPlan' ? 'Meal plan deleted successfully!' : 'Saved meal plan deleted successfully!');
      setConfirmationType('success');
      setIsConfirmationModalOpen(true);
    } catch (error) {
      console.error('Error deleting:', error);
      setConfirmationMessage('Failed to delete: ' + (error.message || 'Unknown error'));
      setConfirmationType('error');
      setIsConfirmationModalOpen(true);
      setIsDeleteModalOpen(false);
    }
  };

  // Handle complete meal plan - open create post modal with pre-filled data
  const handleCompleteMealPlan = () => {
    if (!selectedMealPlan) return;

    // Calculate nutrition totals from meal plan
    const totals = calculateNutritionTotals(selectedMealPlan);
    
    // Convert meal plan items to matchedItems format (for scanData)
    // Backend expects: calories, protein, carbs, fat (not totalCarb/totalFat)
    const matchedItems = selectedMealPlan.selectedItems.map((item, idx) => ({
      predictedName: item.name || `Item ${idx + 1}`,
      matchedName: item.name || `Item ${idx + 1}`,
      estimatedServings: 1,
      nutrition: {
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.totalCarb || 0, // totalCarb from meal plan -> carbs for backend
        fat: item.totalFat || 0,   // totalFat from meal plan -> fat for backend
      },
      id: item.id || `item-${idx}`,
      name: item.name,
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.totalCarb || 0,  // Use 'carbs' not 'totalCarb' for backend
      fat: item.totalFat || 0,     // Use 'fat' not 'totalFat' for backend
      recipeId: item.id || null,
      recipeName: item.name || 'Unknown dish',
    }));

    // Create scanData format for CreatePostModal
    const scanData = {
      matchedItems,
      unmatchedDishes: [],
      calories: totals?.calories || 0,
      protein: totals?.protein || 0,
      carbs: totals?.totalCarb || 0,
      fat: totals?.totalFat || 0,
      timestamp: new Date().toISOString(),
    };

    setCompleteModalScanData(scanData);
    setShowCompleteModal(true);
    setIsSidePanelOpen(false);
  };

  // Handle update meal plan - open modal with pre-filled data
  const handleUpdate = () => {
    if (!selectedMealPlan) return;
    
    // Set form fields with meal plan data
    setSelectedDate(selectedMealPlan.date);
    setSelectedMealType(selectedMealPlan.mealType);
    setSelectedLocationId(selectedMealPlan.locationId);
    setSelectedLocationName(selectedMealPlan.locationName);
    setSelectedItems(selectedMealPlan.selectedItems);
    
    // Store the meal plan ID for update
    setMealPlanToUpdate(selectedMealPlan.id);
    
    // Close side panel and open add modal
    setIsSidePanelOpen(false);
    setIsAddModalOpen(true);
    
    // Fetch menu items for the selected date and location
    if (selectedMealPlan.date && selectedMealPlan.locationId && selectedMealPlan.mealType) {
      fetchMenuItems(selectedMealPlan.date, selectedMealPlan.locationId);
    }
  };

  // Helper to capitalize food names properly (reusable)
  const capitalizeFoodName = (name) => {
    if (!name) return '';
    // Convert to lowercase first, then capitalize first letter of each word
    return name.toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to clean name and check if vegan
  const cleanItemName = (name) => {
    if (!name) return { cleanedName: '', isVegan: false };
    const isVegan = /vgn/i.test(name);
    // Remove "Vgn" (case-insensitive) from the name
    const cleanedName = name.replace(/\s*vgn\s*/gi, ' ').trim().replace(/\s+/g, ' ');
    return { cleanedName, isVegan };
  };

  // Check if saved meal plan items are available today
  const checkSavedPlanAvailability = (savedPlan) => {
    if (!todaysMenu || todaysMenu.length === 0) {
      return { canMake: false, mealTypes: [] };
    }

    // Flatten today's menu to get all available items
    const availableItems = new Set();
    const availableMealTypes = new Set();
    
    todaysMenu.forEach(location => {
      if (location.meals) {
        Object.values(location.meals).forEach(meal => {
          const mealName = meal.mealName ? meal.mealName.toLowerCase() : '';
          if (meal.categories) {
            Object.values(meal.categories).forEach(category => {
              if (category.recipes) {
                category.recipes.forEach(recipe => {
                  const itemName = recipe.Recipe_Name?.toLowerCase() || '';
                  availableItems.add(itemName);
                  if (mealName === savedPlan.mealType.toLowerCase()) {
                    availableMealTypes.add(mealName);
                  }
                });
              }
            });
          }
        });
      }
    });

    // Check if all items in saved plan are available
    const savedItemNames = savedPlan.selectedItems.map(item => 
      item.name?.toLowerCase() || ''
    );
    
    const allAvailable = savedItemNames.every(itemName => {
      // Check for exact match or partial match
      return Array.from(availableItems).some(available => 
        available.includes(itemName) || itemName.includes(available)
      );
    });

    return {
      canMake: allAvailable && availableMealTypes.has(savedPlan.mealType.toLowerCase()),
      mealTypes: Array.from(availableMealTypes),
    };
  };

  // Handle using a saved meal plan
  const handleUseSavedPlan = async (savedPlan) => {
    if (!accessToken) return;
    
    try {
      // Increment usage count
      await incrementSavedMealPlanUsage(savedPlan.id, accessToken);
      
      // Refresh saved meal plans
      const data = await getSavedMealPlans(accessToken);
      setSavedMealPlans(data.savedPlans || []);
      
      // Set up the form with saved plan data (always use today)
      const todayDate = formatDate(today);
      setSelectedDate(todayDate);
      setSelectedMealType(savedPlan.mealType);
      setSelectedLocationId(savedPlan.locationId);
      setSelectedLocationName(savedPlan.locationName);
      setSelectedItems(savedPlan.selectedItems);
      setMealPlanToUpdate(null);
      
      // Open the add modal
      setIsAddModalOpen(true);
      
      // Fetch menu items
      await fetchMenuItems(today, savedPlan.locationId);
    } catch (error) {
      console.error('Error using saved meal plan:', error);
      alert('Failed to use saved meal plan');
    }
  };

  // Handle deleting a saved meal plan - opens confirmation modal
  const handleDeleteSavedPlan = (savedPlanId) => {
    if (!accessToken) return;
    setDeleteType('savedMealPlan');
    setDeleteTargetId(savedPlanId);
    setIsDeleteModalOpen(true);
  };

  // Handle opening name modal for saving meal plan as template
  const handleSaveMealPlanAsTemplate = () => {
    if (!selectedMealPlan || !accessToken) return;
    setMealPlanName('');
    setIsNameModalOpen(true);
  };

  // Handle confirming name and saving meal plan as template
  const handleConfirmSaveMealPlanAsTemplate = async () => {
    if (!mealPlanName || !mealPlanName.trim()) {
      setConfirmationMessage('Please enter a name for the meal plan');
      setConfirmationType('error');
      setIsConfirmationModalOpen(true);
      setIsNameModalOpen(false);
      return;
    }

    setIsNameModalOpen(false);

    try {
      await createSavedMealPlan({
        title: mealPlanName.trim(),
        mealType: selectedMealPlan.mealType,
        locationId: selectedMealPlan.locationId,
        locationName: selectedMealPlan.locationName,
        selectedItems: selectedMealPlan.selectedItems,
        image: null, // Can be added later if needed
        stars: 0, // Default to 0, user can rate later
      }, accessToken);
      
      // Refresh saved meal plans
      const data = await getSavedMealPlans(accessToken);
      setSavedMealPlans(data.savedPlans || []);
      
      setConfirmationMessage('Meal plan saved as template successfully!');
      setConfirmationType('success');
      setIsConfirmationModalOpen(true);
      setMealPlanName('');
    } catch (error) {
      console.error('Error saving meal plan as template:', error);
      setConfirmationMessage('Failed to save meal plan as template: ' + (error.message || 'Unknown error'));
      setConfirmationType('error');
      setIsConfirmationModalOpen(true);
    }
  };

  // Handle updating star rating
  const handleUpdateStarRating = async (savedPlanId, rating) => {
    if (!accessToken) return;
    
    try {
      await updateSavedMealPlan(savedPlanId, { stars: rating }, accessToken);
      
      // Update the local state
      setSavedMealPlans(prevPlans =>
        prevPlans.map(plan =>
          plan.id === savedPlanId ? { ...plan, stars: rating } : plan
        )
      );
      
      // Also update selectedSavedPlan if the modal is open for this plan
      if (selectedSavedPlan && selectedSavedPlan.id === savedPlanId) {
        setSelectedSavedPlan(prev => ({ ...prev, stars: rating }));
      }
    } catch (error) {
      console.error('Error updating star rating:', error);
      alert('Failed to update rating');
    }
  };

  // Calculate nutrition totals from meal plan
  const calculateNutritionTotals = (plan) => {
    if (!plan || !plan.selectedItems) return null;
    
    // Helper to safely parse a number value
    const parseNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(parsed) ? 0 : parsed;
    };
    
    return plan.selectedItems.reduce((totals, item) => {
      return {
        calories: (totals.calories || 0) + parseNumber(item.calories),
        totalFat: (totals.totalFat || 0) + parseNumber(item.totalFat),
        protein: (totals.protein || 0) + parseNumber(item.protein),
        totalCarb: (totals.totalCarb || 0) + parseNumber(item.totalCarb),
      };
    }, {
      calories: 0,
      totalFat: 0,
      protein: 0,
      totalCarb: 0
    });
  };

  // Get nutrition goals for the day
  const getDailyGoals = () => {
    if (!nutritionPlan || !nutritionPlan.metrics) return null;
    
    // Convert metrics format to dailyTargets format
    // metrics format: { calories: { target: 2000 }, protein: { target: 150 }, ... }
    // dailyTargets format: { calories: 2000, protein: 150, carbohydrates: 250, fat: 65 }
    const goals = {};
    if (nutritionPlan.metrics.calories?.target) {
      goals.calories = parseFloat(nutritionPlan.metrics.calories.target) || 0;
    }
    if (nutritionPlan.metrics.protein?.target) {
      goals.protein = parseFloat(nutritionPlan.metrics.protein.target) || 0;
    }
    if (nutritionPlan.metrics.carbohydrates?.target) {
      goals.carbohydrates = parseFloat(nutritionPlan.metrics.carbohydrates.target) || 0;
    }
    if (nutritionPlan.metrics.fat?.target) {
      goals.fat = parseFloat(nutritionPlan.metrics.fat.target) || 0;
    }
    
    // Return null if no goals found
    return Object.keys(goals).length > 0 ? goals : null;
  };

  if (loading) {
    return (
      <div className="meal-planning-loading">
        <p>Loading meal plans...</p>
      </div>
    );
  }

  return (
    <div className="meal-planning">
      <header className="meal-planning-header">
        <div>
          <h1>Meal Planning</h1>
          <p>Plan your meals for today</p>
        </div>
      </header>

      <div className="meal-planning-calendar">
        <h2 className="planner-title">Your Planner For Today</h2>
        <div className="calendar-grid">
          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="calendar-row">
              <div className="calendar-time-column">
                <div className="meal-type-label">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
              </div>
              {todayDates.map((date, dateIndex) => {
                const plan = getMealPlanForCell(date, mealType);
                return (
                  <div 
                    key={`${mealType}-${dateIndex}-${formatDate(date)}`} 
                    className="calendar-cell"
                    onClick={() => handleCellClick(date, mealType)}
                    style={{ cursor: 'pointer' }}
                  >
                    {plan && (() => {
                      const colors = getDiningHallColor(plan.locationName);
                      // Debug logging
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Meal plan location:', plan.locationName, 'Colors:', colors);
                      }
                      return (
                        <div 
                          className="meal-plan-item"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent cell click from firing
                            handleMealPlanClick(plan);
                          }}
                          style={{
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                            borderWidth: '1px',
                            borderStyle: 'solid'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.bg;
                          }}
                        >
                          <div className="meal-plan-header">
                            <span className="meal-plan-location">{plan.locationName}</span>
                          </div>
                          <div className="meal-plan-items">
                            {plan.selectedItems.slice(0, 2).map((item, idx) => (
                              <span key={`${plan.id}-item-${item.id}-${idx}`} className="meal-plan-item-name">
                                {capitalizeFoodName(item.name)}
                              </span>
                            ))}
                            {plan.selectedItems.length > 2 && (
                              <span className="meal-plan-item-more">
                                +{plan.selectedItems.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Saved Meal Plans Section */}
      <div className="saved-meal-plans-section">
        <div className="saved-meal-plans-header">
          <h2>Saved Meal Plans</h2>
          <div className="saved-meal-plans-header-actions">
            <button
              className="filter-toggle-btn"
              onClick={() => setShowSavedPlansFilters(!showSavedPlansFilters)}
              title="Filter saved meal plans"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              {((savedPlanFilterStar || savedPlanFilterHouse || savedPlanFilterMealType || savedPlanFilterAvailability) && (
                <span className="filter-badge">
                  {[savedPlanFilterStar, savedPlanFilterHouse, savedPlanFilterMealType, savedPlanFilterAvailability].filter(Boolean).length}
                </span>
              ))}
            </button>
          </div>
        </div>
        
        {showSavedPlansFilters && (
          <div className="saved-meal-plans-filters">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Star Rating</label>
                <CustomSelect
                  value={savedPlanFilterStar}
                  onChange={(value) => setSavedPlanFilterStar(value)}
                  options={[
                    { value: '', label: 'All Ratings' },
                    { value: '5', label: '5 Stars' },
                    { value: '4', label: '4+ Stars' },
                    { value: '3', label: '3+ Stars' },
                    { value: '2', label: '2+ Stars' },
                    { value: '1', label: '1+ Stars' },
                  ]}
                  placeholder="Filter by rating"
                />
              </div>
              
              <div className="filter-group">
                <label>Dining Hall</label>
                <CustomSelect
                  value={savedPlanFilterHouse}
                  onChange={(value) => setSavedPlanFilterHouse(value)}
                  options={[
                    { value: '', label: 'All Dining Halls' },
                    ...locations.map(loc => ({
                      value: loc.location_name,
                      label: loc.location_name
                    }))
                  ]}
                  placeholder="Filter by dining hall"
                />
              </div>
              
              <div className="filter-group">
                <label>Meal Type</label>
                <CustomSelect
                  value={savedPlanFilterMealType}
                  onChange={(value) => setSavedPlanFilterMealType(value)}
                  options={[
                    { value: '', label: 'All Meal Types' },
                    { value: 'breakfast', label: 'Breakfast' },
                    { value: 'lunch', label: 'Lunch' },
                    { value: 'dinner', label: 'Dinner' },
                  ]}
                  placeholder="Filter by meal type"
                />
              </div>
              
              <div className="filter-group">
                <label>Availability</label>
                <CustomSelect
                  value={savedPlanFilterAvailability}
                  onChange={(value) => setSavedPlanFilterAvailability(value)}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'available', label: 'Available Today' },
                    { value: 'unavailable', label: 'Not Available Today' },
                  ]}
                  placeholder="Filter by availability"
                />
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSavedPlanFilterStar('');
                setSavedPlanFilterHouse('');
                setSavedPlanFilterMealType('');
                setSavedPlanFilterAvailability('');
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
        
        <div className="saved-meal-plans-grid">
          {filteredSavedMealPlans.map((savedPlan) => {
            const availability = checkSavedPlanAvailability(savedPlan);
            return (
              <div 
                key={savedPlan.id} 
                className="saved-meal-plan-card"
                onClick={() => {
                  setSelectedSavedPlan(savedPlan);
                  setIsSavedPlanModalOpen(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                {savedPlan.image && (
                  <div className="saved-meal-plan-image">
                    <img src={savedPlan.image} alt={savedPlan.title} />
                  </div>
                )}
                <div className="saved-meal-plan-content">
                  <div className="saved-meal-plan-title-row">
                    <h3 className="saved-meal-plan-title">{savedPlan.title}</h3>
                    <div className="saved-meal-plan-stars">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`star ${star <= (savedPlan.stars || 0) ? 'filled' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening the modal
                            handleUpdateStarRating(savedPlan.id, star);
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="saved-meal-plan-info">
                    <span className="saved-meal-plan-meal-type">
                      {savedPlan.mealType.charAt(0).toUpperCase() + savedPlan.mealType.slice(1)}
                    </span>
                    <span className="saved-meal-plan-location">{savedPlan.locationName}</span>
                    <span className="saved-meal-plan-count">
                      Made {savedPlan.usageCount || 0} time{savedPlan.usageCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {savedPlan.selectedItems && savedPlan.selectedItems.length > 0 && (
                    <div className="saved-meal-plan-items">
                      <div className="saved-meal-plan-items-label">Items:</div>
                      <div className="saved-meal-plan-items-list">
                        {savedPlan.selectedItems.slice(0, 3).map((item, idx) => (
                          <span key={`${savedPlan.id}-item-${item.id || idx}`} className="saved-meal-plan-item-chip">
                            {capitalizeFoodName(item.name)}
                          </span>
                        ))}
                        {savedPlan.selectedItems.length > 3 && (
                          <span className="saved-meal-plan-item-chip saved-meal-plan-item-more">
                            +{savedPlan.selectedItems.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {availability.canMake && (
                    <div className="saved-meal-plan-availability available">
                      ✓ Available for {availability.mealTypes.join(', ')} today
                    </div>
                  )}
                  {!availability.canMake && (
                    <div className="saved-meal-plan-availability unavailable">
                      Not available today
                    </div>
                  )}
                  <div className="saved-meal-plan-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseSavedPlan(savedPlan);
                        setIsSavedPlanModalOpen(false);
                        setSelectedSavedPlan(null);
                      }}
                      disabled={!availability.canMake}
                    >
                      Use Plan
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSavedPlan(savedPlan.id);
                        setIsSavedPlanModalOpen(false);
                        setSelectedSavedPlan(null);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredSavedMealPlans.length === 0 && savedMealPlans.length > 0 && (
            <div className="no-saved-plans">
              <p>No saved meal plans match your filters. Try adjusting your filters.</p>
            </div>
          )}
          {savedMealPlans.length === 0 && (
            <div className="no-saved-plans">
              <p>No saved meal plans yet. Save a meal plan to reuse it later!</p>
            </div>
          )}
        </div>
      </div>

      {/* Saved Meal Plan Detail Modal */}
      {isSavedPlanModalOpen && selectedSavedPlan && (
        <div className="meal-planning-modal-overlay" onClick={() => {
          setIsSavedPlanModalOpen(false);
          setSelectedSavedPlan(null);
        }}>
          <div className="meal-planning-modal saved-meal-plan-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSavedPlan.title}</h2>
              <button className="modal-close" onClick={() => {
                setIsSavedPlanModalOpen(false);
                setSelectedSavedPlan(null);
              }}>×</button>
            </div>

            <div className="modal-content">
              {selectedSavedPlan.image && (
                <div className="saved-meal-plan-modal-image">
                  <img src={selectedSavedPlan.image} alt={selectedSavedPlan.title} />
                </div>
              )}

              <div className="saved-meal-plan-modal-stars-section">
                <label>Rating:</label>
                <div className="saved-meal-plan-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`star ${star <= (selectedSavedPlan.stars || 0) ? 'filled' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateStarRating(selectedSavedPlan.id, star);
                      }}
                      style={{ cursor: 'pointer' }}
                      title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>

              <div className="saved-meal-plan-modal-info">
                <div className="info-row">
                  <span className="info-label">Meal Type:</span>
                  <span className="info-value">
                    {selectedSavedPlan.mealType.charAt(0).toUpperCase() + selectedSavedPlan.mealType.slice(1)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Dining Hall:</span>
                  <span className="info-value">{selectedSavedPlan.locationName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Times Used:</span>
                  <span className="info-value">
                    {selectedSavedPlan.usageCount || 0} time{(selectedSavedPlan.usageCount || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {selectedSavedPlan.selectedItems && selectedSavedPlan.selectedItems.length > 0 && (
                <div className="saved-meal-plan-modal-items-section">
                  <h3>Items ({selectedSavedPlan.selectedItems.length})</h3>
                  <div className="saved-meal-plan-modal-items-list">
                    {selectedSavedPlan.selectedItems.map((item, idx) => (
                      <div key={`${selectedSavedPlan.id}-modal-item-${item.id || idx}`} className="saved-meal-plan-modal-item">
                        <span className="item-name">{capitalizeFoodName(item.name)}</span>
                        {item.calories && (
                          <span className="item-calories">{Math.round(item.calories)} cal</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const totals = calculateNutritionTotals(selectedSavedPlan);
                if (totals) {
                  return (
                    <div className="saved-meal-plan-modal-nutrition">
                      <h3>Nutrition Totals</h3>
                      <div className="nutrition-metrics">
                        <div className="nutrition-metric">
                          <span className="metric-label">Calories</span>
                          <span className="metric-value">{Math.round(totals.calories || 0)}</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Protein</span>
                          <span className="metric-value">{Math.round(totals.protein || 0)}g</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Carbs</span>
                          <span className="metric-value">{Math.round(totals.totalCarb || 0)}g</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Fat</span>
                          <span className="metric-value">{Math.round(totals.totalFat || 0)}g</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {(() => {
                const availability = checkSavedPlanAvailability(selectedSavedPlan);
                return (
                  <div className={`saved-meal-plan-availability ${availability.canMake ? 'available' : 'unavailable'}`}>
                    {availability.canMake ? (
                      <>✓ Available for {availability.mealTypes.join(', ')} today</>
                    ) : (
                      <>Not available today</>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => {
                  handleUseSavedPlan(selectedSavedPlan);
                  setIsSavedPlanModalOpen(false);
                  setSelectedSavedPlan(null);
                }}
                disabled={!checkSavedPlanAvailability(selectedSavedPlan).canMake}
              >
                Use Plan
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this saved meal plan?')) {
                    handleDeleteSavedPlan(selectedSavedPlan.id);
                    setIsSavedPlanModalOpen(false);
                    setSelectedSavedPlan(null);
                  }
                }}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsSavedPlanModalOpen(false);
                  setSelectedSavedPlan(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Input Modal */}
      {isNameModalOpen && (
        <div className="meal-planning-modal-overlay" onClick={() => setIsNameModalOpen(false)}>
          <div className="meal-planning-modal name-input-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save Meal Plan as Template</h2>
              <button className="modal-close" onClick={() => setIsNameModalOpen(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label htmlFor="meal-plan-name">Enter a name for this saved meal plan:</label>
                <input
                  id="meal-plan-name"
                  type="text"
                  className="form-input"
                  value={mealPlanName}
                  onChange={(e) => setMealPlanName(e.target.value)}
                  placeholder="e.g., My Favorite Breakfast"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirmSaveMealPlanAsTemplate();
                    } else if (e.key === 'Escape') {
                      setIsNameModalOpen(false);
                    }
                  }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsNameModalOpen(false);
                  setMealPlanName('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmSaveMealPlanAsTemplate}
                disabled={!mealPlanName || !mealPlanName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmationModalOpen && (
        <div className="meal-planning-modal-overlay" onClick={() => setIsConfirmationModalOpen(false)}>
          <div className="meal-planning-modal confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{confirmationType === 'error' ? 'Error' : ''}</h2>
              <button className="modal-close" onClick={() => setIsConfirmationModalOpen(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className={`confirmation-message ${confirmationType}`}>
                {confirmationMessage}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className={`btn ${confirmationType === 'success' ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => setIsConfirmationModalOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="meal-planning-modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="meal-planning-modal delete-confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="modal-close" onClick={() => setIsDeleteModalOpen(false)}>×</button>
            </div>

            <div className="modal-content">
              <div className="delete-confirmation-message">
                {deleteType === 'mealPlan' 
                  ? 'Are you sure you want to delete this meal plan? This action cannot be undone.'
                  : 'Are you sure you want to delete this saved meal plan? This action cannot be undone.'}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteTargetId(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating add button */}
      <button className="meal-planning-add-btn" onClick={handleAddClick} title="Add Meal Plan">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Side Panel for Meal Plan Details */}
      {isSidePanelOpen && selectedMealPlan && (
        <div className="meal-plan-side-panel-overlay" onClick={handleCloseSidePanel}>
          <div className="meal-plan-side-panel" onClick={(e) => e.stopPropagation()}>
            <div className="side-panel-header">
              <h2>Meal Plan Details</h2>
              <div className="side-panel-header-actions">
                <button 
                  className="side-panel-save-btn" 
                  onClick={handleSaveMealPlanAsTemplate}
                  title="Save as Template"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
              <button className="side-panel-close" onClick={handleCloseSidePanel}>×</button>
              </div>
            </div>
            
            <div className="side-panel-content">
              <div className="meal-plan-info-section">
                <h3>Meal Information</h3>
                <div className="info-row">
                  <span className="info-label">Date:</span>
                  <span className="info-value">{formatDateDisplay(new Date(selectedMealPlan.date))}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Meal Type:</span>
                  <span className="info-value">{selectedMealPlan.mealType.charAt(0).toUpperCase() + selectedMealPlan.mealType.slice(1)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Dining Hall:</span>
                  <span className="info-value">{selectedMealPlan.locationName}</span>
                </div>
              </div>

              <div className="meal-items-section">
                <h3>Selected Items ({selectedMealPlan.selectedItems.length})</h3>
                <div className="meal-items-list">
                  {selectedMealPlan.selectedItems.map((item, idx) => (
                    <div key={`${selectedMealPlan.id}-detail-${item.id}-${idx}`} className="meal-item-detail">
                      <span className="item-name">{capitalizeFoodName(item.name)}</span>
                      <span className="item-nutrition">
                        {item.calories ? `${item.calories} cal` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {(() => {
                const totals = calculateNutritionTotals(selectedMealPlan);
                const goals = getDailyGoals();
                
                if (!totals) return null;
                
                return (
                  <>
                    <div className="nutrition-totals-section">
                      <h3>Nutrition Totals</h3>
                      <div className="nutrition-metrics">
                        <div className="nutrition-metric">
                          <span className="metric-label">Calories</span>
                          <span className="metric-value">{Math.round(totals.calories || 0)}</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Protein</span>
                          <span className="metric-value">{Math.round(totals.protein || 0)}g</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Carbs</span>
                          <span className="metric-value">{Math.round(totals.totalCarb || 0)}g</span>
                        </div>
                        <div className="nutrition-metric">
                          <span className="metric-label">Fat</span>
                          <span className="metric-value">{Math.round(totals.totalFat || 0)}g</span>
                        </div>
                      </div>
                    </div>

                    {goals && (
                      <div className="goals-progress-section">
                        <h3>Daily Goals Progress</h3>
                        <div className="goals-progress">
                          {(() => {
                            // Helper to get current consumption from progress data
                            const getCurrentConsumption = (metricKey) => {
                              if (!dailyProgress || !dailyProgress.progress) {
                                console.log('No dailyProgress or progress:', { dailyProgress, metricKey });
                                return 0;
                              }
                              const metric = dailyProgress.progress[metricKey];
                              const value = metric?.current || 0;
                              console.log('Current consumption:', { metricKey, metric, value });
                              return value;
                            };

                            // Helper to calculate percentages
                            const calculatePercentage = (value, goal) => {
                              if (!goal || goal === 0) return 0;
                              return Math.min((value / goal) * 100, 100);
                            };

                            return (
                              <>
                                {goals.calories && (
                                  <div className="goal-progress-item">
                                    <div className="goal-progress-header">
                                      <span className="goal-label">Calories</span>
                                      <span className="goal-percentage">
                                        {(() => {
                                          const mealValue = totals.calories || 0;
                                          const mealPercent = calculatePercentage(mealValue, goals.calories);
                                          return `+${Math.round(mealValue)} (+${Math.round(mealPercent)}%)`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="goal-progress-bar">
                                      {(() => {
                                        const current = getCurrentConsumption('calories');
                                        const mealValue = totals.calories || 0;
                                        const currentPercent = calculatePercentage(current, goals.calories);
                                        const mealPercent = calculatePercentage(mealValue, goals.calories);
                                        console.log('Calories progress:', { 
                                          current, 
                                          mealValue, 
                                          currentPercent, 
                                          mealPercent, 
                                          goals: goals.calories,
                                          dailyProgress 
                                        });
                                        return (
                                          <>
                                            {current > 0 && (
                                            <div 
                                                className={`goal-progress-fill goal-progress-current ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                                style={{ width: `${Math.max(currentPercent, 1)}%` }}
                                            ></div>
                                            )}
                                            {mealPercent > 0 && (
                                            <div 
                                                className={`goal-progress-fill goal-progress-meal ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ 
                                                width: `${mealPercent}%`,
                                                left: `${currentPercent}%`
                                              }}
                                            ></div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {goals.protein && (
                                  <div className="goal-progress-item">
                                    <div className="goal-progress-header">
                                      <span className="goal-label">Protein</span>
                                      <span className="goal-percentage">
                                        {(() => {
                                          const mealValue = totals.protein || 0;
                                          const mealPercent = calculatePercentage(mealValue, goals.protein);
                                          return `+${Math.round(mealValue)}g (+${Math.round(mealPercent)}%)`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="goal-progress-bar">
                                      {(() => {
                                        const current = getCurrentConsumption('protein');
                                        const mealValue = totals.protein || 0;
                                        const currentPercent = calculatePercentage(current, goals.protein);
                                        const mealPercent = calculatePercentage(mealValue, goals.protein);
                                        return (
                                          <>
                                            <div 
                                              className={`goal-progress-fill goal-progress-current ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className={`goal-progress-fill goal-progress-meal ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ 
                                                width: `${mealPercent}%`,
                                                left: `${currentPercent}%`
                                              }}
                                            ></div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {goals.carbohydrates && (
                                  <div className="goal-progress-item">
                                    <div className="goal-progress-header">
                                      <span className="goal-label">Carbs</span>
                                      <span className="goal-percentage">
                                        {(() => {
                                          const mealValue = totals.totalCarb || 0;
                                          const mealPercent = calculatePercentage(mealValue, goals.carbohydrates);
                                          return `+${Math.round(mealValue)}g (+${Math.round(mealPercent)}%)`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="goal-progress-bar">
                                      {(() => {
                                        const current = getCurrentConsumption('totalCarbs');
                                        const mealValue = totals.totalCarb || 0;
                                        const currentPercent = calculatePercentage(current, goals.carbohydrates);
                                        const mealPercent = calculatePercentage(mealValue, goals.carbohydrates);
                                        return (
                                          <>
                                            <div 
                                              className={`goal-progress-fill goal-progress-current ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className={`goal-progress-fill goal-progress-meal ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ 
                                                width: `${mealPercent}%`,
                                                left: `${currentPercent}%`
                                              }}
                                            ></div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                                {goals.fat && (
                                  <div className="goal-progress-item">
                                    <div className="goal-progress-header">
                                      <span className="goal-label">Fat</span>
                                      <span className="goal-percentage">
                                        {(() => {
                                          const mealValue = totals.totalFat || 0;
                                          const mealPercent = calculatePercentage(mealValue, goals.fat);
                                          return `+${Math.round(mealValue)}g (+${Math.round(mealPercent)}%)`;
                                        })()}
                                      </span>
                                    </div>
                                    <div className="goal-progress-bar">
                                      {(() => {
                                        const current = getCurrentConsumption('totalFat');
                                        const mealValue = totals.totalFat || 0;
                                        const currentPercent = calculatePercentage(current, goals.fat);
                                        const mealPercent = calculatePercentage(mealValue, goals.fat);
                                        return (
                                          <>
                                            <div 
                                              className={`goal-progress-fill goal-progress-current ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className={`goal-progress-fill goal-progress-meal ${isMealPlanCompleted ? 'goal-progress-completed' : ''}`}
                                              style={{ 
                                                width: `${mealPercent}%`,
                                                left: `${currentPercent}%`
                                              }}
                                            ></div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {!goals && (
                      <div className="no-goals-message">
                        <p>No active nutrition plan. Set up goals in the Nutrition Plan page to see how this meal helps you reach them.</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="side-panel-footer">
              <button 
                className={`btn btn-primary ${isMealPlanCompleted ? 'btn-completed' : ''}`}
                onClick={handleCompleteMealPlan}
                disabled={isMealPlanCompleted}
              >
                {isMealPlanCompleted ? 'Completed' : 'Complete'}
              </button>
              <div className="side-panel-footer-right">
              <button className="btn btn-secondary" onClick={handleUpdate}>
                Update
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete Meal Plan Modal (Create Post) */}
      {showCompleteModal && completeModalScanData && selectedMealPlan && (
        <CreatePostModal
          isOpen={showCompleteModal}
          onClose={async () => {
            setShowCompleteModal(false);
            setCompleteModalScanData(null);
            // Re-check if meal plan is completed after closing
            // Add a small delay to ensure the meal log is saved to Firestore
            if (selectedMealPlan && accessToken) {
              setTimeout(async () => {
                try {
                  // Query only by date to avoid index requirement, then filter by meal type in memory
                  const mealLogs = await getMealLogs({
                    startDate: selectedMealPlan.date,
                    endDate: selectedMealPlan.date,
                  }, accessToken);
                  
                  // Use the same comparison logic as the event listener
                  const isCompleted = mealLogs.meals && mealLogs.meals.some(meal => {
                    const mealDateStr = meal.mealDate ? String(meal.mealDate).split('T')[0] : '';
                    const planDateStr = selectedMealPlan.date ? String(selectedMealPlan.date).split('T')[0] : '';
                    const dateMatch = mealDateStr === planDateStr;
                    const typeMatch = meal.mealType?.toLowerCase() === selectedMealPlan.mealType?.toLowerCase();
                    return dateMatch && typeMatch;
                  });
                  
                  setIsMealPlanCompleted(isCompleted || false);
                } catch (err) {
                  console.error('Error checking completion:', err);
                }
              }, 1000); // Wait 1 second for Firestore to save
            }
          }}
          scanData={completeModalScanData}
          imageUrl={null}
          imageFile={null}
          initialData={{
            locationId: selectedMealPlan.locationId,
            locationName: selectedMealPlan.locationName,
            mealDate: selectedMealPlan.date,
            mealType: selectedMealPlan.mealType,
          }}
        />
      )}

      {/* Add Meal Plan Modal */}
      {isAddModalOpen && (
        <div className="meal-planning-modal-overlay" onClick={() => {
          setIsAddModalOpen(false);
          setMealPlanToUpdate(null);
        }}>
          <div className="meal-planning-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{mealPlanToUpdate ? 'Update Meal Plan' : 'Add Meal Plan'}</h2>
              <button className="modal-close" onClick={() => {
                setIsAddModalOpen(false);
                setMealPlanToUpdate(null);
              }}>×</button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Meal Type</label>
                <CustomSelect
                  value={selectedMealType}
                  onChange={handleMealTypeChange}
                  options={[
                    { value: '', label: 'Select meal type' },
                    { value: 'breakfast', label: 'Breakfast' },
                    { value: 'lunch', label: 'Lunch' },
                    { value: 'dinner', label: 'Dinner' }
                  ]}
                  placeholder="Select meal type"
                  className="form-input-wrapper"
                />
              </div>

              <div className="form-group">
                <label>Dining Hall</label>
                <CustomSelect
                  value={selectedLocationId}
                  onChange={handleLocationChange}
                  options={locations.length > 0 
                    ? [
                        { value: '', label: 'Select dining hall' },
                        ...locations.map((loc, index) => ({
                          value: loc.location_number,
                          label: loc.location_name
                        }))
                      ]
                    : [{ value: '', label: 'Loading dining halls...' }]
                  }
                  placeholder="Select dining hall"
                  disabled={locations.length === 0}
                  className="form-input-wrapper"
                />
              </div>

              {menuLoading && (
                <div className="menu-loading">Loading menu items...</div>
              )}

              {!menuLoading && Object.keys(menuItems).length > 0 && (
                <div className="form-group">
                  <label>Select Items ({selectedItems.length} selected)</label>
                  <div className="menu-items-by-category">
                    {Object.entries(menuItems).map(([category, items], categoryIndex) => {
                      // Map category names to better display titles
                      const categoryTitles = {
                        'Entrees': 'Main Dishes',
                        'Entree': 'Main Dishes',
                        'Main Course': 'Main Dishes',
                        'Sides': 'Side Dishes',
                        'Side': 'Side Dishes',
                        'Salads': 'Salad Bar',
                        'Salad': 'Salad Bar',
                        'Soups': 'Soups',
                        'Soup': 'Soups',
                        'Desserts': 'Desserts',
                        'Dessert': 'Desserts',
                        'Beverages': 'Drinks',
                        'Beverage': 'Drinks',
                        'Drinks': 'Drinks',
                        'Drink': 'Drinks',
                        'Breakfast Items': 'Breakfast Options',
                        'Breakfast': 'Breakfast Options',
                      };
                      
                      const displayTitle = categoryTitles[category] || category || 'Other Options';
                      
                      return (
                        <div key={`category-${category}-${categoryIndex}`} className="menu-category-section">
                          <h4 className="menu-category-title">{displayTitle}</h4>
                          <div className="menu-items-list">
                            {items.map((item, itemIndex) => {
                              const isSelected = selectedItems.find(i => i.id === item.id);
                              const { cleanedName, isVegan } = cleanItemName(item.name);
                              return (
                                <div
                                  key={`${category}-${item.id}-${itemIndex}`}
                                  className={`menu-item-card ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleItemSelection(item)}
                                >
                                  <div className="menu-item-name-container">
                                    <div className="menu-item-name">{capitalizeFoodName(cleanedName)}</div>
                                  </div>
                                  {isVegan && (
                                    <div className="vegan-badge" title="Vegan">Vegan</div>
                                  )}
                                  <div className="menu-item-details">
                                    <span>{item.calories} cal</span>
                                    {item.protein && <span>{item.protein}g protein</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!menuLoading && selectedLocationId && selectedDate && selectedMealType && Object.keys(menuItems).length === 0 && (
                <div className="no-menu-items">No menu items available for this selection.</div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setIsAddModalOpen(false);
                setMealPlanToUpdate(null);
              }}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!selectedDate || !selectedMealType || !selectedLocationId || selectedItems.length === 0}
              >
                {mealPlanToUpdate ? 'Update Meal Plan' : 'Add Meal Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlanning;

