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
 * Only uses information collected during onboarding:
 * - birthday, age, gender, height, weight (from step 3)
 * - dietaryPattern, isKosher, isHalal, allergies, healthConditions (from step 4)
 */
const generatePersonalizedPlan = (userProfile) => {
  if (!userProfile) {
    return null;
  }

  const { birthday, age, gender, height, weight, healthConditions } = userProfile;

  // Calculate age from birthday if birthday is provided, otherwise use stored age
  const calculatedAge = birthday ? calculateAgeFromBirthday(birthday) : age;

  // Need essential data to calculate (only from onboarding)
  if (!calculatedAge || !gender || !height || !weight) {
    return null;
  }

  const heightFeet = height?.feet || 5;
  const heightInches = height?.inches || 10;

  // Calculate BMR
  const bmr = calculateBMR(calculatedAge, gender, heightFeet, heightInches, weight);
  
  // Use default activity level (moderately-active) since it's no longer collected
  const defaultActivityLevel = 'moderately-active';
  const tdee = calculateTDEE(bmr, defaultActivityLevel);
  
  // Use default goal (weight-maintenance) since it's no longer collected
  const defaultGoal = 'weight-maintenance';
  const targetCalories = adjustCaloriesForGoal(tdee, defaultGoal);

  // Calculate macronutrients (using default goal)
  const targetProtein = calculateProteinTarget(weight, defaultGoal, gender);
  const hasDiabetes = healthConditions?.some(condition => 
    condition.toLowerCase().includes('diabetes') || condition.toLowerCase().includes('blood sugar')
  );
  const targetCarbs = calculateCarbTarget(targetCalories, defaultGoal, hasDiabetes);
  const targetFat = calculateFatTarget(targetCalories, defaultGoal);
  
  // Calculate other nutrients
  const targetSodium = calculateSodiumTarget(healthConditions);
  const targetCholesterol = calculateCholesterolTarget(healthConditions);
  const targetFiber = calculateFiberTarget(gender, calculatedAge);

  // Determine suggested preset based on health conditions (goal no longer collected)
  let suggestedPreset = 'balanced';
  let presetReason = 'A balanced approach covering all major nutrients.';
  
  if (healthConditions?.some(c => c.toLowerCase().includes('blood pressure'))) {
    suggestedPreset = 'low-sodium';
    presetReason = 'Selected because you indicated high blood pressure or hypertension concerns.';
  } else if (healthConditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cholesterol'))) {
    suggestedPreset = 'heart-healthy';
    presetReason = 'Selected because you indicated heart or cholesterol concerns.';
  }

  // Build explanation for the personalized plan
  const explanations = [];
  
  // Calories explanation
  explanations.push(`Calories`);
  explanations.push(`Your ${targetCalories} kcal target comes from the standard reference intake used to maintain daily energy needs for most adults.`);
  
  // Protein explanation
  explanations.push(`Protein`);
  explanations.push(`Your ${targetProtein} g protein target comes from the dietary guideline that most adults need at least this amount to support muscle repair and prevent muscle loss.`);
  
  // Carbohydrates explanation
  explanations.push(`Carbohydrates`);
  explanations.push(`Your carbohydrate target comes from the recommendation that most adults need enough carbs to fuel the brain, which relies heavily on glucose.`);
  
  // Fiber explanation
  const genderText = gender === 'male' ? 'men' : gender === 'female' ? 'women' : 'adults';
  explanations.push(`Fiber`);
  explanations.push(`Your ${targetFiber} g fiber target comes from national dietary guidelines for ${genderText} to support digestion and heart health.`);
  
  // Total Fat explanation
  explanations.push(`Total Fat`);
  explanations.push(`Your total fat target follows nutrition guidelines for the amount needed to support hormones and vitamin absorption without raising disease risk.`);
  
  // Saturated Fat explanation
  explanations.push(`Saturated Fat`);
  explanations.push(`Your saturated fat limit comes from heart-health guidelines designed to keep LDL cholesterol at safe levels.`);
  
  // Trans Fat explanation
  explanations.push(`Trans Fat`);
  explanations.push(`Your trans fat limit is extremely low because health authorities agree that even small amounts increase cardiovascular risk.`);
  
  // Cholesterol explanation
  explanations.push(`Cholesterol`);
  explanations.push(`Your ${targetCholesterol} mg cholesterol target comes from long-standing dietary guidelines that help maintain healthy blood cholesterol levels.`);
  
  // Sodium explanation
  const hasBloodPressure = healthConditions?.some(c => c.toLowerCase().includes('blood pressure') || c.toLowerCase().includes('hypertension'));
  const hasHeart = healthConditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiovascular'));
  explanations.push(`Sodium`);
  if (hasBloodPressure || hasHeart) {
    explanations.push(`Your ${targetSodium} mg sodium limit is based on recommendations for supporting healthy blood pressure and reducing strain on the cardiovascular system.`);
  } else {
    explanations.push(`Your ${targetSodium} mg sodium target comes from dietary guidelines that help maintain healthy blood pressure and reduce cardiovascular strain.`);
  }

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

