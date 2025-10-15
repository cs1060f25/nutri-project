import React, { useState } from 'react';
import './DietPlan.css';

const DietPlan = () => {
  const [metrics, setMetrics] = useState({
    calories: { enabled: true, target: '', isCustom: false },
    protein: { enabled: true, target: '', isCustom: false },
    waterIntake: { enabled: true, target: '', isCustom: false },
    meals: { enabled: true, target: '', isCustom: false },
    fruitsVegetables: { enabled: true, target: '', isCustom: false },
    sugars: { enabled: true, target: '', isCustom: false }
  });
  
  const [showSummary, setShowSummary] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggle = (metricKey) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        enabled: !prev[metricKey].enabled
      }
    }));
  };

  const handleTargetChange = (metricKey, value) => {
    const isCustom = value === 'custom';
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        target: isCustom ? '' : value,
        isCustom: isCustom
      }
    }));
  };
  
  const handleCustomValueChange = (metricKey, value) => {
    setMetrics(prev => ({
      ...prev,
      [metricKey]: {
        ...prev[metricKey],
        target: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const url = isEditing ? `/diet-plan/${savedPlan.id}` : '/diet-plan';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'save'} diet plan`);
      }
      
      const data = await response.json();
      setSavedPlan(data.dietPlan);
      setShowSummary(true);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateNew = () => {
    setShowSummary(false);
    setSavedPlan(null);
    setIsEditing(false);
    setMetrics({
      calories: { enabled: true, target: '', isCustom: false },
      protein: { enabled: true, target: '', isCustom: false },
      waterIntake: { enabled: true, target: '', isCustom: false },
      meals: { enabled: true, target: '', isCustom: false },
      fruitsVegetables: { enabled: true, target: '', isCustom: false },
      sugars: { enabled: true, target: '', isCustom: false }
    });
  };
  
  const handleEdit = () => {
    // When loading saved metrics, check if values are custom (not in predefined options)
    const loadedMetrics = { ...savedPlan.metrics };
    Object.keys(loadedMetrics).forEach(key => {
      const metricInfo = metricsList.find(m => m.key === key);
      if (metricInfo && loadedMetrics[key].target) {
        const isInOptions = metricInfo.options.includes(loadedMetrics[key].target.toString());
        loadedMetrics[key].isCustom = !isInOptions;
      }
    });
    
    setMetrics(loadedMetrics);
    setShowSummary(false);
    setIsEditing(true);
  };

  const metricsList = [
    { 
      key: 'calories', 
      label: 'Calories', 
      unit: 'kcal/day', 
      options: ['1200', '1500', '1800', '2000', '2200', '2500', '3000']
    },
    { 
      key: 'protein', 
      label: 'Protein', 
      unit: 'grams/day', 
      options: ['50', '75', '100', '125', '150', '175', '200']
    },
    { 
      key: 'waterIntake', 
      label: 'Water Intake', 
      unit: 'cups/day', 
      options: ['4', '6', '8', '10', '12']
    },
    { 
      key: 'meals', 
      label: 'Meals', 
      unit: 'meals/day', 
      options: ['2', '3', '4', '5', '6']
    },
    { 
      key: 'fruitsVegetables', 
      label: 'Fruits & Vegetables', 
      unit: 'servings/day', 
      options: ['3', '5', '7', '9']
    },
    { 
      key: 'sugars', 
      label: 'Sugars', 
      unit: 'grams/day', 
      options: ['15', '20', '25', '30', '35', '40']
    }
  ];

  if (showSummary && savedPlan) {
    const activeMetrics = Object.entries(savedPlan.metrics)
      .filter(([_, value]) => value.enabled && value.target)
      .map(([key, value]) => {
        const metricInfo = metricsList.find(m => m.key === key);
        return { ...metricInfo, target: value.target };
      });

    return (
      <div className="diet-plan-page">
        <div className="diet-plan-container">
          <div className="hero-section">
            <h1 className="hero-title">Diet Plan Saved!</h1>
            <p className="hero-subtitle">Your personalized nutrition plan is ready</p>
          </div>

          <div className="summary-section">
            <div className="success-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#2d6a4f" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            
            <h2 className="summary-title">Your Daily Goals</h2>
            
            <div className="summary-grid">
              {activeMetrics.map(({ key, label, target, unit }) => (
                <div key={key} className="summary-card">
                  <div className="summary-label">{label}</div>
                  <div className="summary-value">
                    {target} <span className="summary-unit">{unit.replace('/day', '')}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-meta">
              <p>Plan ID: <strong>{savedPlan.id}</strong></p>
              <p>Created: <strong>{new Date(savedPlan.createdAt).toLocaleString()}</strong></p>
              {savedPlan.updatedAt && (
                <p>Last Updated: <strong>{new Date(savedPlan.updatedAt).toLocaleString()}</strong></p>
              )}
            </div>

            <div className="summary-actions">
              <button onClick={handleEdit} className="edit-button">
                Edit Plan
              </button>
              <button onClick={handleCreateNew} className="create-new-button">
                Create New Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="diet-plan-page">
      <div className="diet-plan-container">
        <div className="hero-section">
          <h1 className="hero-title">Diet Plan</h1>
          <p className="hero-subtitle">
            {isEditing ? 'Edit your personalized nutrition plan' : 'Create and manage your personalized nutrition plan'}
          </p>
        </div>

        <div className="form-section">
          <h2 className="form-title">
            {isEditing ? 'Edit Your Tracking Goals' : 'What do you want to track?'}
          </h2>
          <p className="form-description">
            Select the metrics you'd like to monitor and set your daily goals
          </p>

          {error && (
            <div className="error-banner">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="metrics-list">
              {metricsList.map(({ key, label, unit, options }) => (
                <div key={key} className="metric-item">
                  <div className="metric-header">
                    <label className="metric-checkbox">
                      <input
                        type="checkbox"
                        checked={metrics[key].enabled}
                        onChange={() => handleToggle(key)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="metric-label">{label}</span>
                    </label>
                  </div>
                  
                  {metrics[key].enabled && (
                    <div className="metric-input-group">
                      <select
                        className="metric-select"
                        value={metrics[key].isCustom ? 'custom' : metrics[key].target}
                        onChange={(e) => handleTargetChange(key, e.target.value)}
                      >
                        <option value="">Select target...</option>
                        {options.map(option => (
                          <option key={option} value={option}>
                            {option} {unit.replace('/day', '')}
                          </option>
                        ))}
                        <option value="custom">Custom Amount</option>
                      </select>
                      
                      {metrics[key].isCustom && (
                        <input
                          type="number"
                          className="metric-custom-input"
                          value={metrics[key].target}
                          onChange={(e) => handleCustomValueChange(key, e.target.value)}
                          placeholder="Enter custom value"
                          min="0"
                          step="any"
                        />
                      )}
                      
                      {!metrics[key].isCustom && metrics[key].target && (
                        <span className="metric-unit-display">per day</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading 
                ? (isEditing ? 'Updating...' : 'Saving...') 
                : (isEditing ? 'Update Diet Plan' : 'Save Diet Plan')
              }
            </button>
            
            {isEditing && (
              <button 
                type="button" 
                className="cancel-edit-button" 
                onClick={() => {
                  setShowSummary(true);
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default DietPlan;

