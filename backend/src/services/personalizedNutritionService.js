/**
 * Service for calculating personalized nutrition targets based on user profile data.
 */

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 */
const calculateBMR = (age, gender, heightFeet, heightInches, weight) => {
  // Convert height to cm and weight to kg
  const heightInchesTotal = heightFeet * 12 + heightInches;
  const heightCm = heightInchesTotal * 2.54;
  const weightKg = weight * 0.453592; // lbs to kg

  // Mifflin-St Jeor Equation
  // Men: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) + 5
  // Women: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) - 161
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else if (gender === 'female') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    // Non-binary or prefer not to say - use average
    const maleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    const femaleBMR = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    bmr = (maleBMR + femaleBMR) / 2;
  }

  return Math.round(bmr);
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure) based on activity level
 */
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

/**
 * Adjust calories based on primary goal
 */
const adjustCaloriesForGoal = (tdee, goal) => {
  const goalAdjustments = {
    'weight-loss': -500, // 500 cal deficit for ~1 lb/week
    'weight-gain': 300, // 300 cal surplus
    'weight-maintenance': 0,
    'muscle-gain': 300, // 300 cal surplus for muscle gain
    'general-wellness': 0,
    'energy-levels': -200, // Slight deficit for better energy
    'better-digestion': 0
  };

  const adjustment = goalAdjustments[goal] || 0;
  return Math.max(1200, tdee + adjustment); // Minimum 1200 calories
};

/**
 * Calculate protein target based on weight and goal
 */
const calculateProteinTarget = (weight, goal, gender) => {
  const weightKg = weight * 0.453592;
  
  // Base protein: 1.6-2.2g per kg body weight (higher for muscle gain/athletic)
  let proteinPerKg = 1.6;
  
  if (goal === 'muscle-gain') {
    proteinPerKg = 2.2;
  } else if (goal === 'weight-loss') {
    proteinPerKg = 2.0; // Higher protein helps preserve muscle during weight loss
  } else if (goal === 'weight-gain') {
    proteinPerKg = 1.8;
  }

  return Math.round(weightKg * proteinPerKg);
};

/**
 * Calculate carbohydrate target based on calories and goal
 */
const calculateCarbTarget = (calories, goal, hasDiabetes) => {
  // For diabetes, lower carb target (30-40% of calories instead of 45-65%)
  if (hasDiabetes) {
    const carbCalories = calories * 0.35; // 35% of calories
    return Math.round(carbCalories / 4); // 4 calories per gram of carbs
  }

  // Normal carb range: 45-65% of calories
  let carbPercentage = 0.50; // Default 50%
  
  if (goal === 'weight-loss') {
    carbPercentage = 0.40; // Lower carbs for weight loss
  } else if (goal === 'muscle-gain') {
    carbPercentage = 0.45; // Moderate carbs for muscle gain
  }

  const carbCalories = calories * carbPercentage;
  return Math.round(carbCalories / 4);
};

/**
 * Calculate fat target based on calories
 */
const calculateFatTarget = (calories, goal) => {
  // Fat should be 20-35% of calories
  const fatPercentage = 0.30; // 30% default
  const fatCalories = calories * fatPercentage;
  return Math.round(fatCalories / 9); // 9 calories per gram of fat
};

/**
 * Calculate sodium target based on health conditions
 */
const calculateSodiumTarget = (healthConditions) => {
  const hasHighBloodPressure = healthConditions?.some(condition => 
    condition.toLowerCase().includes('blood pressure') || condition.toLowerCase().includes('hypertension')
  );
  const hasHeartDisease = healthConditions?.some(condition => 
    condition.toLowerCase().includes('heart') || condition.toLowerCase().includes('cardiovascular')
  );
  const hasKidneyDisease = healthConditions?.some(condition => 
    condition.toLowerCase().includes('kidney')
  );

  // Lower sodium for these conditions
  if (hasHighBloodPressure || hasHeartDisease || hasKidneyDisease) {
    return 1500; // AHA recommends 1500mg for those with these conditions
  }

  return 2300; // Standard daily limit
};

/**
 * Calculate cholesterol target based on health conditions
 */
const calculateCholesterolTarget = (healthConditions) => {
  const hasHighCholesterol = healthConditions?.some(condition => 
    condition.toLowerCase().includes('cholesterol')
  );
  const hasHeartDisease = healthConditions?.some(condition => 
    condition.toLowerCase().includes('heart') || condition.toLowerCase().includes('cardiovascular')
  );

  if (hasHighCholesterol || hasHeartDisease) {
    return 200; // Lower limit for those with high cholesterol or heart disease
  }

  return 300; // Standard daily limit
};

/**
 * Calculate fiber target based on gender and age
 */
const calculateFiberTarget = (gender, age) => {
  // Daily fiber recommendations:
  // Men under 50: 38g, Men 50+: 30g
  // Women under 50: 25g, Women 50+: 21g
  
  if (gender === 'male') {
    return age >= 50 ? 30 : 38;
  } else if (gender === 'female') {
    return age >= 50 ? 21 : 25;
  } else {
    // Average for non-binary
    return age >= 50 ? 25 : 31;
  }
};

/**
 * Calculate age from birthday
 */
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

/**
 * Generate personalized nutrition plan based on user profile
 */
const generatePersonalizedPlan = (userProfile) => {
  if (!userProfile) {
    return null;
  }

  const { birthday, age, gender, height, weight, activityLevel, primaryGoal, healthConditions } = userProfile;

  // Calculate age from birthday if birthday is provided, otherwise use stored age
  const calculatedAge = birthday ? calculateAgeFromBirthday(birthday) : age;

  // Need essential data to calculate
  if (!calculatedAge || !gender || !height || !weight || !activityLevel) {
    return null;
  }

  const heightFeet = height?.feet || 5;
  const heightInches = height?.inches || 10;

  // Calculate BMR and TDEE
  const bmr = calculateBMR(calculatedAge, gender, heightFeet, heightInches, weight);
  const tdee = calculateTDEE(bmr, activityLevel);
  
  // Adjust calories for goal
  const targetCalories = adjustCaloriesForGoal(tdee, primaryGoal || 'weight-maintenance');

  // Calculate macronutrients
  const targetProtein = calculateProteinTarget(weight, primaryGoal, gender);
  const hasDiabetes = healthConditions?.some(condition => 
    condition.toLowerCase().includes('diabetes') || condition.toLowerCase().includes('blood sugar')
  );
  const targetCarbs = calculateCarbTarget(targetCalories, primaryGoal, hasDiabetes);
  const targetFat = calculateFatTarget(targetCalories, primaryGoal);
  
  // Calculate other nutrients
  const targetSodium = calculateSodiumTarget(healthConditions);
  const targetCholesterol = calculateCholesterolTarget(healthConditions);
  const targetFiber = calculateFiberTarget(gender, calculatedAge);

  // Determine suggested preset based on goal and health conditions
  let suggestedPreset = 'balanced';
  let presetReason = 'A balanced approach covering all major nutrients.';
  
  if (healthConditions?.some(c => c.toLowerCase().includes('blood pressure'))) {
    suggestedPreset = 'low-sodium';
    presetReason = 'Selected because you indicated high blood pressure or hypertension concerns.';
  } else if (healthConditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cholesterol'))) {
    suggestedPreset = 'heart-healthy';
    presetReason = 'Selected because you indicated heart or cholesterol concerns.';
  } else if (primaryGoal === 'muscle-gain') {
    suggestedPreset = 'high-protein';
    presetReason = 'Selected to support your muscle gain and athletic performance goals.';
  }

  // Build explanation for the personalized plan
  const explanations = [];
  
  // Base calculation explanation
  explanations.push(`Your daily calorie target of ${targetCalories} kcal is based on:`);
  explanations.push(`• Basal Metabolic Rate (BMR): ${bmr} kcal/day - the energy your body needs at rest`);
  explanations.push(`• Activity Level: ${activityLevel.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} (TDEE: ${tdee} kcal/day)`);
  
  if (primaryGoal) {
    const goalMap = {
      'weight-loss': 'a 500 kcal deficit for safe weight loss (~1 lb/week)',
      'weight-gain': 'a 300 kcal surplus for gradual weight gain',
      'weight-maintenance': 'maintaining your current weight',
      'muscle-gain': 'a 300 kcal surplus to support muscle building',
      'general-wellness': 'maintaining overall health',
      'energy-levels': 'a slight calorie adjustment for better energy',
      'better-digestion': 'supporting digestive health'
    };
    const goalExplanation = goalMap[primaryGoal] || 'your personal goals';
    explanations.push(`• Goal Adjustment: ${goalExplanation}`);
  }
  
  // Protein explanation
  explanations.push(`\nProtein target of ${targetProtein}g is calculated from your weight (${weight} lbs) and supports ${primaryGoal === 'muscle-gain' ? 'muscle building and recovery' : primaryGoal === 'weight-loss' ? 'muscle preservation during weight loss' : 'daily maintenance needs'}.`);
  
  // Carb explanation
  if (hasDiabetes) {
    explanations.push(`Carbohydrates limited to ${targetCarbs}g (35% of calories) to help manage blood sugar levels.`);
  } else {
    explanations.push(`Carbohydrates set at ${targetCarbs}g (${Math.round((targetCarbs * 4 / targetCalories) * 100)}% of calories) to ${primaryGoal === 'weight-loss' ? 'support weight loss while maintaining energy' : 'provide sustainable energy'}.`);
  }
  
  // Fat explanation
  explanations.push(`Fat target of ${targetFat}g (30% of calories) provides essential fatty acids and helps with nutrient absorption.`);
  
  // Health condition adjustments
  if (healthConditions && healthConditions.length > 0) {
    const hasBloodPressure = healthConditions.some(c => c.toLowerCase().includes('blood pressure') || c.toLowerCase().includes('hypertension'));
    const hasHeart = healthConditions.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiovascular'));
    const hasCholesterol = healthConditions.some(c => c.toLowerCase().includes('cholesterol'));
    
    if (hasBloodPressure || hasHeart) {
      explanations.push(`\nSodium limited to ${targetSodium}mg/day (vs. standard 2300mg) due to ${hasBloodPressure ? 'blood pressure' : 'heart health'} concerns.`);
    }
    if (hasCholesterol || hasHeart) {
      explanations.push(`Cholesterol limited to ${targetCholesterol}mg/day (vs. standard 300mg) for heart health.`);
      explanations.push(`Saturated and trans fats are tracked to support cardiovascular health.`);
    }
  }
  
  // Fiber explanation
  explanations.push(`Fiber target of ${targetFiber}g supports digestive health and meets recommendations for ${gender === 'male' ? 'men' : gender === 'female' ? 'women' : 'your age group'}${calculatedAge >= 50 ? ' over 50' : ''}.`);

  const explanation = explanations.join('\n');

  return {
    suggestedPreset,
    presetReason,
    explanation,
    bmr,
    tdee,
    metrics: {
      calories: {
        enabled: true,
        unit: 'kcal',
        target: targetCalories.toString()
      },
      protein: {
        enabled: true,
        unit: 'g',
        target: targetProtein.toString()
      },
      totalCarbs: {
        enabled: true,
        unit: 'g',
        target: targetCarbs.toString()
      },
      totalFat: {
        enabled: true,
        unit: 'g',
        target: targetFat.toString()
      },
      fiber: {
        enabled: true,
        unit: 'g',
        target: targetFiber.toString()
      },
      sodium: {
        enabled: true,
        unit: 'mg',
        target: targetSodium.toString()
      },
      cholesterol: {
        enabled: true,
        unit: 'mg',
        target: targetCholesterol.toString()
      },
      ...(hasDiabetes && {
        sugars: {
          enabled: true,
          unit: 'g',
          target: Math.round(targetCarbs * 0.1).toString() // 10% of carbs as sugar limit
        }
      }),
      ...((healthConditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cholesterol'))) && {
        saturatedFat: {
          enabled: true,
          unit: 'g',
          target: '13' // AHA recommendation for heart health
        },
        transFat: {
          enabled: true,
          unit: 'g',
          target: '0'
        }
      })
    }
  };
};

module.exports = {
  generatePersonalizedPlan,
  calculateBMR,
  calculateTDEE,
  adjustCaloriesForGoal,
  calculateProteinTarget,
  calculateCarbTarget,
  calculateFatTarget,
  calculateSodiumTarget,
  calculateCholesterolTarget,
  calculateFiberTarget,
};

