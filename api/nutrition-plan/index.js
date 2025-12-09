// Vercel serverless function for /api/nutrition-plan (handles GET, POST, and progress)
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const getDb = () => admin.firestore();
const USERS_COLLECTION = 'users';
const NUTRITION_PLANS_SUBCOLLECTION = 'nutritionPlans';
const MEALS_SUBCOLLECTION = 'meals';

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

// Maximum allowed values for nutrition metrics (reasonable upper bounds)
const MAX_ALLOWED_VALUES = {
  calories: 10000,
  caloriesFromFat: 5000,
  protein: 500,
  totalCarbs: 1000,
  totalFat: 300,
  saturatedFat: 100,
  transFat: 20,
  fiber: 100,
  sugars: 500,
  cholesterol: 1000,
  sodium: 10000,
};

/**
 * Sanitize and clamp metric values to prevent abuse
 */
const sanitizeMetrics = (metrics) => {
  if (!metrics || typeof metrics !== 'object') return metrics;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(metrics)) {
    if (!value || typeof value !== 'object') {
      sanitized[key] = value;
      continue;
    }
    
    const sanitizedMetric = { ...value };
    if (sanitizedMetric.target !== undefined && sanitizedMetric.target !== '') {
      const numValue = parseFloat(sanitizedMetric.target);
      const maxValue = MAX_ALLOWED_VALUES[key];
      if (!isNaN(numValue) && maxValue && numValue > maxValue) {
        sanitizedMetric.target = maxValue.toString();
      }
    }
    sanitized[key] = sanitizedMetric;
  }
  return sanitized;
};

// Calculate age from birthday
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
  // Validate inputs - ensure we have valid numeric values
  if (!age || age <= 0 || !weight || weight <= 0 || !heightFeet || heightFeet <= 0) {
    console.error('Invalid BMR inputs:', { age, gender, heightFeet, heightInches, weight });
    return null;
  }

  const heightInchesTotal = (heightFeet || 0) * 12 + (heightInches || 0);
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
  if (!bmr || bmr <= 0) return null;
  
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

// Adjust calories based on primary goal
const adjustCaloriesForGoal = (tdee, goal) => {
  if (!tdee || tdee <= 0) {
    console.error('Invalid TDEE in adjustCaloriesForGoal:', tdee);
    return null; // Return null instead of default to catch errors
  }
  
  const goalAdjustments = {
    'weight-loss': -500,
    'weight-gain': 300,
    'weight-maintenance': 0,
    'muscle-gain': 300,
    'general-wellness': 0,
    'energy-levels': -200,
    'better-digestion': 0
  };
  const adjustment = goalAdjustments[goal] || 0;
  const result = Math.max(1200, tdee + adjustment);
  console.log('adjustCaloriesForGoal:', { tdee, goal, adjustment, result });
  return result;
};

// Calculate protein target
const calculateProteinTarget = (weight, goal, gender) => {
  if (!weight || weight <= 0) return 50; // Default fallback
  
  const weightKg = weight * 0.453592;
  let proteinPerKg = 1.6;
  
  if (goal === 'muscle-gain') {
    proteinPerKg = 2.2;
  } else if (goal === 'weight-loss') {
    proteinPerKg = 2.0;
  } else if (goal === 'weight-gain') {
    proteinPerKg = 1.8;
  }

  return Math.round(weightKg * proteinPerKg);
};

// Calculate carbohydrate target
const calculateCarbTarget = (calories, goal, hasDiabetes) => {
  if (!calories || calories <= 0) return 200; // Default fallback
  
  if (hasDiabetes) {
    const carbCalories = calories * 0.35;
    return Math.round(carbCalories / 4);
  }

  let carbPercentage = 0.50;
  if (goal === 'weight-loss') {
    carbPercentage = 0.40;
  } else if (goal === 'muscle-gain') {
    carbPercentage = 0.45;
  }

  const carbCalories = calories * carbPercentage;
  return Math.round(carbCalories / 4);
};

// Calculate fat target
const calculateFatTarget = (calories, goal) => {
  if (!calories || calories <= 0) return 65; // Default fallback
  
  const fatPercentage = 0.30;
  const fatCalories = calories * fatPercentage;
  return Math.round(fatCalories / 9);
};

// Calculate sodium target
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

  if (hasHighBloodPressure || hasHeartDisease || hasKidneyDisease) {
    return 1500;
  }
  return 2300;
};

// Calculate cholesterol target
const calculateCholesterolTarget = (healthConditions) => {
  const hasHighCholesterol = healthConditions?.some(condition => 
    condition.toLowerCase().includes('cholesterol')
  );
  const hasHeartDisease = healthConditions?.some(condition => 
    condition.toLowerCase().includes('heart') || condition.toLowerCase().includes('cardiovascular')
  );

  if (hasHighCholesterol || hasHeartDisease) {
    return 200;
  }
  return 300;
};

// Calculate fiber target
const calculateFiberTarget = (gender, age) => {
  if (!age || age <= 0) return 25; // Default fallback
  
  if (gender === 'male') {
    return age >= 50 ? 30 : 38;
  } else if (gender === 'female') {
    return age >= 50 ? 21 : 25;
  } else {
    return age >= 50 ? 25 : 31;
  }
};

// Generate personalized nutrition plan
const generatePersonalizedPlan = (userProfile) => {
  if (!userProfile) {
    return null;
  }

  const { birthday, age, gender, height, weight, activityLevel, primaryGoal, healthConditions } = userProfile;

  // Calculate age from birthday if birthday is provided, otherwise use stored age
  const calculatedAge = birthday ? calculateAgeFromBirthday(birthday) : age;

  // Need essential data to calculate
  if (!calculatedAge || !gender || !height || !weight || !activityLevel) {
    console.error('Missing required profile data:', { calculatedAge, gender, height, weight, activityLevel });
    return null;
  }

  // Ensure height and weight are properly parsed as numbers
  const heightFeet = typeof height === 'object' && height !== null ? parseInt(height.feet) || 5 : (typeof height === 'number' ? Math.floor(height / 12) : 5);
  const heightInches = typeof height === 'object' && height !== null ? parseInt(height.inches) || 0 : (typeof height === 'number' ? height % 12 : 0);
  const weightValue = typeof weight === 'number' ? weight : (weight ? parseFloat(weight) : 0);

  console.log('Parsed profile values:', { 
    originalHeight: height, 
    originalWeight: weight, 
    heightFeet, 
    heightInches, 
    weightValue, 
    calculatedAge,
    gender,
    activityLevel,
    primaryGoal 
  });

  // Validate critical values
  if (weightValue <= 0 || heightFeet <= 0 || calculatedAge <= 0) {
    console.error('Invalid profile values:', { weightValue, heightFeet, heightInches, calculatedAge });
    return null;
  }

  // Calculate BMR and TDEE
  const bmr = calculateBMR(calculatedAge, gender, heightFeet, heightInches, weightValue);
  if (!bmr || bmr <= 0) {
    console.error('Failed to calculate BMR:', { calculatedAge, gender, heightFeet, heightInches, weightValue });
    return null;
  }

  console.log('BMR calculated:', bmr);

  const tdee = calculateTDEE(bmr, activityLevel);
  if (!tdee || tdee <= 0) {
    console.error('Failed to calculate TDEE:', { bmr, activityLevel });
    return null;
  }

  console.log('TDEE calculated:', tdee);

  // Adjust calories for goal
  const targetCalories = adjustCaloriesForGoal(tdee, primaryGoal || 'weight-maintenance');
  
  if (!targetCalories || targetCalories <= 0) {
    console.error('Failed to adjust calories for goal:', { tdee, primaryGoal, targetCalories });
    return null;
  }

  console.log('Target calories calculated:', targetCalories);

  // Calculate macronutrients
  const targetProtein = calculateProteinTarget(weightValue, primaryGoal, gender);
  const hasDiabetes = healthConditions?.some(condition => 
    condition.toLowerCase().includes('diabetes') || condition.toLowerCase().includes('blood sugar')
  );
  const targetCarbs = calculateCarbTarget(targetCalories, primaryGoal, hasDiabetes);
  const targetFat = calculateFatTarget(targetCalories, primaryGoal);

  // Calculate other nutrients
  const targetSodium = calculateSodiumTarget(healthConditions);
  const targetCholesterol = calculateCholesterolTarget(healthConditions);
  const targetFiber = calculateFiberTarget(gender, calculatedAge);

  // Determine suggested preset
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

  // Build explanation
  const explanations = [];
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
  
  explanations.push(`\nProtein target of ${targetProtein}g is calculated from your weight (${weightValue} lbs) and supports ${primaryGoal === 'muscle-gain' ? 'muscle building and recovery' : primaryGoal === 'weight-loss' ? 'muscle preservation during weight loss' : 'daily maintenance needs'}.`);
  
  if (hasDiabetes) {
    explanations.push(`Carbohydrates limited to ${targetCarbs}g (35% of calories) to help manage blood sugar levels.`);
  } else {
    explanations.push(`Carbohydrates set at ${targetCarbs}g (${Math.round((targetCarbs * 4 / targetCalories) * 100)}% of calories) to ${primaryGoal === 'weight-loss' ? 'support weight loss while maintaining energy' : 'provide sustainable energy'}.`);
  }
  
  explanations.push(`Fat target of ${targetFat}g (30% of calories) provides essential fatty acids and helps with nutrient absorption.`);
  
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
          target: Math.round(targetCarbs * 0.1).toString()
        }
      }),
      ...((healthConditions?.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cholesterol'))) && {
        saturatedFat: {
          enabled: true,
          unit: 'g',
          target: '13'
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

// Get current date in Eastern Time (America/New_York)
const getEasternDate = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get date in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
};

// Verify Firebase ID token
const verifyToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('INVALID_TOKEN');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('INVALID_TOKEN');
  }
  
  return await admin.auth().verifyIdToken(idToken, true);
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Parse the path - Vercel may or may not include the /api/nutrition-plan prefix
    let path = req.url;
    if (path.startsWith('/api/nutrition-plan')) {
      path = path.replace('/api/nutrition-plan', '');
    }
    // Remove query string
    path = path.split('?')[0];
    // Ensure path starts with / if it's not empty
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }
    if (!path) {
      path = '';
    }

    console.log('🔍 Nutrition plan route - method:', req.method, 'req.url:', req.url, 'parsed path:', JSON.stringify(path));

    // Route: GET /api/nutrition-plan/progress/today (nutrition progress tracking)
    if (req.method === 'GET' && (path === '/progress/today' || path.includes('progress/today'))) {
      console.log('✅ Matched progress route, fetching active plan for userId:', userId);
      const today = getEasternDate(); // YYYY-MM-DD format in Eastern Time

      // Get active nutrition plan
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const planSnapshot = await plansRef
        .where('isActive', '==', true)
        .limit(1)
        .get();

      console.log('📊 Plan query result - empty?', planSnapshot.empty, 'size:', planSnapshot.size);

      if (planSnapshot.empty) {
        console.log('❌ No active plan found for userId:', userId);
        return res.status(200).json({
          hasActivePlan: false,
          message: 'No active nutrition plan found',
        });
      }

      const planDoc = planSnapshot.docs[0];
      const planData = planDoc.data();
      console.log('✅ Found active plan:', planDoc.id, 'preset:', planData.preset);

      // Get today's meals
      const mealsSnapshot = await getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(MEALS_SUBCOLLECTION)
        .where('mealDate', '==', today)
        .get();

      const meals = [];
      mealsSnapshot.forEach(doc => {
        meals.push(doc.data());
      });

      // Helper to parse nutrient values
      const parseNutrient = (value) => {
        if (!value) return 0;
        const num = parseFloat(value.toString().replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
      };

      // Calculate consumed totals from all meals today
      const consumed = {
        calories: 0,
        protein: 0,
        totalFat: 0,
        saturatedFat: 0,
        totalCarbs: 0,
        fiber: 0, // Note: stored as dietaryFiber in meals, mapped to fiber for progress
        sugars: 0,
        sodium: 0,
      };

      // Calculate totals from meal items (handles both formats)
      const calculateTotals = (items) => {
        const totals = {
          calories: 0,
          protein: 0,
          totalFat: 0,
          saturatedFat: 0,
          totalCarbs: 0,
          dietaryFiber: 0,
          sugars: 0,
          sodium: 0,
        };

        if (!items || !Array.isArray(items)) {
          return totals;
        }

        items.forEach(item => {
          const qty = item.quantity || 1;
          
          // Check if nutrition is nested (old format) or direct (new format from posts)
          if (item.nutrition) {
            // Old format: nutrition nested in item.nutrition
            totals.calories += parseNutrient(item.nutrition.calories || 0) * qty;
            totals.protein += parseNutrient(item.nutrition.protein || 0) * qty;
            totals.totalFat += parseNutrient(item.nutrition.totalFat || item.nutrition.fat || 0) * qty;
            totals.saturatedFat += parseNutrient(item.nutrition.saturatedFat || 0) * qty;
            totals.totalCarbs += parseNutrient(item.nutrition.totalCarbs || item.nutrition.totalCarb || item.nutrition.carbs || 0) * qty;
            totals.dietaryFiber += parseNutrient(item.nutrition.dietaryFiber || 0) * qty;
            totals.sugars += parseNutrient(item.nutrition.sugars || 0) * qty;
            totals.sodium += parseNutrient(item.nutrition.sodium || 0) * qty;
          } else {
            // New format: nutrition values directly on item (from posts/meal plans)
            totals.calories += parseNutrient(item.calories || 0) * qty;
            totals.protein += parseNutrient(item.protein || 0) * qty;
            totals.totalFat += parseNutrient(item.totalFat || item.fat || 0) * qty;
            totals.saturatedFat += parseNutrient(item.saturatedFat || 0) * qty;
            totals.totalCarbs += parseNutrient(item.totalCarbs || item.totalCarb || item.carbs || 0) * qty;
            totals.dietaryFiber += parseNutrient(item.dietaryFiber || 0) * qty;
            totals.sugars += parseNutrient(item.sugars || 0) * qty;
            totals.sodium += parseNutrient(item.sodium || 0) * qty;
          }
        });

        return totals;
      };

      console.log(`📊 Found ${meals.length} meal(s) for ${today}`);
      meals.forEach((meal, index) => {
        console.log(`  Meal ${index + 1}:`, {
          hasTotals: !!meal.totals,
          totalsCalories: meal.totals?.calories,
          hasItems: !!meal.items,
          itemsCount: meal.items?.length,
          mealType: meal.mealType,
          mealDate: meal.mealDate
        });
        
        // Use calculateTotals helper which handles both formats
        if (meal.items && Array.isArray(meal.items)) {
          const mealTotals = calculateTotals(meal.items);
          consumed.calories += mealTotals.calories;
          consumed.protein += mealTotals.protein;
          consumed.totalFat += mealTotals.totalFat;
          consumed.saturatedFat += mealTotals.saturatedFat;
          consumed.totalCarbs += mealTotals.totalCarbs || mealTotals.totalCarb || mealTotals.carbs || 0;
          consumed.fiber += mealTotals.dietaryFiber;
          consumed.sugars += mealTotals.sugars;
          consumed.sodium += mealTotals.sodium;
        } else if (meal.totals) {
          // If meal has pre-calculated totals, use those
          const mealCalories = parseNutrient(meal.totals.calories);
          console.log(`    Adding ${mealCalories} calories from totals`);
          consumed.calories += mealCalories;
          consumed.protein += parseNutrient(meal.totals.protein);
          consumed.totalFat += parseNutrient(meal.totals.totalFat || meal.totals.fat);
          consumed.saturatedFat += parseNutrient(meal.totals.saturatedFat);
          consumed.totalCarbs += parseNutrient(meal.totals.totalCarbs || meal.totals.totalCarb || meal.totals.carbs);
          consumed.fiber += parseNutrient(meal.totals.dietaryFiber);
          consumed.sugars += parseNutrient(meal.totals.sugars);
          consumed.sodium += parseNutrient(meal.totals.sodium);
        } else if (meal.nutrition) {
          // Legacy format: nutrition directly on meal
          consumed.calories += parseNutrient(meal.nutrition.calories || 0);
          consumed.protein += parseNutrient(meal.nutrition.protein || 0);
          consumed.totalFat += parseNutrient(meal.nutrition.totalFat || meal.nutrition.fat || 0);
          consumed.saturatedFat += parseNutrient(meal.nutrition.saturatedFat || 0);
          consumed.totalCarbs += parseNutrient(meal.nutrition.totalCarbs || meal.nutrition.totalCarb || meal.nutrition.carbs || 0);
          consumed.fiber += parseNutrient(meal.nutrition.dietaryFiber || 0);
          consumed.sugars += parseNutrient(meal.nutrition.sugars || 0);
          consumed.sodium += parseNutrient(meal.nutrition.sodium || 0);
        }
      });
      console.log(`📊 Total calories calculated: ${consumed.calories}`);

      // Calculate progress for each metric
      const metrics = planData.metrics || {};
      const progress = {};

      Object.entries(metrics).forEach(([key, metric]) => {
        if (metric.enabled) {
          const target = parseFloat(metric.target);
          const current = consumed[key] || 0;
          const percentage = target > 0 ? Math.round((current / target) * 100) : 0;
          const remaining = Math.max(0, target - current);

          let status = 'below';
          if (percentage >= 100) status = 'met';
          else if (percentage >= 80) status = 'close';

          progress[key] = {
            current: Math.round(current * 10) / 10,
            target,
            unit: metric.unit,
            percentage,
            remaining: Math.round(remaining * 10) / 10,
            status,
          };
        }
      });

      return res.status(200).json({
        hasActivePlan: true,
        planName: planData.presetName || 'Custom Plan',
        mealCount: meals.length,
        progress,
      });
    }

    // Handle GET request - Get active nutrition plan
    if (req.method === 'GET' && (path === '' || path === '/')) {
      console.log('✅ Matched base GET route (active plan), fetching for userId:', userId);
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const snapshot = await plansRef
        .where('isActive', '==', true)
        .limit(1)
        .get();

      console.log('📊 Base GET - Plan query result - empty?', snapshot.empty, 'size:', snapshot.size);

      if (snapshot.empty) {
        console.log('❌ No active plan found (base GET) for userId:', userId);
        return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'No active nutrition plan found.'));
      }

      const doc = snapshot.docs[0];
      const plan = {
        id: doc.id,
        ...doc.data(),
      };

      console.log('✅ Returning active plan (base GET):', doc.id);
      return res.status(200).json({ plan });
    }

    // Route: GET /api/nutrition-plan/history (get plan history)
    if (req.method === 'GET' && path === '/history') {
      const limit = parseInt(req.query?.limit) || 10;

      const snapshot = await getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const plans = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({ plans });
    }

    // Route: GET /api/nutrition-plan/personalized (get personalized recommendation)
    if (req.method === 'GET' && path === '/personalized') {
      console.log('✅ Matched personalized route for userId:', userId);
      
      // Get user profile
      const profileDoc = await getDb().collection(USERS_COLLECTION).doc(userId).get();
      
      if (!profileDoc.exists) {
        console.log('❌ Profile not found for userId:', userId);
        return res.status(404).json(
          createErrorResponse('PROFILE_NOT_FOUND', 'User profile not found. Please complete your profile.')
        );
      }

      const profile = profileDoc.data();
      console.log('📋 Raw profile data:', JSON.stringify(profile, null, 2));
      
      // Generate personalized plan using the service logic
      const personalizedPlan = generatePersonalizedPlan(profile);

      if (!personalizedPlan) {
        console.log('❌ Failed to generate personalized plan - insufficient data');
        return res.status(400).json(
          createErrorResponse('INSUFFICIENT_DATA', 'Insufficient profile data to generate personalized plan. Please complete your profile.')
        );
      }

      console.log('✅ Generated personalized plan with calories:', personalizedPlan.metrics?.calories?.target);
      return res.status(200).json({
        recommendation: personalizedPlan,
      });
    }

    // Route: GET /api/nutrition-plan/:planId (get specific plan by ID)
    if (req.method === 'GET' && path && path !== '' && path !== '/' && path !== '/progress/today' && path !== '/history' && path !== '/personalized') {
      const planId = path.substring(1); // Remove leading /
      
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .doc(planId);

      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'Nutrition plan not found.'));
      }

      const plan = {
        id: doc.id,
        ...doc.data(),
      };

      return res.status(200).json({ plan });
    }

    // Route: PUT /api/nutrition-plan/:planId (update plan)
    if (req.method === 'PUT' && path && path !== '' && path !== '/') {
      const planId = path.substring(1); // Remove leading /
      const planData = req.body;

      if (!planData || Object.keys(planData).length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
      }

      // Sanitize metrics to prevent absurdly large values
      if (planData.metrics) {
        planData.metrics = sanitizeMetrics(planData.metrics);
      }

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const docRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .doc(planId);

      const payload = {
        preset: planData.preset || null,
        presetName: planData.presetName || null,
        metrics: planData.metrics || {},
        updatedAt: timestamp,
      };

      // Use merge: true for other fields, but explicitly update metrics
      // to ensure disabled metrics are removed (not just merged)
      await docRef.set(payload, { merge: true });
      await docRef.update({ metrics: planData.metrics || {} });

      const updatedDoc = await docRef.get();
      const updatedPlan = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };

      return res.status(200).json({
        message: 'Nutrition plan updated successfully',
        plan: updatedPlan,
      });
    }

    // Route: DELETE /api/nutrition-plan/:planId (delete plan)
    // Match paths like /G4EY6PDt9IZ0m8rTp4AP (single ID segment)
    if (req.method === 'DELETE') {
      // Check if path matches a single ID (not /progress/, /history/, /personalized, or empty)
      const idMatch = path.match(/^\/([^/]+)$/);
      if (idMatch && !path.startsWith('/progress') && !path.startsWith('/history') && !path.startsWith('/personalized')) {
        const planId = idMatch[1];
        
        const docRef = getDb()
          .collection(USERS_COLLECTION)
          .doc(userId)
          .collection(NUTRITION_PLANS_SUBCOLLECTION)
          .doc(planId);

        const doc = await docRef.get();
        
        if (!doc.exists) {
          return res.status(404).json(createErrorResponse('PLAN_NOT_FOUND', 'Nutrition plan not found.'));
        }

        await docRef.delete();

        return res.status(200).json({
          message: 'Nutrition plan deleted successfully',
          id: planId,
        });
      }
    }

    // Handle POST request - Create new nutrition plan
    if (req.method === 'POST' && (path === '' || path === '/')) {
      const planData = req.body;
      if (!planData || Object.keys(planData).length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Plan data is required.'));
      }

      // Sanitize metrics to prevent absurdly large values
      if (planData.metrics) {
        planData.metrics = sanitizeMetrics(planData.metrics);
      }

      // Save to Firestore
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const plansRef = getDb()
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION);

      const payload = {
        preset: planData.preset || null,
        presetName: planData.presetName || null,
        metrics: planData.metrics || {},
        isActive: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      // Deactivate existing active plans
      const activePlans = await plansRef.where('isActive', '==', true).get();
      const batch = getDb().batch();
      activePlans.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });

      // Create new plan
      const docRef = plansRef.doc();
      batch.set(docRef, payload);
      await batch.commit();

      const savedDoc = await docRef.get();
      const savedPlan = {
        id: savedDoc.id,
        ...savedDoc.data(),
      };

      return res.status(201).json({
        message: 'Nutrition plan created successfully',
        plan: savedPlan,
      });
    }

    // Method not allowed
    return res.status(405).json(createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));

  } catch (error) {
    console.error('Error with nutrition plan:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to process nutrition plan request.'));
  }
};

