import React, { useState, useEffect, useRef } from 'react';
import './NutritionPlan.css';
import { createNutritionPlan, getActiveNutritionPlan, updateNutritionPlan } from '../services/nutritionPlanService';

const NutritionPlan = () => {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [metrics, setMetrics] = useState({});
  const [showSummary, setShowSummary] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load existing nutrition plan on component mount
  useEffect(() => {
    const loadExistingPlan = async () => {
      try {
        setLoading(true);
        const plan = await getActiveNutritionPlan();
        
        if (plan) {
          // Load the plan data into the form
          setSavedPlan(plan);
          setSelectedPreset(plan.preset || '');
          setMetrics(plan.metrics || {});
          setShowSummary(true);
          setIsEditMode(true);
        }
      } catch (err) {
        console.error('Error loading nutrition plan:', err);
        // Don't show error if plan doesn't exist - just means this is a new user
        if (!err.message.includes('not found')) {
          setError('Failed to load your nutrition plan. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadExistingPlan();
  }, []);

  // Debug: Log when metrics state changes
  useEffect(() => {
    console.log('Metrics state updated:', metrics);
    console.log('Number of enabled metrics:', Object.values(metrics).filter(m => m.enabled).length);
  }, [metrics]);

  const presets = {
    'balanced': {
      name: '⚖️ Balanced Diet',
      description: 'Track all major macronutrients for balanced nutrition',
      metrics: {
        calories: { target: '2000' },
        protein: { target: '50' },
        totalCarbs: { target: '275' },
        totalFat: { target: '65' },
        fiber: { target: '25' },
        sodium: { target: '2300' }
      }
    },
    'high-protein': {
      name: '🏋️ High Protein',
      description: 'Focus on protein intake for muscle building',
      metrics: {
        calories: { target: '2200' },
        protein: { target: '150' },
        totalCarbs: { target: '200' },
        totalFat: { target: '70' },
        saturatedFat: { target: '20' }
      }
    },
    'low-sodium': {
      name: '🧂 Low Sodium',
      description: 'Monitor and limit sodium intake',
      metrics: {
        calories: { target: '2000' },
        sodium: { target: '1500' },
        protein: { target: '50' },
        fiber: { target: '25' },
        cholesterol: { target: '300' }
      }
    },
    'heart-healthy': {
      name: '❤️ Heart Healthy',
      description: 'Track nutrients important for cardiovascular health',
      metrics: {
        calories: { target: '2000' },
        totalFat: { target: '50' },
        saturatedFat: { target: '13' },
        transFat: { target: '0' },
        cholesterol: { target: '300' },
        sodium: { target: '1500' },
        fiber: { target: '30' }
      }
    }
  };

  const metricCategories = {
    energy: {
      title: 'Energy & Calories',
      metrics: [
        { id: 'calories', label: 'Calories', defaultUnit: 'kcal', placeholder: '2000' },
        { id: 'caloriesFromFat', label: 'Calories from Fat', defaultUnit: 'kcal', placeholder: '600' }
      ]
    },
    macronutrients: {
      title: 'Macronutrients',
      metrics: [
        { id: 'protein', label: 'Protein', defaultUnit: 'g', placeholder: '50' },
        { id: 'totalCarbs', label: 'Total Carbohydrates', defaultUnit: 'g', placeholder: '275' },
        { id: 'fiber', label: 'Dietary Fiber', defaultUnit: 'g', placeholder: '25' },
        { id: 'sugars', label: 'Sugars', defaultUnit: 'g', placeholder: '50' }
      ]
    },
    fats: {
      title: 'Fats',
      metrics: [
        { id: 'totalFat', label: 'Total Fat', defaultUnit: 'g', placeholder: '65' },
        { id: 'saturatedFat', label: 'Saturated Fat', defaultUnit: 'g', placeholder: '20' },
        { id: 'transFat', label: 'Trans Fat', defaultUnit: 'g', placeholder: '0' }
      ]
    },
    other: {
      title: 'Other Nutrients',
      metrics: [
        { id: 'cholesterol', label: 'Cholesterol', defaultUnit: 'mg', placeholder: '300' },
        { id: 'sodium', label: 'Sodium', defaultUnit: 'mg', placeholder: '2300' }
      ]
    }
  };

  const unitOptions = ['g', 'mg', 'kcal'];

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    setIsDropdownOpen(false);
    if (presetKey && presets[presetKey]) {
      const newMetrics = {};
      console.log('Loading preset:', presetKey);
      console.log('Preset metrics:', presets[presetKey].metrics);
      
      Object.entries(presets[presetKey].metrics).forEach(([metricId, presetValues]) => {
        // Find the metric in categories to get default unit
        for (const category of Object.values(metricCategories)) {
          const metric = category.metrics.find(m => m.id === metricId);
          if (metric) {
            newMetrics[metricId] = {
              enabled: true,
              unit: metric.defaultUnit,
              target: presetValues.target
            };
            console.log('Added metric:', metricId, newMetrics[metricId]);
            break;
          }
        }
      });
      
      console.log('Setting metrics to:', newMetrics);
      setMetrics(newMetrics);
    } else {
      // Clear metrics for custom
      console.log('Clearing metrics for custom preset');
      setMetrics({});
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get display text for selected preset
  const getSelectedPresetDisplay = () => {
    if (!selectedPreset) return '✨ Custom - Build from scratch';
    const preset = presets[selectedPreset];
    return `${preset.name}: ${preset.description}`;
  };

  const handleMetricToggle = (metricId, defaultUnit) => {
    setMetrics(prev => ({
      ...prev,
      [metricId]: prev[metricId]
        ? { ...prev[metricId], enabled: !prev[metricId].enabled }
        : { enabled: true, unit: defaultUnit, target: '' }
    }));
  };

  const handleMetricChange = (metricId, field, value) => {
    setMetrics(prev => ({
      ...prev,
      [metricId]: { ...prev[metricId], [field]: value }
    }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const enabledMetrics = Object.entries(metrics)
        .filter(([_, value]) => value.enabled)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
      const planData = {
        preset: selectedPreset,
        presetName: selectedPreset ? presets[selectedPreset]?.name : 'Custom Plan',
        metrics: enabledMetrics
      };
      
      console.log('Submitting nutrition plan:', planData);

      let response;
      if (isEditMode && savedPlan?.id) {
        // Update existing plan
        response = await updateNutritionPlan(savedPlan.id, planData);
      } else {
        // Create new plan
        response = await createNutritionPlan(planData);
      }
      
      setSavedPlan(response.plan);
      setShowSummary(true);
      setIsEditMode(true);
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
      setError(err.message || 'Failed to save nutrition plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setShowSummary(false);
    setSavedPlan(null);
    setSelectedPreset('');
    setMetrics({});
    setIsEditMode(false);
    setError(null);
  };

  const handleEditPlan = () => {
    setShowSummary(false);
    setError(null);
  };

  // Helper function to get metric label from ID
  const getMetricLabel = (metricId) => {
    for (const category of Object.values(metricCategories)) {
      const metric = category.metrics.find(m => m.id === metricId);
      if (metric) return metric.label;
    }
    return metricId;
  };

  // Helper function to format Firestore timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Not available';
    
    // Handle Firestore Timestamp object
    if (timestamp._seconds) {
      return new Date(timestamp._seconds * 1000).toLocaleString();
    }
    
    // Handle ISO string
    if (typeof timestamp === 'string') {
      return new Date(timestamp).toLocaleString();
    }
    
    // Handle regular Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    
    return 'Invalid date';
  };

  // Show summary view
  if (showSummary && savedPlan) {
    return (
      <div className="nutrition-plan-page">
        <div className="nutrition-plan-container">
          <div className="hero-section">
            <h1 className="hero-title">Plan Summary</h1>
            <p className="hero-subtitle">Your nutrition tracking goals have been saved</p>
          </div>

          <div className="summary-container">
            <div className="summary-metrics">
              <h3>Your Tracking Goals</h3>
              {savedPlan.presetName && (
                <div className="preset-subtitle">
                  <span className="preset-label-text">Preset Selected:</span>
                  <span className="preset-badge-inline">{savedPlan.presetName}</span>
                </div>
              )}
              
              {Object.entries(savedPlan.metrics).length > 0 && (
                <div className="metrics-summary-grid">
                  {Object.entries(savedPlan.metrics).map(([metricId, metricData]) => (
                    <div key={metricId} className="summary-metric-card">
                      <div className="summary-metric-label">{getMetricLabel(metricId)}</div>
                      <div className="summary-metric-value">
                        {metricData.target ? (
                          <>
                            <span className="target-value">{metricData.target}</span>
                            <span className="target-unit">{metricData.unit}</span>
                          </>
                        ) : (
                          <span className="no-target">No target set</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="summary-meta">
              
              {savedPlan.updatedAt && savedPlan.createdAt !== savedPlan.updatedAt && (
                <p> Created: {formatTimestamp(savedPlan.createdAt)} | Last Updated: {formatTimestamp(savedPlan.updatedAt)}</p>
              )}
            </div>

            <div className="summary-actions">
              <button onClick={handleEditPlan} className="edit-plan-button">
                Edit Plan
              </button>
              <button onClick={handleCreateNew} className="create-new-plan-button">
                Create New Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !savedPlan) {
    return (
      <div className="nutrition-plan-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading your nutrition plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="nutrition-plan-page">
      <div className="nutrition-plan-container">
        <div className="hero-section">
          <h1 className="hero-title">Nutrition Plan</h1>
          <p className="hero-subtitle">Set daily nutrition goals based on HUDS dining hall meals</p>
        </div>

        {error && (
          <div className="error-banner" style={{
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '20px',
            color: '#c33'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="nutrition-form">
          {/* Preset Selection */}
          <div className="preset-section">
            <h2 className="section-title">📋 Quick Start with Preset Goals</h2>
            <p className="section-description">Choose a nutrition goal to auto-populate recommended daily targets</p>
            
            <div className="preset-select-container">
              <label className="preset-label">
                Select Preset:
              </label>
              <div className="custom-select-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className="custom-select-trigger"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={isDropdownOpen}
                >
                  <span className="selected-value">{getSelectedPresetDisplay()}</span>
                  <span className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`}>▼</span>
                </button>
                
                {isDropdownOpen && (
                  <div className="custom-select-dropdown" role="listbox">
                    <div
                      className={`custom-select-option ${selectedPreset === '' ? 'selected' : ''}`}
                      onClick={() => handlePresetChange('')}
                      role="option"
                      aria-selected={selectedPreset === ''}
                    >
                      <span className="option-icon">✨</span>
                      <div className="option-content">
                        <div className="option-title">Custom</div>
                        <div className="option-description">Build from scratch</div>
                      </div>
                    </div>
                    {Object.entries(presets).map(([key, preset]) => (
                      <div
                        key={key}
                        className={`custom-select-option ${selectedPreset === key ? 'selected' : ''}`}
                        onClick={() => handlePresetChange(key)}
                        role="option"
                        aria-selected={selectedPreset === key}
                      >
                        <span className="option-icon">{preset.name.split(' ')[0]}</span>
                        <div className="option-content">
                          <div className="option-title">{preset.name.substring(2)}</div>
                          <div className="option-description">{preset.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="metrics-section">
            <h2 className="section-title">📊 Select Metrics to Track</h2>
            <p className="section-description">Choose nutrition metrics available from HUDS meals and set your daily targets</p>

            {Object.entries(metricCategories).map(([categoryKey, category]) => (
              <div key={categoryKey} className="metric-category">
                <h3 className="category-title">{category.title}</h3>
                <div className="metrics-grid">
                  {category.metrics.map(metric => {
                    const isChecked = metrics[metric.id]?.enabled || false;
                    return (
                      <div key={metric.id} className="metric-card">
                        <label className="metric-checkbox-label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleMetricToggle(metric.id, metric.defaultUnit)}
                          />
                          <span className="metric-name">{metric.label}</span>
                        </label>
                      
                        {metrics[metric.id]?.enabled && (
                          <div className="metric-controls">
                            <div className="control-row">
                              <input
                                type="number"
                                placeholder={`Target: ${metric.placeholder}`}
                                value={metrics[metric.id].target}
                                onChange={(e) => handleMetricChange(metric.id, 'target', e.target.value)}
                                className="metric-input"
                                step="any"
                              />
                              <select
                                value={metrics[metric.id].unit}
                                onChange={(e) => handleMetricChange(metric.id, 'unit', e.target.value)}
                                className="unit-select"
                              >
                                <option value={metric.defaultUnit}>{metric.defaultUnit}</option>
                                {unitOptions.filter(u => u !== metric.defaultUnit).map(unit => (
                                  <option key={unit} value={unit}>{unit}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="submit-plan-button" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Nutrition Plan' : 'Save Nutrition Plan')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NutritionPlan;

