import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getLocations, getMenuByDate } from '../services/hudsService';
import { getMealPlans, createMealPlan, deleteMealPlan, updateMealPlan } from '../services/mealPlanService';
import { getActiveNutritionPlan } from '../services/nutritionPlanService';
import { getTodayProgress } from '../services/nutritionProgressService';
import CustomSelect from '../components/CustomSelect';
import './MealPlanning.css';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  const { accessToken } = useAuth();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    // Start of current week (Sunday)
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
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

  // Calculate week dates
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display
  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Navigate weeks
  const navigateWeek = (direction) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction * 7));
    setCurrentWeekStart(newDate);
  };

  // Go to today's week
  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const startOfWeek = new Date(today.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);
    setCurrentWeekStart(startOfWeek);
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
        const startDate = formatDate(weekDates[0]);
        const endDate = formatDate(weekDates[6]);
        const data = await getMealPlans(startDate, endDate, accessToken);
        setMealPlans(data.mealPlans || []);
      } catch (error) {
        console.error('Error fetching meal plans:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMealPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentWeekStart]);

  // Get meal plan for a specific date and meal type
  const getMealPlanForCell = (date, mealType) => {
    const dateStr = formatDate(date);
    return mealPlans.find(
      plan => plan.date === dateStr && plan.mealType === mealType
    );
  };

  // Open add modal
  const handleAddClick = (date = null, mealType = '') => {
    const targetDate = date ? formatDate(date) : formatDate(new Date());
    setSelectedDate(targetDate);
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

  // Handle date selection in modal
  const handleDateChange = async (e) => {
    setSelectedDate(e.target.value);
    setSelectedItems([]);
    setMenuItems({});
    
    // If location and meal type are already selected, fetch menu items
    if (e.target.value && selectedLocationId && selectedMealType) {
      await fetchMenuItems(e.target.value, selectedLocationId);
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
          menuData = await getMenuByDate(date, locationId);
        } catch (error) {
          // If the selected location fails, try a few common location numbers
          const fallbackLocations = ['38', '05', '07'];
          let success = false;
          for (const fallbackLoc of fallbackLocations) {
            try {
              menuData = await getMenuByDate(date, fallbackLoc);
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
        menuData = await getMenuByDate(date, locationId);
      }
      
      // Flatten menu structure to get all items
      // The API already filters by location, so we only need to filter by meal type
      const items = [];
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
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setMenuItems({});
    } finally {
      setMenuLoading(false);
    }
  };

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

    try {
      if (mealPlanToUpdate) {
        // Update existing meal plan
        await updateMealPlan(mealPlanToUpdate, {
          date: selectedDate,
          mealType: selectedMealType,
          locationId: selectedLocationId,
          locationName: selectedLocationName,
          selectedItems: selectedItems,
        }, accessToken);
      } else {
        // Create new meal plan
        await createMealPlan({
          date: selectedDate,
          mealType: selectedMealType,
          locationId: selectedLocationId,
          locationName: selectedLocationName,
          selectedItems: selectedItems,
        }, accessToken);
      }

      // Refresh meal plans
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await getMealPlans(startDate, endDate, accessToken);
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
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Failed to save meal plan: ' + error.message);
    }
  };

  // Handle meal plan click
  const handleMealPlanClick = async (plan) => {
    setSelectedMealPlan(plan);
    setIsSidePanelOpen(true);
    
    // Fetch daily progress for the meal plan's date
    // Only fetch if the date is today (since we only have today's progress endpoint)
    const planDate = new Date(plan.date);
    const today = new Date();
    const isToday = planDate.toDateString() === today.toDateString();
    
    if (isToday && accessToken) {
      try {
        const progress = await getTodayProgress(accessToken);
        setDailyProgress(progress);
      } catch (error) {
        console.error('Error fetching daily progress:', error);
        setDailyProgress(null);
      }
    } else {
      // For future dates, we don't have progress data yet
      setDailyProgress(null);
    }
  };

  // Close side panel
  const handleCloseSidePanel = () => {
    setIsSidePanelOpen(false);
    setSelectedMealPlan(null);
    setDailyProgress(null);
  };

  // Delete meal plan
  const handleDelete = async () => {
    if (!selectedMealPlan) return;
    
    if (!window.confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      await deleteMealPlan(selectedMealPlan.id, accessToken);
      
      // Refresh meal plans
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await getMealPlans(startDate, endDate, accessToken);
      setMealPlans(data.mealPlans || []);
      
      // Close side panel
      setIsSidePanelOpen(false);
      setSelectedMealPlan(null);
      setDailyProgress(null);
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      alert('Failed to delete meal plan: ' + error.message);
    }
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
          <p>Plan your meals for the week ahead</p>
        </div>
      </header>
      <div className="week-navigation-container">
        <div className="week-navigation">
          <button className="btn btn-secondary" onClick={() => navigateWeek(-1)}>
            ← Previous Week
          </button>
          <h2>
            {formatDateDisplay(weekDates[0])} - {formatDateDisplay(weekDates[6])}
          </h2>
          <button className="btn btn-secondary" onClick={() => navigateWeek(1)}>
            Next Week →
          </button>
          <button className="btn btn-secondary" onClick={goToToday} style={{ marginLeft: '1rem' }}>
            Today
          </button>
        </div>
      </div>

      <div className="meal-planning-calendar">
        <div className="calendar-grid">
          {/* Header row with days */}
          <div className="calendar-header">
            <div className="calendar-time-column"></div>
            {weekDates.map((date, index) => (
              <div key={`day-header-${formatDate(date)}`} className="calendar-day-header">
                <div className="day-name">{DAYS_OF_WEEK[date.getDay()]}</div>
                <div className="day-number">{date.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Meal rows */}
          {MEAL_TYPES.map((mealType) => (
            <div key={mealType} className="calendar-row">
              <div className="calendar-time-column">
                <div className="meal-type-label">{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</div>
              </div>
              {weekDates.map((date, dateIndex) => {
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
              <button className="side-panel-close" onClick={handleCloseSidePanel}>×</button>
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
                              if (!dailyProgress || !dailyProgress.progress) return 0;
                              const metric = dailyProgress.progress[metricKey];
                              return metric?.current || 0;
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
                                        return (
                                          <>
                                            <div 
                                              className="goal-progress-fill goal-progress-current"
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className="goal-progress-fill goal-progress-meal"
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
                                              className="goal-progress-fill goal-progress-current"
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className="goal-progress-fill goal-progress-meal"
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
                                              className="goal-progress-fill goal-progress-current"
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className="goal-progress-fill goal-progress-meal"
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
                                              className="goal-progress-fill goal-progress-current"
                                              style={{ width: `${currentPercent}%` }}
                                            ></div>
                                            <div 
                                              className="goal-progress-fill goal-progress-meal"
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
              <button className="btn btn-secondary" onClick={handleUpdate}>
                Update
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
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
                <label>Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="form-input"
                />
              </div>

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
                              return (
                                <div
                                  key={`${category}-${item.id}-${itemIndex}`}
                                  className={`menu-item-card ${isSelected ? 'selected' : ''}`}
                                  onClick={() => toggleItemSelection(item)}
                                >
                                  <div className="menu-item-name">{capitalizeFoodName(item.name)}</div>
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

