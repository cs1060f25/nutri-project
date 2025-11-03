import React, { useState, useEffect } from 'react';
import './NutritionPlan.css';
import { createNutritionPlan, getActiveNutritionPlan, updateNutritionPlan } from '../services/nutritionPlanService';

const NutritionPlan = () => {
  const [selectedPreset, setSelectedPreset] = useState('');
  const [metrics, setMetrics] = useState({});
  const [customMetrics, setCustomMetrics] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [newMetric, setNewMetric] = useState({ name: '', unit: 'g', target: '', frequency: 'daily' });
  const [showSummary, setShowSummary] = useState(false);
  const [savedPlan, setSavedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

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
          setCustomMetrics(plan.customMetrics || []);
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
    'mind-focus': {
      name: '🧘 Mind & Focus',
      description: 'Optimize for cognitive performance and mental clarity',
      metrics: {
        waterIntake: { target: '8', threshold: '6' },
        caffeine: { target: '200', threshold: '400' },
        sodium: { target: '2300', threshold: '2500' },
        vitaminD: { target: '1000', threshold: '' },
        sleepQuality: { target: '8', threshold: '6' }
      }
    },
    'muscle-gain': {
      name: '🏋️ Muscle Gain',
      description: 'Build muscle mass with optimized nutrition',
      metrics: {
        protein: { target: '150', threshold: '120' },
        carbs: { target: '250', threshold: '' },
        fats: { target: '70', threshold: '' },
        creatine: { target: '5', threshold: '' },
        calorySurplus: { target: '300', threshold: '' }
      }
    },
    'endurance': {
      name: '⚡ Endurance Training',
      description: 'Fuel performance and optimize recovery',
      metrics: {
        carbs: { target: '300', threshold: '250' },
        sodium: { target: '2500', threshold: '3000' },
        potassium: { target: '3500', threshold: '' },
        hrv: { target: '65', threshold: '50' },
        energyLevels: { target: '8', threshold: '6' }
      }
    },
    'metabolic': {
      name: '🧪 Metabolic Health',
      description: 'Track biomarkers and metabolic wellness',
      metrics: {
        bloodGlucose: { target: '90', threshold: '100' },
        fastingHours: { target: '16', threshold: '12' },
        fiber: { target: '30', threshold: '25' },
        fatRatio: { target: '0.35', threshold: '' },
        ketones: { target: '0.5', threshold: '' }
      }
    }
  };

  const metricCategories = {
    macronutrients: {
      title: 'Macronutrients',
      metrics: [
        { id: 'protein', label: 'Protein', defaultUnit: 'g', placeholder: '120' },
        { id: 'carbs', label: 'Carbohydrates', defaultUnit: 'g', placeholder: '200' },
        { id: 'fats', label: 'Fats', defaultUnit: 'g', placeholder: '60' },
        { id: 'fiber', label: 'Fiber', defaultUnit: 'g', placeholder: '30' },
        { id: 'calorySurplus', label: 'Calorie Surplus', defaultUnit: 'kcal', placeholder: '300' }
      ]
    },
    micronutrients: {
      title: 'Micronutrients',
      metrics: [
        { id: 'sodium', label: 'Sodium', defaultUnit: 'mg', placeholder: '2300' },
        { id: 'iron', label: 'Iron', defaultUnit: 'mg', placeholder: '18' },
        { id: 'vitaminD', label: 'Vitamin D', defaultUnit: 'IU', placeholder: '1000' },
        { id: 'potassium', label: 'Potassium', defaultUnit: 'mg', placeholder: '3500' },
        { id: 'calcium', label: 'Calcium', defaultUnit: 'mg', placeholder: '1000' }
      ]
    },
    performance: {
      title: 'Performance',
      metrics: [
        { id: 'preWorkoutTiming', label: 'Pre-workout Timing', defaultUnit: 'hours', placeholder: '2' },
        { id: 'energyLevels', label: 'Energy Levels', defaultUnit: 'scale (1-10)', placeholder: '8' },
        { id: 'hrv', label: 'Heart Rate Variability', defaultUnit: 'ms', placeholder: '65' },
        { id: 'caffeine', label: 'Caffeine Intake', defaultUnit: 'mg', placeholder: '200' },
        { id: 'creatine', label: 'Creatine', defaultUnit: 'g', placeholder: '5' }
      ]
    },
    recovery: {
      title: 'Recovery',
      metrics: [
        { id: 'sleepQuality', label: 'Sleep Quality', defaultUnit: 'hours', placeholder: '8' },
        { id: 'restingHeartRate', label: 'Resting Heart Rate', defaultUnit: 'bpm', placeholder: '60' },
        { id: 'sorenessIndex', label: 'Soreness Index', defaultUnit: 'scale (1-10)', placeholder: '3' },
        { id: 'recoveryScore', label: 'Recovery Score', defaultUnit: '%', placeholder: '85' }
      ]
    },
    biomarkers: {
      title: 'Biomarkers',
      metrics: [
        { id: 'bloodGlucose', label: 'Blood Glucose', defaultUnit: 'mg/dL', placeholder: '90' },
        { id: 'ketones', label: 'Ketones', defaultUnit: 'mmol/L', placeholder: '0.5' },
        { id: 'bodyFatPct', label: 'Body Fat %', defaultUnit: '%', placeholder: '15' },
        { id: 'fastingHours', label: 'Fasting Hours', defaultUnit: 'hours', placeholder: '16' },
        { id: 'fatRatio', label: 'Fat Ratio', defaultUnit: 'ratio', placeholder: '0.35' }
      ]
    },
    hydration: {
      title: 'Hydration & Other',
      metrics: [
        { id: 'waterIntake', label: 'Water Intake', defaultUnit: 'cups', placeholder: '8' },
        { id: 'electrolytes', label: 'Electrolytes', defaultUnit: 'mg', placeholder: '1000' },
        { id: 'alcohol', label: 'Alcohol', defaultUnit: 'drinks', placeholder: '0' }
      ]
    }
  };

  const unitOptions = ['g', 'mg', 'oz', 'kcal', 'IU', 'ml', 'cups', 'hours', 'bpm', 'ms', '%', 'mmol/L', 'mg/dL', 'ratio', 'scale (1-10)'];

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
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
              target: presetValues.target,
              threshold: presetValues.threshold
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

  const handleMetricToggle = (metricId, defaultUnit) => {
    setMetrics(prev => ({
      ...prev,
      [metricId]: prev[metricId]
        ? { ...prev[metricId], enabled: !prev[metricId].enabled }
        : { enabled: true, unit: defaultUnit, target: '', threshold: '' }
    }));
  };

  const handleMetricChange = (metricId, field, value) => {
    setMetrics(prev => ({
      ...prev,
      [metricId]: { ...prev[metricId], [field]: value }
    }));
  };

  const handleAddCustomMetric = () => {
    if (newMetric.name.trim()) {
      const customId = `custom_${Date.now()}`;
      setCustomMetrics(prev => [...prev, { ...newMetric, id: customId }]);
      setMetrics(prev => ({
        ...prev,
        [customId]: { enabled: true, unit: newMetric.unit, target: newMetric.target, threshold: '' }
      }));
      setNewMetric({ name: '', unit: 'g', target: '', frequency: 'daily' });
      setShowCustomForm(false);
    }
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
        metrics: enabledMetrics,
        customMetrics,
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
    setCustomMetrics([]);
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
    const enabledMetricsCount = Object.keys(savedPlan.metrics).length;
    const customMetricsCount = savedPlan.customMetrics.length;

    return (
      <div className="nutrition-plan-page">
        <div className="nutrition-plan-container">
          <div className="hero-section">
            <h1 className="hero-title">Plan Summary</h1>
            <p className="hero-subtitle">Your nutrition tracking goals have been saved</p>
          </div>

          <div className="summary-container">
            <div className="success-banner">
              <div className="success-icon">✓</div>
              <h2>Nutrition Plan Created Successfully!</h2>
              <p>You're tracking {enabledMetricsCount + customMetricsCount} metrics</p>
            </div>

            {savedPlan.presetName && (
              <div className="summary-preset">
                <h3>Selected Preset</h3>
                <div className="preset-badge">{savedPlan.presetName}</div>
              </div>
            )}

            <div className="summary-metrics">
              <h3>Your Tracking Goals</h3>
              
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
                      {metricData.threshold && (
                        <div className="summary-threshold">
                          Alert at: {metricData.threshold} {metricData.unit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {savedPlan.customMetrics.length > 0 && (
                <div className="custom-metrics-summary">
                  <h4>Custom Metrics</h4>
                  <div className="metrics-summary-grid">
                    {savedPlan.customMetrics.map(metric => (
                      <div key={metric.id} className="summary-metric-card custom">
                        <div className="summary-metric-label">{metric.name}</div>
                        <div className="summary-metric-value">
                          <span className="target-value">{metric.target}</span>
                          <span className="target-unit">{metric.unit}</span>
                        </div>
                        <div className="summary-frequency">{metric.frequency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="summary-meta">
              <p>Created: {formatTimestamp(savedPlan.createdAt)}</p>
              {savedPlan.updatedAt && savedPlan.createdAt !== savedPlan.updatedAt && (
                <p>Last Updated: {formatTimestamp(savedPlan.updatedAt)}</p>
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
        <div className="nutrition-plan-container">
          <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
            <div style={{ fontSize: '24px', marginBottom: '20px' }}>Loading your nutrition plan...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nutrition-plan-page">
      <div className="nutrition-plan-container">
        <div className="hero-section">
          <h1 className="hero-title">Nutrition Plan</h1>
          <p className="hero-subtitle">Build your personalized expert nutrition tracking plan</p>
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
            <h2 className="section-title">📋 Quick Start with Expert Presets</h2>
            <p className="section-description">Choose a preset goal to auto-populate recommended metrics</p>
            
            <div className="preset-grid">
              <div 
                className={`preset-card ${selectedPreset === '' ? 'selected' : ''}`}
                onClick={() => handlePresetChange('')}
              >
                <div className="preset-icon">✨</div>
                <h3>Custom</h3>
                <p>Build from scratch</p>
              </div>
              {Object.entries(presets).map(([key, preset]) => (
                <div
                  key={key}
                  className={`preset-card ${selectedPreset === key ? 'selected' : ''}`}
                  onClick={() => handlePresetChange(key)}
                >
                  <div className="preset-icon">{preset.name.split(' ')[0]}</div>
                  <h3>{preset.name.substring(2)}</h3>
                  <p>{preset.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="metrics-section">
            <h2 className="section-title">📊 Select Metrics to Track</h2>
            <p className="section-description">Choose the metrics you want to monitor and set your daily targets</p>

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
                            <input
                              type="number"
                              placeholder="Alert threshold (optional)"
                              value={metrics[metric.id].threshold}
                              onChange={(e) => handleMetricChange(metric.id, 'threshold', e.target.value)}
                              className="metric-input threshold-input"
                              step="any"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom Metrics */}
          <div className="custom-metrics-section">
            <h2 className="section-title">➕ Add Custom Metrics</h2>
            <p className="section-description">Track additional metrics specific to your needs</p>
            
            {!showCustomForm && (
              <button
                type="button"
                onClick={() => setShowCustomForm(true)}
                className="add-custom-button"
              >
                + Add Custom Metric
              </button>
            )}

            {showCustomForm && (
              <div className="custom-form">
                <input
                  type="text"
                  placeholder="Metric Name (e.g., Fiber Intake, Mood)"
                  value={newMetric.name}
                  onChange={(e) => setNewMetric({ ...newMetric, name: e.target.value })}
                  className="custom-input"
                />
                <select
                  value={newMetric.unit}
                  onChange={(e) => setNewMetric({ ...newMetric, unit: e.target.value })}
                  className="custom-select"
                >
                  {unitOptions.map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Target Value"
                  value={newMetric.target}
                  onChange={(e) => setNewMetric({ ...newMetric, target: e.target.value })}
                  className="custom-input"
                  step="any"
                />
                <select
                  value={newMetric.frequency}
                  onChange={(e) => setNewMetric({ ...newMetric, frequency: e.target.value })}
                  className="custom-select"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <div className="custom-actions">
                  <button type="button" onClick={handleAddCustomMetric} className="save-custom-btn">
                    Save Metric
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="cancel-custom-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {customMetrics.length > 0 && (
              <div className="custom-metrics-list">
                <h4>Your Custom Metrics:</h4>
                {customMetrics.map(metric => (
                  <div key={metric.id} className="custom-metric-item">
                    <span>{metric.name}</span>
                    <span className="metric-detail">
                      Target: {metric.target} {metric.unit} • {metric.frequency}
                    </span>
                  </div>
                ))}
              </div>
            )}
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

