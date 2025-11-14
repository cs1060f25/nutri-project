import React, { useState, useEffect, useRef } from 'react';
import './NutritionPlan.css';
import { createNutritionPlan, getActiveNutritionPlan, updateNutritionPlan, getPersonalizedRecommendation } from '../services/nutritionPlanService';
import { getUserProfile } from '../services/profileService';

// Calculate age from birthday (helper function outside component)
const calculateAgeFromBirthday = (birthday) => {
  if (!birthday) return null;
  const birthDate = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
const calculateBMR = (age, gender, heightFeet, heightInches, weight) => {
  const heightInchesTotal = heightFeet * 12 + heightInches;
  const heightCm = heightInchesTotal * 2.54;
  const weightKg = weight * 0.453592;
  
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    const maleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const femaleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    bmr = (maleBMR + femaleBMR) / 2;
  }
  return Math.round(bmr);
};

// Calculate TDEE (Total Daily Energy Expenditure)
const calculateTDEE = (bmr, activityLevel) => {
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly-active': 1.375,
    'moderately-active': 1.55,
    'very-active': 1.725,
    'extremely-active': 1.9
  };
  const multiplier = activityMultipliers[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
};

// Calculate personalized presets based on user profile
const calculatePersonalizedPresets = (profile) => {
  if (!profile || !profile.gender || !profile.height || !profile.weight || !profile.activityLevel) {
    console.error('Missing required profile data for presets:', { 
      gender: profile?.gender, 
      height: profile?.height, 
      weight: profile?.weight, 
      activityLevel: profile?.activityLevel 
    });
    return null; // Return null if insufficient data, will use defaults
  }

  const { birthday, age, gender, height, weight, activityLevel, healthConditions } = profile;
  const calculatedAge = birthday ? calculateAgeFromBirthday(birthday) : age;
  if (!calculatedAge) {
    console.error('Could not calculate age from profile:', { birthday, age });
    return null;
  }

  // Ensure height and weight are properly parsed as numbers
  const heightFeet = typeof height === 'object' && height !== null ? parseInt(height.feet) || 5 : (typeof height === 'number' ? Math.floor(height / 12) : 5);
  const heightInches = typeof height === 'object' && height !== null ? parseInt(height.inches) || 0 : (typeof height === 'number' ? height % 12 : 0);
  const weightValue = typeof weight === 'number' ? weight : (weight ? parseFloat(weight) : 0);

  console.log('Frontend - Parsed profile values for presets:', { 
    originalHeight: height, 
    originalWeight: weight, 
    heightFeet, 
    heightInches, 
    weightValue, 
    calculatedAge,
    gender,
    activityLevel 
  });

  // Validate critical values
  if (weightValue <= 0 || heightFeet <= 0 || calculatedAge <= 0) {
    console.error('Invalid profile values for presets:', { weightValue, heightFeet, heightInches, calculatedAge });
    return null;
  }

  const bmr = calculateBMR(calculatedAge, gender, heightFeet, heightInches, weightValue);
  if (!bmr || bmr <= 0) {
    console.error('Failed to calculate BMR for presets:', { calculatedAge, gender, heightFeet, heightInches, weightValue, bmr });
    return null;
  }

  console.log('Frontend - BMR calculated for presets:', bmr);

  const tdee = calculateTDEE(bmr, activityLevel);
  if (!tdee || tdee <= 0) {
    console.error('Failed to calculate TDEE for presets:', { bmr, activityLevel, tdee });
    return null;
  }

  console.log('Frontend - TDEE calculated for presets:', tdee);

  // Helper functions
  const calculateProtein = (presetType) => {
    if (!weightValue || weightValue <= 0) return 50; // Default fallback
    const weightKg = weightValue * 0.453592;
    if (presetType === 'high-protein') {
      return Math.round(weightKg * 2.2); // High protein for muscle building
    }
    return Math.round(weightKg * 1.6); // Standard protein
  };

  const calculateCarbs = (calories, presetType) => {
    let carbPercentage = 0.50; // Default 50%
    if (presetType === 'high-protein') {
      carbPercentage = 0.40; // Lower carbs for high protein
    } else if (presetType === 'low-sodium' || presetType === 'heart-healthy') {
      carbPercentage = 0.45; // Moderate carbs
    }
    return Math.round((calories * carbPercentage) / 4);
  };

  const calculateFat = (calories, presetType) => {
    let fatPercentage = 0.30; // Default 30%
    if (presetType === 'heart-healthy') {
      fatPercentage = 0.25; // Lower fat for heart health
    }
    return Math.round((calories * fatPercentage) / 9);
  };

  const calculateFiber = (gender, age) => {
    if (gender === 'male') {
      return age >= 50 ? 30 : 38;
    } else if (gender === 'female') {
      return age >= 50 ? 21 : 25;
    }
    return age >= 50 ? 25 : 31;
  };

  const calculateSodium = (presetType, healthConditions) => {
    if (presetType === 'low-sodium' || presetType === 'heart-healthy') {
      return 1500;
    }
    const hasHighBP = healthConditions?.some(c => 
      c.toLowerCase().includes('blood pressure') || c.toLowerCase().includes('hypertension')
    );
    return hasHighBP ? 1500 : 2300;
  };

  const calculateCholesterol = (presetType, healthConditions) => {
    if (presetType === 'heart-healthy') {
      return 200;
    }
    const hasHighChol = healthConditions?.some(c => 
      c.toLowerCase().includes('cholesterol') || c.toLowerCase().includes('heart')
    );
    return hasHighChol ? 200 : 300;
  };

  // Calculate base calories (maintenance)
  const baseCalories = Math.max(1200, tdee);

  return {
    'balanced': {
      name: '⚖️ Balanced Diet',
      description: 'Track all major macronutrients for balanced nutrition',
      metrics: {
        calories: { target: baseCalories.toString() },
        protein: { target: calculateProtein('balanced').toString() },
        totalCarbs: { target: calculateCarbs(baseCalories, 'balanced').toString() },
        totalFat: { target: calculateFat(baseCalories, 'balanced').toString() },
        fiber: { target: calculateFiber(gender, calculatedAge).toString() },
        sodium: { target: calculateSodium('balanced', healthConditions).toString() }
      }
    },
    'high-protein': {
      name: '🏋️ High Protein',
      description: 'Focus on protein intake for muscle building',
      metrics: {
        calories: { target: Math.max(1200, tdee + 300).toString() }, // Slight surplus for muscle gain
        protein: { target: calculateProtein('high-protein').toString() },
        totalCarbs: { target: calculateCarbs(Math.max(1200, tdee + 300), 'high-protein').toString() },
        totalFat: { target: calculateFat(Math.max(1200, tdee + 300), 'high-protein').toString() },
        saturatedFat: { target: '20' }
      }
    },
    'low-sodium': {
      name: '🧂 Low Sodium',
      description: 'Monitor and limit sodium intake',
      metrics: {
        calories: { target: baseCalories.toString() },
        sodium: { target: '1500' },
        protein: { target: calculateProtein('balanced').toString() },
        fiber: { target: calculateFiber(gender, calculatedAge).toString() },
        cholesterol: { target: calculateCholesterol('low-sodium', healthConditions).toString() }
      }
    },
    'heart-healthy': {
      name: '❤️ Heart Healthy',
      description: 'Track nutrients important for cardiovascular health',
      metrics: {
        calories: { target: baseCalories.toString() },
        totalFat: { target: calculateFat(baseCalories, 'heart-healthy').toString() },
        saturatedFat: { target: '13' },
        transFat: { target: '0' },
        cholesterol: { target: '200' },
        sodium: { target: '1500' },
        fiber: { target: Math.max(calculateFiber(gender, calculatedAge), 30).toString() }
      }
    }
  };
};

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
  const [personalizedRecommendation, setPersonalizedRecommendation] = useState(null);
  const [showPersonalizedBanner, setShowPersonalizedBanner] = useState(false);
  const [planExplanation, setPlanExplanation] = useState(null);
  const [safetyWarnings, setSafetyWarnings] = useState([]);
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);
  const [personalizedPresets, setPersonalizedPresets] = useState(null);

  // Load existing nutrition plan and personalized recommendations on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user profile for personalized presets
        try {
          const profile = await getUserProfile();
          console.log('Frontend - Loaded user profile:', profile);
          if (profile) {
            const presets = calculatePersonalizedPresets(profile);
            if (presets) {
              console.log('Frontend - Calculated personalized presets:', presets);
              setPersonalizedPresets(presets);
            } else {
              console.warn('Frontend - calculatePersonalizedPresets returned null, will use default presets');
            }
          }
        } catch (profileErr) {
          console.error('Could not load user profile:', profileErr.message);
        }

        const plan = await getActiveNutritionPlan();
        
        if (plan) {
          // Load the plan data into the form
          setSavedPlan(plan);
          setSelectedPreset(plan.preset || '');
          setMetrics(plan.metrics || {});
          setShowSummary(true);
          setIsEditMode(true);
        } else {
          // No active plan - try to get personalized recommendation
          try {
            const recommendation = await getPersonalizedRecommendation();
            if (recommendation) {
              setPersonalizedRecommendation(recommendation);
              setShowPersonalizedBanner(true);
            }
          } catch (recErr) {
            // Don't show error for missing recommendation - just means profile incomplete
            console.log('No personalized recommendation available:', recErr.message);
          }
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

    loadData();
  }, []);

  // Debug: Log when metrics state changes
  useEffect(() => {
    console.log('Metrics state updated:', metrics);
    console.log('Number of enabled metrics:', Object.values(metrics).filter(m => m.enabled).length);
  }, [metrics]);

  // Use personalized presets if available, otherwise use defaults
  const getPresets = () => {
    if (personalizedPresets) {
      console.log('Frontend - Using personalized presets:', personalizedPresets);
      return personalizedPresets;
    }
    console.log('Frontend - Using default presets (no personalized presets available)');
    // Default presets (fallback if no profile data)
    return {
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
  };

  const presets = getPresets();

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

  const handleApplyPersonalized = () => {
    if (!personalizedRecommendation) return;
    
    setSelectedPreset(personalizedRecommendation.suggestedPreset || '');
    setMetrics(personalizedRecommendation.metrics || {});
    setShowPersonalizedBanner(false);
    // Set explanation for personalized plan
    if (personalizedRecommendation.explanation) {
      setPlanExplanation({
        isPersonalized: true,
        explanation: personalizedRecommendation.explanation,
        presetReason: personalizedRecommendation.presetReason,
        preset: personalizedRecommendation.suggestedPreset
      });
    }
  };

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
      
      // Clear explanation when manually selecting a preset (only show for personalized)
      setPlanExplanation(null);
    } else {
      // Clear metrics for custom
      console.log('Clearing metrics for custom preset');
      setMetrics({});
      setPlanExplanation(null);
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
    // For number inputs, handle empty string and preserve "0"
    let processedValue = value;
    if (field === 'target' && value === '') {
      processedValue = ''; // Allow empty string
    } else if (field === 'target' && value === '0') {
      processedValue = '0'; // Preserve "0" as string
    }
    
    setMetrics(prev => ({
      ...prev,
      [metricId]: { ...prev[metricId], [field]: processedValue }
    }));
    // Clear warnings when user edits values
    if (field === 'target') {
      setSafetyWarnings([]);
      setShowSafetyConfirm(false);
    }
  };

  // Check for dangerously low nutrition values
  const validateNutritionSafety = (metricsData) => {
    const warnings = [];
    
    // Safe minimum thresholds
    const safetyThresholds = {
      calories: { min: 1200, unit: 'kcal', warning: 'Calories below 1200 kcal/day can be dangerous and may lead to nutrient deficiencies, loss of muscle mass, and slowed metabolism. This is below recommended safe minimums for most adults.' },
      protein: { min: 46, unit: 'g', warning: 'Protein below 46g/day may not meet basic nutritional needs. Adequate protein is essential for muscle maintenance, immune function, and overall health.' },
      totalCarbs: { min: 130, unit: 'g', warning: 'Carbohydrates below 130g/day may be too low to support brain function and physical activity. Your brain alone requires about 130g of carbohydrates daily.' },
      totalFat: { min: 20, unit: 'g', warning: 'Fat intake below 20g/day is extremely low and may prevent absorption of fat-soluble vitamins (A, D, E, K) and essential fatty acids needed for hormone production.' },
      fiber: { min: 14, unit: 'g', warning: 'Fiber below 14g/day may not support digestive health. Low fiber intake can lead to constipation and may not provide prebiotic benefits for gut health. The recommended minimum is typically 14g per 1000 calories consumed.' },
      sodium: { min: 500, unit: 'mg', warning: 'Sodium below 500mg/day is dangerously low and can lead to hyponatremia, causing symptoms like nausea, headaches, and in severe cases, seizures or coma.' }
    };

    // Check each enabled metric
    Object.entries(metricsData).forEach(([metricId, metricValue]) => {
      if (!metricValue.enabled || !metricValue.target) return;
      
      const threshold = safetyThresholds[metricId];
      if (!threshold) return; // Skip metrics without safety thresholds
      
      const targetValue = parseFloat(metricValue.target);
      if (isNaN(targetValue)) return;
      
      // Convert to same unit if needed (for now assuming units match)
      if (metricValue.unit === threshold.unit && targetValue < threshold.min) {
        const metricLabel = getMetricLabel(metricId);
        warnings.push({
          metric: metricLabel,
          current: targetValue,
          minimum: threshold.min,
          unit: threshold.unit,
          message: threshold.warning
        });
      }
    });

    return warnings;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

      const enabledMetrics = Object.entries(metrics)
        .filter(([_, value]) => value.enabled)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
      
    // Check for safety warnings
    const warnings = validateNutritionSafety(enabledMetrics);
    
    if (warnings.length > 0 && !showSafetyConfirm) {
      setSafetyWarnings(warnings);
      setShowSafetyConfirm(true);
      return; // Don't submit yet, show warnings first
    }

    // User confirmed they want to proceed despite warnings, or no warnings
    setLoading(true);

    try {
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
      setSafetyWarnings([]);
      setShowSafetyConfirm(false);
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
    setPlanExplanation(null);
    setPersonalizedRecommendation(null);
    setShowPersonalizedBanner(false);
    setSafetyWarnings([]);
    setShowSafetyConfirm(false);
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

        {showPersonalizedBanner && personalizedRecommendation && !isEditMode && (
          <div className="personalized-banner" style={{
            background: '#f0fdf4',
            border: '2px solid #1a5f3f',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            color: '#1a5f3f'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
                  ✨ Personalized Plan Available
                </h3>
                <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.5' }}>
                  Based on your profile (age, weight, activity level, health conditions, and goals), 
                  we've calculated personalized daily nutrition targets. Click below to apply these recommendations.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyPersonalized}
                style={{
                  padding: '10px 20px',
                  background: '#1a5f3f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Use Personalized Plan
              </button>
              <button
                type="button"
                onClick={() => setShowPersonalizedBanner(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1a5f3f',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '0',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
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
                                value={metrics[metric.id].target || ''}
                                onChange={(e) => handleMetricChange(metric.id, 'target', e.target.value)}
                                className="metric-input"
                                step="any"
                                min="0"
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

          {/* Plan Summary Section */}
          {planExplanation && (selectedPreset || Object.keys(metrics).some(k => metrics[k].enabled)) && (
            <div className="plan-explanation-section" style={{
              background: '#f0fdf4',
              border: '2px solid #1a5f3f',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '8px',
              marginBottom: '8px'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a5f3f',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                How this plan was selected
              </h3>
              
              {planExplanation.isPersonalized ? (
                <div style={{ color: '#1a5f3f' }}>
                  {planExplanation.presetReason && (
                    <p style={{ 
                      margin: '0 0 12px 0', 
                      fontSize: '15px', 
                      fontWeight: '500',
                      lineHeight: '1.6'
                    }}>
                      <strong>Preset Selection:</strong> {planExplanation.presetReason}
                    </p>
                  )}
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.8',
                    color: '#1a5f3f',
                    whiteSpace: 'pre-line'
                  }}>
                    {planExplanation.explanation}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#1a5f3f' }}>
                  <p style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '15px', 
                    fontWeight: '500',
                    lineHeight: '1.6'
                  }}>
                    <strong>Preset:</strong> {planExplanation.presetName || planExplanation.preset}
                  </p>
                  <p style={{ 
                    margin: '0', 
                    fontSize: '14px', 
                    lineHeight: '1.6',
                    color: '#1a5f3f'
                  }}>
                    {planExplanation.presetDescription || 'This preset has been selected with recommended targets for the chosen nutrition goal.'}
                  </p>
                  <p style={{ 
                    margin: '12px 0 0 0', 
                    fontSize: '13px', 
                    lineHeight: '1.6',
                    color: '#1a5f3f',
                    fontStyle: 'italic'
                  }}>
                    💡 Tip: You can customize individual metric targets above to match your specific needs.
                  </p>
                </div>
              )}
            </div>
          )}

          {showSafetyConfirm && safetyWarnings.length > 0 && (
            <div className="safety-warning-banner" style={{
              background: '#fff7ed',
              border: '2px solid #f59e0b',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⚠️ Safety Warning: Low Nutrition Values Detected
              </h3>
              <p style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                color: '#92400e',
                lineHeight: '1.6'
              }}>
                The following nutrition targets are below recommended safe minimums:
              </p>
              <div style={{ marginBottom: '16px' }}>
                {safetyWarnings.map((warning, index) => (
                  <div key={index} style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '12px',
                    border: '1px solid #fbbf24'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      color: '#d97706',
                      marginBottom: '4px',
                      fontSize: '14px'
                    }}>
                      {warning.metric}: {warning.current} {warning.unit} (Minimum recommended: {warning.minimum} {warning.unit})
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#78350f',
                      lineHeight: '1.5'
                    }}>
                      {warning.message}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSafetyConfirm(false);
                    setSafetyWarnings([]);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#1a5f3f',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Adjust Values
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    // Force submission by setting showSafetyConfirm to false and submitting
                    setShowSafetyConfirm(false);
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
                      
                      let response;
                      if (isEditMode && savedPlan?.id) {
                        response = await updateNutritionPlan(savedPlan.id, planData);
                      } else {
                        response = await createNutritionPlan(planData);
                      }
                      
                      setSavedPlan(response.plan);
                      setShowSummary(true);
                      setIsEditMode(true);
                      setSafetyWarnings([]);
                    } catch (err) {
                      console.error('Error saving nutrition plan:', err);
                      setError(err.message || 'Failed to save nutrition plan. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Continue Anyway (Not Recommended)
                </button>
              </div>
              <p style={{
                margin: '12px 0 0 0',
                fontSize: '12px',
                color: '#92400e',
                fontStyle: 'italic'
              }}>
                💡 Recommendation: Please consult with a healthcare provider or registered dietitian before setting nutrition targets below these minimums.
              </p>
            </div>
          )}

          <button type="submit" className="submit-plan-button" disabled={loading}>
            {loading ? 'Saving...' : (isEditMode ? 'Update Nutrition Plan' : 'Save Nutrition Plan')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NutritionPlan;

