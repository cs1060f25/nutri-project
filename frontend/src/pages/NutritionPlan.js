import React, { useState, useEffect, useRef } from 'react';
import './NutritionPlan.css';
import { createNutritionPlan, getActiveNutritionPlan, updateNutritionPlan, getPersonalizedRecommendation, getNutritionPlanHistory, deleteNutritionPlan } from '../services/nutritionPlanService';
import { getUserProfile } from '../services/profileService';
import CustomSelect from '../components/CustomSelect';

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
  const [safetyWarnings, setSafetyWarnings] = useState([]);
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false);
  const [personalizedPresets, setPersonalizedPresets] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [planHistory, setPlanHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [planToRestore, setPlanToRestore] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

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

  const handlePresetChange = (presetKey) => {
    setSelectedPreset(presetKey);
    setIsDropdownOpen(false);
    if (presetKey && presets[presetKey]) {
      const newMetrics = {};
      console.log('Loading preset:', presetKey);
      console.log('Preset metrics:', presets[presetKey].metrics);
      
      Object.entries(presets[presetKey].metrics).forEach(([metricId, presetValues]) => {
        // Skip metrics with target value of 0 - don't enable them
        const targetValue = presetValues.target || '';
        if (targetValue === '0' || parseFloat(targetValue) === 0) {
          console.log('Skipping metric with 0 value:', metricId);
          return;
        }
        
        // Find the metric in categories to get default unit
        for (const category of Object.values(metricCategories)) {
          const metric = category.metrics.find(m => m.id === metricId);
          if (metric) {
            newMetrics[metricId] = {
              enabled: true,
              unit: metric.defaultUnit,
              target: targetValue
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

    // Check if there's an existing plan that would be replaced
    const activePlan = await getActiveNutritionPlan();
    if (activePlan) {
      // There's an existing plan - show confirmation
      setShowSaveConfirm(true);
      return; // Show confirmation modal first
    }

    // No existing plan, proceed with save
    await handleConfirmSave();
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);
    setLoading(true);

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
      setSafetyWarnings([]);
      setShowSafetyConfirm(false);
    } catch (err) {
      console.error('Error saving nutrition plan:', err);
      setError(err.message || 'Failed to save nutrition plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveConfirm(false);
  };

  const handleCreateNew = async () => {
    setShowSummary(false);
    setSavedPlan(null);
    setSelectedPreset('');
    setMetrics({});
    setIsEditMode(false);
    setError(null);
    setSafetyWarnings([]);
    setShowSafetyConfirm(false);
    
    // Load personalized recommendation for new plan
    try {
      const recommendation = await getPersonalizedRecommendation();
      if (recommendation) {
        setPersonalizedRecommendation(recommendation);
      }
    } catch (recErr) {
      // Don't show error for missing recommendation - just means profile incomplete
      console.log('No personalized recommendation available:', recErr.message);
      setPersonalizedRecommendation(null);
    }
  };

  const handleEditPlan = () => {
    setShowSummary(false);
    setError(null);
  };

  const handleCancel = async () => {
    setError(null);
    setSafetyWarnings([]);
    setShowSafetyConfirm(false);
    setShowSaveConfirm(false);
    
    // Always go to plan summary page - load active plan if not in state
    if (savedPlan) {
      setShowSummary(true);
      // Reset form to saved plan values
      setSelectedPreset(savedPlan.preset || '');
      setMetrics(savedPlan.metrics || {});
      setIsEditMode(true);
    } else {
      // Try to load the active plan from backend
      try {
        const activePlan = await getActiveNutritionPlan();
        if (activePlan) {
          setSavedPlan(activePlan);
          setSelectedPreset(activePlan.preset || '');
          setMetrics(activePlan.metrics || {});
          setIsEditMode(true);
          setShowSummary(true);
        } else {
          // No plan exists, show summary anyway (will show empty state)
          setShowSummary(true);
        }
      } catch (err) {
        console.error('Error loading active plan:', err);
        // Still show summary even if there's an error
        setShowSummary(true);
      }
    }
  };

  const handleViewHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const history = await getNutritionPlanHistory(50);
      
      // Filter out duplicate plans based on metrics
      const uniquePlans = [];
      const seenMetrics = new Set();
      
      (history || []).forEach(plan => {
        // Create a unique key based on preset and all metric values
        const metricsKey = JSON.stringify({
          preset: plan.preset || '',
          metrics: plan.metrics || {}
        });
        
        if (!seenMetrics.has(metricsKey)) {
          seenMetrics.add(metricsKey);
          uniquePlans.push(plan);
        }
      });
      
      setPlanHistory(uniquePlans);
    } catch (err) {
      console.error('Error loading plan history:', err);
      setError('Failed to load plan history. Please try again.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseHistory = () => {
    setShowHistory(false);
    setPlanHistory([]);
  };

  const handleRestoreClick = (planId) => {
    const plan = planHistory.find(p => p.id === planId);
    if (plan) {
      setPlanToRestore(plan);
      setShowRestoreConfirm(true);
    }
  };

  const handleConfirmRestore = async () => {
    if (!planToRestore) return;
    
    try {
      setLoading(true);
      setShowRestoreConfirm(false);
      
      // Restore the plan by creating a new plan entry (not updating existing)
      // This ensures the restored plan and all previous plans stay in history
      const planData = {
        preset: planToRestore.preset || '',
        presetName: planToRestore.presetName || 'Custom Plan',
        metrics: planToRestore.metrics || {}
      };
      
      // Always create a new plan to preserve history
      await createNutritionPlan(planData);
      
      // Reload the plan
      const updatedPlan = await getActiveNutritionPlan();
      setSavedPlan(updatedPlan);
      setSelectedPreset(updatedPlan.preset || '');
      setMetrics(updatedPlan.metrics || {});
      setShowSummary(true);
      setIsEditMode(true);
      setShowHistory(false);
      setPlanToRestore(null);
    } catch (err) {
      console.error('Error restoring plan:', err);
      setError('Failed to restore plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRestore = () => {
    setShowRestoreConfirm(false);
    setPlanToRestore(null);
  };

  const handleDeleteClick = (planId) => {
    const plan = planHistory.find(p => p.id === planId);
    if (plan) {
      setPlanToDelete(plan);
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    
    try {
      setLoading(true);
      setShowDeleteConfirm(false);
      
      // Check if this is the active plan
      const activePlan = await getActiveNutritionPlan();
      if (activePlan && activePlan.id === planToDelete.id) {
        setError('Cannot delete the active plan. Please restore a different plan first or create a new plan.');
        setPlanToDelete(null);
        setLoading(false);
        return;
      }
      
      // Immediately remove the plan from the history list for instant UI update
      setPlanHistory(prevHistory => prevHistory.filter(plan => plan.id !== planToDelete.id));
      
      // Delete the plan from backend
      await deleteNutritionPlan(planToDelete.id);
      
      // Optionally refresh history to ensure consistency (but UI already updated)
      try {
        const history = await getNutritionPlanHistory(50);
        
        // Filter out duplicates based on metrics
        const uniquePlans = [];
        const seenMetrics = new Set();
        
        (history || []).forEach(plan => {
          const metricsKey = JSON.stringify({
            preset: plan.preset || '',
            metrics: plan.metrics || {}
          });
          
          if (!seenMetrics.has(metricsKey)) {
            seenMetrics.add(metricsKey);
            uniquePlans.push(plan);
          }
        });
        
        setPlanHistory(uniquePlans);
      } catch (refreshErr) {
        // If refresh fails, that's okay - we already updated the UI
        console.log('Could not refresh history, but plan was deleted:', refreshErr);
      }
      
      setPlanToDelete(null);
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete plan. Please try again.');
      // If deletion failed, refresh history to restore the list
      try {
        const history = await getNutritionPlanHistory(50);
        const uniquePlans = [];
        const seenMetrics = new Set();
        
        (history || []).forEach(plan => {
          const metricsKey = JSON.stringify({
            preset: plan.preset || '',
            metrics: plan.metrics || {}
          });
          
          if (!seenMetrics.has(metricsKey)) {
            seenMetrics.add(metricsKey);
            uniquePlans.push(plan);
          }
        });
        
        setPlanHistory(uniquePlans);
      } catch (refreshErr) {
        console.error('Error refreshing history after failed delete:', refreshErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setPlanToDelete(null);
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

  // Show history view
  if (showHistory) {
    return (
      <div className="nutrition-plan-page">
        <div className="nutrition-plan-container">
          <div className="hero-section">
            <h1 className="hero-title">Plan History</h1>
            <p className="hero-subtitle" style={{ marginBottom: '2rem' }}>View your previous nutrition plans</p>
          </div>

          <div className="history-container">
            {historyLoading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading plan history...</p>
              </div>
            ) : planHistory.length === 0 ? (
              <div className="no-history">
                <p>No previous plans found.</p>
              </div>
            ) : (
              <div className="history-list">
                {planHistory.map((plan) => (
                  <div key={plan.id} className="history-plan-card">
                    <div className="history-plan-header">
                      <h4>{plan.presetName || 'Custom Plan'}</h4>
                      <div className="history-plan-dates">
                        <span>Created: {formatTimestamp(plan.createdAt)}</span>
                        {plan.updatedAt && plan.createdAt !== plan.updatedAt && (
                          <span> | Updated: {formatTimestamp(plan.updatedAt)}</span>
                        )}
                      </div>
                    </div>
                    <div className="history-plan-metrics">
                      <div className="history-metrics-grid">
                        {Object.entries(plan.metrics || {}).slice(0, 6).map(([metricId, metricData]) => (
                          <div key={metricId} className="history-metric-item">
                            <span className="history-metric-label">{getMetricLabel(metricId)}:</span>
                            <span className="history-metric-value">
                              {metricData.target ? `${metricData.target} ${metricData.unit}` : 'No target'}
                            </span>
                          </div>
                        ))}
                      </div>
                      {Object.keys(plan.metrics || {}).length > 6 && (
                        <p className="history-more-metrics">
                          +{Object.keys(plan.metrics || {}).length - 6} more metrics
                        </p>
                      )}
                    </div>
                    <div className="history-plan-actions">
                      <button 
                        onClick={() => handleRestoreClick(plan.id)} 
                        className="load-plan-button"
                      >
                        Restore
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(plan.id)} 
                        className="delete-plan-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="history-actions">
              <button onClick={handleCloseHistory} className="back-button">
                Back to Summary
              </button>
            </div>
          </div>

          {/* Restore Confirmation Modal */}
          {showRestoreConfirm && (
            <div className="modal-overlay" onClick={handleCancelRestore}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm Restore</h3>
                <p>Are you sure you want to restore this plan? This will replace your current plan.</p>
                <div className="modal-actions">
                  <button onClick={handleCancelRestore} className="modal-cancel-button">
                    Cancel
                  </button>
                  <button onClick={handleConfirmRestore} className="modal-confirm-button">
                    Restore
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="modal-overlay" onClick={handleCancelDelete}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Confirm Delete</h3>
                <p>Are you sure you want to delete this plan? This action cannot be undone.</p>
                <div className="modal-actions">
                  <button onClick={handleCancelDelete} className="modal-cancel-button">
                    Cancel
                  </button>
                  <button onClick={handleConfirmDelete} className="modal-confirm-button" style={{ background: '#dc2626' }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show summary view
  if (showSummary && savedPlan) {
    return (
      <div className="nutrition-plan-page">
        <div className="nutrition-plan-container">
          <div className="hero-section">
            <div className="hero-header">
              <div>
            <h1 className="hero-title">Plan Summary</h1>
            <p className="hero-subtitle">Your nutrition tracking goals have been saved</p>
              </div>
              <button onClick={handleViewHistory} className="view-old-plans-button">
                View Old Plans
              </button>
            </div>
          </div>

          <div className="summary-container">
            <div className="summary-metrics">
              <h3 style={{ margin: '0 0 1.5rem 0' }}>Your Tracking Goals</h3>
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
        <header className="nutrition-plan-header">
          <h1>Nutrition Plan</h1>
          <p>Set daily nutrition goals based on HUDS dining hall meals</p>
        </header>

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

            {Object.entries(metricCategories).map(([categoryKey, category]) => {
              // Check if any metrics in this category have values populated
              const hasPopulatedMetrics = category.metrics.some(metric => {
                const metricData = metrics[metric.id];
                return metricData?.enabled && metricData?.target && parseFloat(metricData.target) > 0;
              });
              
              // Generate explanation text based on actual metric values
              const getCategoryExplanation = () => {
                if (!hasPopulatedMetrics) return null;
                
                // Try to get explanation from personalized recommendation if available
                let lines = [];
                if (personalizedRecommendation?.explanation) {
                  lines = personalizedRecommendation.explanation.split('\n');
                }
                
                if (categoryKey === 'energy') {
                  const caloriesValue = metrics.calories?.target;
                  if (!caloriesValue) return null;
                  
                  // Find calorie explanation and replace values with actual ones
                  const calorieLine = lines.find(line => 
                    line.toLowerCase().includes('daily calorie target') || 
                    line.toLowerCase().includes('calorie')
                  );
                  if (calorieLine) {
                    // Find the full sentence explanation (now generated as a sentence in backend)
                    let fullExplanation = '';
                    for (let i = 0; i < lines.length; i++) {
                      if (lines[i].includes('daily calorie target') && lines[i].includes('is based on')) {
                        // Get the full sentence (it's now a single sentence, not bullets)
                        fullExplanation = lines[i].replace(/\d+\s*kcal/g, `${caloriesValue} kcal`);
                        // Check if there's more content on the same line or next line
                        if (i + 1 < lines.length && !lines[i + 1].trim().startsWith('Protein') && !lines[i + 1].trim().startsWith('•')) {
                          fullExplanation += ' ' + lines[i + 1].trim();
                        }
                        break;
                      }
                    }
                    
                    if (fullExplanation) {
                      // Replace calorie value in the explanation
                      const updatedExplanation = fullExplanation.replace(/\d+\s*kcal/g, `${caloriesValue} kcal`);
                      return updatedExplanation;
                    }
                  }
                } else if (categoryKey === 'macronutrients') {
                  const explanations = [];
                  
                  // Protein
                  const proteinValue = metrics.protein?.target;
                  if (proteinValue) {
                    const proteinLine = lines.find(line => line.toLowerCase().startsWith('protein target'));
                    if (proteinLine) {
                      const updatedLine = proteinLine.replace(/\d+g/g, `${proteinValue}g`);
                      explanations.push(updatedLine);
                    } else if (lines.length === 0) {
                      // Fallback explanation
                      explanations.push(`Protein target of ${proteinValue}g supports muscle maintenance and daily nutritional needs.`);
                    }
                  }
                  
                  // Carbohydrates
                  const carbValue = metrics.totalCarbs?.target;
                  if (carbValue) {
                    const carbLine = lines.find(line => line.toLowerCase().startsWith('carbohydrate'));
                    if (carbLine) {
                      const updatedLine = carbLine.replace(/\d+g/g, `${carbValue}g`);
                      explanations.push(updatedLine);
                    } else if (lines.length === 0) {
                      // Fallback explanation
                      const carbPercent = Math.round((parseFloat(carbValue) * 4 / parseFloat(metrics.calories?.target || 2000)) * 100);
                      explanations.push(`Carbohydrates set at ${carbValue}g (${carbPercent}% of calories) to provide sustainable energy.`);
                    }
                  }
                  
                  // Fiber
                  const fiberValue = metrics.fiber?.target;
                  if (fiberValue) {
                    const fiberLine = lines.find(line => line.toLowerCase().startsWith('fiber target'));
                    if (fiberLine) {
                      const updatedLine = fiberLine.replace(/\d+g/g, `${fiberValue}g`);
                      explanations.push(updatedLine);
                    } else if (lines.length === 0) {
                      // Fallback explanation
                      explanations.push(`Fiber target of ${fiberValue}g supports digestive health and meets dietary recommendations.`);
                    }
                  }
                  
                  if (explanations.length > 0) {
                    return explanations.length > 1 ? { bullets: explanations } : explanations[0];
                  }
                } else if (categoryKey === 'fats') {
                  const explanations = [];
                  
                  // Total Fat
                  const fatValue = metrics.totalFat?.target;
                  if (fatValue) {
                    const fatLine = lines.find(line => line.toLowerCase().startsWith('fat target'));
                    if (fatLine) {
                      explanations.push(fatLine.replace(/\d+g/g, `${fatValue}g`));
                    } else if (lines.length === 0) {
                      // Fallback explanation
                      const fatPercent = Math.round((parseFloat(fatValue) * 9 / parseFloat(metrics.calories?.target || 2000)) * 100);
                      explanations.push(`Fat target of ${fatValue}g (${fatPercent}% of calories) provides essential fatty acids and helps with nutrient absorption.`);
                    }
                  }
                  
                  // Saturated Fat
                  const saturatedFatValue = metrics.saturatedFat?.target;
                  if (saturatedFatValue) {
                    const saturatedLine = lines.find(line => 
                      line.toLowerCase().includes('saturated') && 
                      !line.toLowerCase().includes('trans')
                    );
                    if (saturatedLine) {
                      explanations.push(saturatedLine.replace(/\d+g/g, `${saturatedFatValue}g`));
                    } else {
                      // Fallback explanation for saturated fat
                      const standardSaturated = 20; // Standard recommendation is ~20g or 10% of calories
                      if (parseFloat(saturatedFatValue) < standardSaturated) {
                        explanations.push(`Saturated fat limited to ${saturatedFatValue}g (vs. standard ${standardSaturated}g) to support cardiovascular health.`);
                      } else {
                        explanations.push(`Saturated fat target of ${saturatedFatValue}g aligns with standard dietary recommendations.`);
                      }
                    }
                  }
                  
                  if (explanations.length > 0) {
                    return explanations.length > 1 ? { bullets: explanations } : explanations[0];
                  }
                } else if (categoryKey === 'other') {
                  const explanations = [];
                  
                  // Sodium
                  const sodiumValue = metrics.sodium?.target;
                  if (sodiumValue) {
                    const sodiumLine = lines.find(line => 
                      line.toLowerCase().includes('sodium') && 
                      !line.toLowerCase().includes('saturated')
                    );
                    if (sodiumLine) {
                      const updatedLine = sodiumLine.replace(/\d+mg/g, `${sodiumValue}mg`);
                      explanations.push(updatedLine);
                    } else {
                      // Fallback explanation if no specific explanation exists
                      const standardSodium = 2300;
                      if (parseFloat(sodiumValue) < standardSodium) {
                        explanations.push(`Sodium limited to ${sodiumValue}mg/day (vs. standard ${standardSodium}mg) to support heart health.`);
                      } else {
                        explanations.push(`Sodium target of ${sodiumValue}mg/day aligns with standard dietary recommendations.`);
                      }
                    }
                  }
                  
                  // Cholesterol
                  const cholesterolValue = metrics.cholesterol?.target;
                  if (cholesterolValue) {
                    const cholesterolLine = lines.find(line => 
                      line.toLowerCase().includes('cholesterol') &&
                      !line.toLowerCase().includes('saturated')
                    );
                    if (cholesterolLine) {
                      const updatedLine = cholesterolLine.replace(/\d+mg/g, `${cholesterolValue}mg`);
                      explanations.push(updatedLine);
                    } else {
                      // Fallback explanation if no specific explanation exists
                      const standardCholesterol = 300;
                      if (parseFloat(cholesterolValue) < standardCholesterol) {
                        explanations.push(`Cholesterol limited to ${cholesterolValue}mg/day (vs. standard ${standardCholesterol}mg) for heart health.`);
                      } else {
                        explanations.push(`Cholesterol target of ${cholesterolValue}mg/day aligns with standard dietary recommendations.`);
                      }
                    }
                  }
                  
                  if (explanations.length > 0) {
                    return explanations.length > 1 ? { bullets: explanations } : explanations[0];
                  }
                }
                return null;
              };
              
              const categoryExplanation = getCategoryExplanation();
              
              return (
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
                              <CustomSelect
                                value={metrics[metric.id].unit}
                                onChange={(value) => handleMetricChange(metric.id, 'unit', value)}
                                options={[
                                  { value: metric.defaultUnit, label: metric.defaultUnit },
                                  ...unitOptions.filter(u => u !== metric.defaultUnit).map(unit => ({
                                    value: unit,
                                    label: unit
                                  }))
                                ]}
                                placeholder={metric.defaultUnit}
                                className="unit-select-wrapper"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {categoryExplanation && (
                  <div style={{
                    background: 'rgba(128, 128, 128, 0.08)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginTop: '16px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {typeof categoryExplanation === 'object' && categoryExplanation.bullets ? (
                      <div>
                        {categoryExplanation.bullets.map((bullet, idx) => (
                          <div key={idx} style={{
                            marginBottom: idx < categoryExplanation.bullets.length - 1 ? '6px' : '0',
                            paddingLeft: '16px',
                            position: 'relative',
                            fontSize: '13px',
                            color: '#4b5563',
                            lineHeight: '1.5'
                          }}>
                            <span style={{
                              position: 'absolute',
                              left: '0',
                              color: '#6b7280',
                              fontWeight: '400'
                            }}>•</span>
                            {bullet}
                  </div>
                        ))}
                </div>
              ) : (
                  <p style={{ 
                    margin: '0', 
                    fontSize: '13px', 
                        fontWeight: '400',
                        color: '#4b5563',
                        lineHeight: '1.6'
                      }}>
                        {typeof categoryExplanation === 'string' ? categoryExplanation : String(categoryExplanation || '')}
                      </p>
              )}
            </div>
          )}
              </div>
            );
            })}
          </div>


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

          <div className="form-actions">
            <button type="button" onClick={handleCancel} className="cancel-plan-button" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="submit-plan-button" disabled={loading}>
              {loading ? 'Saving...' : (isEditMode ? 'Update Nutrition Plan' : 'Save Nutrition Plan')}
            </button>
          </div>
        </form>

        {/* Save Confirmation Modal */}
        {showSaveConfirm && (
          <div className="modal-overlay" onClick={handleCancelSave}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Confirm Save</h3>
              <p>Saving this nutrition plan will replace your old one. Are you sure?</p>
              <div className="modal-actions">
                <button onClick={handleCancelSave} className="modal-cancel-button">
                  Cancel
                </button>
                <button onClick={handleConfirmSave} className="modal-confirm-button">
                  Save Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NutritionPlan;

