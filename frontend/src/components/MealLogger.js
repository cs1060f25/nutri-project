import React, { useState, useEffect } from 'react';
import { getTodaysMenu, getLocations } from '../services/hudsService';
import './MealLogger.css';

const MealLogger = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState(1); // 1: metadata, 2: select items
  const [locations, setLocations] = useState([]);
  const [menuData, setMenuData] = useState([]);
  
  // Form state
  const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0]);
  const [mealType, setMealType] = useState('lunch');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedLocationName, setSelectedLocationName] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load locations on mount
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locs = await getLocations();
        setLocations(locs);
        if (locs.length > 0) {
          setSelectedLocation(locs[0].location_number);
          setSelectedLocationName(locs[0].location_name);
        }
      } catch (err) {
        console.error('Error loading locations:', err);
        setError('Failed to load dining hall locations');
      }
    };
    
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen]);

  // Load menu when location selected
  useEffect(() => {
    const fetchMenu = async () => {
      if (!selectedLocation) return;
      
      try {
        setLoading(true);
        const menu = await getTodaysMenu(selectedLocation);
        setMenuData(menu);
        setError(null);
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    if (step === 2 && selectedLocation) {
      fetchMenu();
    }
  }, [step, selectedLocation]);

  const handleNext = () => {
    if (!selectedLocation) {
      setError('Please select a dining hall');
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
        totalCarb: recipe.Total_Carb || '0g',
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
    setSelectedItems(selectedItems.map(item =>
      item.recipeId === recipeId ? { ...item, quantity: qty } : item
    ));
  };

  const calculateTotals = () => {
    const totals = {
      calories: 0,
      totalFat: 0,
      protein: 0,
    };

    selectedItems.forEach(item => {
      const qty = item.quantity || 1;
      const parseNutrient = (value) => {
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      totals.calories += parseNutrient(item.calories) * qty;
      totals.totalFat += parseNutrient(item.totalFat) * qty;
      totals.protein += parseNutrient(item.protein) * qty;
    });

    return {
      calories: Math.round(totals.calories),
      totalFat: totals.totalFat.toFixed(1),
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
      await onSave({
        mealDate,
        mealType,
        locationId: selectedLocation,
        locationName: selectedLocationName,
        items: selectedItems,
      });
      
      // Reset form
      setStep(1);
      setSelectedItems([]);
      setSearchTerm('');
      onClose();
    } catch (err) {
      console.error('Error saving meal:', err);
      setError('Failed to save meal log');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRecipes = () => {
    if (!menuData.length) return [];
    
    // Get recipes for selected meal type
    const recipes = [];
    menuData.forEach(location => {
      Object.values(location.meals).forEach(meal => {
        if (meal.mealName.toLowerCase().includes(mealType)) {
          Object.values(meal.categories).forEach(category => {
            recipes.push(...category.recipes);
          });
        }
      });
    });

    // Filter by search term
    if (searchTerm) {
      return recipes.filter(recipe =>
        (recipe.Recipe_Print_As_Name || recipe.Recipe_Name).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return recipes;
  };

  const handleLocationChange = (locationNumber) => {
    const loc = locations.find(l => l.location_number === locationNumber);
    setSelectedLocation(locationNumber);
    setSelectedLocationName(loc ? loc.location_name : '');
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
            <h3>Meal Details</h3>
            
            <div className="form-group">
              <label htmlFor="mealDate">Date</label>
              <input
                type="date"
                id="mealDate"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label htmlFor="mealType">Meal Type</label>
              <select
                id="mealType"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="location">Dining Hall</label>
              <select
                id="location"
                value={selectedLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
              >
                {locations.map(loc => (
                  <option key={loc.location_number} value={loc.location_number}>
                    {loc.location_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="meal-logger-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleNext}>Next</button>
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

