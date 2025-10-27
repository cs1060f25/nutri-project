import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTodaysMenu, getLocations } from '../services/hudsService';
import { saveMealLog } from '../services/mealLogService';
import MealLogger from '../components/MealLogger';
import './Home.css';

const Home = () => {
  const [menuData, setMenuData] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMealLoggerOpen, setIsMealLoggerOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { user, accessToken } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [locs, menu] = await Promise.all([
          getLocations(),
          getTodaysMenu(selectedLocation),
        ]);
        setLocations(locs);
        setMenuData(menu);
        setError(null);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Unable to load today\'s menu. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedLocation]);

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
    } catch (err) {
      console.error('Error saving meal:', err);
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="home-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading today's menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="home-header">
          <div className="user-info">
            <span className="welcome-text">
              Welcome, <strong>{user?.firstName || user?.email}</strong>
            </span>
          </div>
        </div>
        <div className="error-container">
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="user-info">
          <span className="welcome-text">
            Welcome, <strong>{user?.firstName || user?.email}</strong>
          </span>
        </div>
      </div>

      {saveSuccess && (
        <div className="success-banner">
          ✓ Meal logged successfully!
        </div>
      )}

      <button
        className="fab-button"
        onClick={() => setIsMealLoggerOpen(true)}
        title="Log a meal"
      >
        <span className="fab-icon">+</span>
      </button>

      <MealLogger
        isOpen={isMealLoggerOpen}
        onClose={() => setIsMealLoggerOpen(false)}
        onSave={handleSaveMeal}
      />

      <div className="home-container">
        <div className="hero-section">
          <h1 className="hero-title">Today's Menu</h1>
          <p className="hero-subtitle">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Location Filter */}
        <div className="location-filter">
          <label htmlFor="location-select" className="filter-label">Filter by Dining Hall:</label>
          <select
            id="location-select"
            className="location-select"
            value={selectedLocation || ''}
            onChange={(e) => setSelectedLocation(e.target.value || null)}
          >
            <option value="">All Locations</option>
            {locations.map(loc => (
              <option key={loc.location_number} value={loc.location_number}>
                {loc.location_name}
              </option>
            ))}
          </select>
        </div>

        {/* Menu Display */}
        {menuData.length === 0 ? (
          <div className="no-menu">
            <p>No menu available for today at the selected location.</p>
          </div>
        ) : (
          menuData.map(location => (
            <div key={location.locationNumber} className="location-section">
              <h2 className="location-name">{location.locationName}</h2>
              
              {Object.values(location.meals).map(meal => (
                <div key={meal.mealNumber} className="meal-section">
                  <h3 className="meal-name">{meal.mealName}</h3>
                  
                  {Object.values(meal.categories).map(category => (
                    <div key={category.categoryNumber} className="category-section">
                      <h4 className="category-name">{category.categoryName}</h4>
                      
                      <div className="recipes-grid">
                        {category.recipes.map(recipe => (
                          <div 
                            key={recipe.ID} 
                            className="recipe-card"
                            onClick={() => openNutritionModal(recipe)}
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
                              <span className="calorie-badge">{recipe.Calories} cal</span>
                              {recipe.Allergens && recipe.Allergens.trim() && (
                                <span className="allergen-indicator" title={`Contains: ${recipe.Allergens}`}>
                                  ⚠️ Allergens
                                </span>
                              )}
                            </div>
                            
                            <div className="recipe-footer">
                              <span className="view-nutrition">View Nutrition Facts →</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
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
