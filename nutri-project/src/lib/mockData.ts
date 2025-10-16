export interface NutritionGoals {
  dailyCalorieTarget: number;
  proteinGramsTarget: number;
  carbsGramsTarget: number;
  fatGramsTarget: number;
  sodiumMgLimit: number;
  fiberGramsTarget: number;
  ironMgTarget: number;
  calciumMgTarget: number;
}

export interface MealEntry {
  id: string;
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  diningHall: string;
  mealName: string;
  nutrition: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    sodiumMg: number;
    fiberGrams: number;
    sugarGrams: number;
    ironMg: number;
    calciumMg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
  };
}

export interface DailyAggregate {
  date: Date;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalSodium: number;
  totalFiber: number;
  totalIron: number;
  totalCalcium: number;
  mealsCount: number;
}

const diningHalls = [
  'Annenberg Hall',
  'Adams House',
  'Cabot House',
  'Quincy House',
  'Leverett House',
  'Dunster House'
];

const breakfastMeals = [
  'Scrambled Eggs with Toast',
  'Oatmeal with Berries',
  'Greek Yogurt Parfait',
  'Pancakes with Syrup',
  'Breakfast Burrito',
  'Avocado Toast',
  'Cereal with Milk',
  'French Toast'
];

const lunchMeals = [
  'Grilled Chicken Salad',
  'Turkey Sandwich',
  'Vegetable Stir Fry',
  'Quinoa Bowl',
  'Pasta Primavera',
  'Caesar Salad with Salmon',
  'Black Bean Burger',
  'Soup and Salad Combo'
];

const dinnerMeals = [
  'Grilled Salmon with Rice',
  'Beef Stir Fry',
  'Vegetarian Lasagna',
  'Chicken Breast with Vegetables',
  'Tofu Curry',
  'Pork Tenderloin',
  'Shrimp Pasta',
  'Roasted Chicken Thighs'
];

const snackMeals = [
  'Apple with Peanut Butter',
  'Protein Bar',
  'Mixed Nuts',
  'Banana',
  'Hummus with Carrots',
  'Trail Mix'
];

function generateNutritionForMealType(mealType: string): MealEntry['nutrition'] {
  const baseValues = {
    breakfast: {
      calories: [350, 550],
      protein: [15, 30],
      carbs: [40, 70],
      fat: [12, 25],
      sodium: [400, 800],
      fiber: [3, 8],
      sugar: [10, 25],
      iron: [2, 4],
      calcium: [150, 350],
      vitaminC: [5, 15],
      vitaminD: [1, 3]
    },
    lunch: {
      calories: [450, 700],
      protein: [20, 40],
      carbs: [45, 80],
      fat: [15, 30],
      sodium: [600, 1000],
      fiber: [5, 12],
      sugar: [8, 20],
      iron: [3, 6],
      calcium: [100, 250],
      vitaminC: [10, 30],
      vitaminD: [1, 2]
    },
    dinner: {
      calories: [500, 800],
      protein: [25, 50],
      carbs: [50, 90],
      fat: [18, 35],
      sodium: [700, 1200],
      fiber: [6, 14],
      sugar: [6, 18],
      iron: [4, 8],
      calcium: [120, 300],
      vitaminC: [15, 40],
      vitaminD: [2, 4]
    },
    snack: {
      calories: [150, 300],
      protein: [5, 15],
      carbs: [15, 40],
      fat: [5, 15],
      sodium: [100, 300],
      fiber: [2, 6],
      sugar: [5, 15],
      iron: [1, 3],
      calcium: [50, 150],
      vitaminC: [5, 20],
      vitaminD: [0.5, 1.5]
    }
  };

  const ranges = baseValues[mealType as keyof typeof baseValues];

  const randomInRange = (range: number[]) =>
    Math.round((Math.random() * (range[1] - range[0]) + range[0]) * 10) / 10;

  return {
    calories: Math.round(randomInRange(ranges.calories)),
    proteinGrams: randomInRange(ranges.protein),
    carbsGrams: randomInRange(ranges.carbs),
    fatGrams: randomInRange(ranges.fat),
    sodiumMg: Math.round(randomInRange(ranges.sodium)),
    fiberGrams: randomInRange(ranges.fiber),
    sugarGrams: randomInRange(ranges.sugar),
    ironMg: randomInRange(ranges.iron),
    calciumMg: randomInRange(ranges.calcium),
    vitaminCMg: randomInRange(ranges.vitaminC),
    vitaminDMcg: randomInRange(ranges.vitaminD)
  };
}

function selectMealName(mealType: string): string {
  const meals = {
    breakfast: breakfastMeals,
    lunch: lunchMeals,
    dinner: dinnerMeals,
    snack: snackMeals
  };

  const mealArray = meals[mealType as keyof typeof meals];
  return mealArray[Math.floor(Math.random() * mealArray.length)];
}

export function generateMockMeals(daysBack: number = 90): MealEntry[] {
  const meals: MealEntry[] = [];
  const today = new Date();

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const mealsPerDay = Math.random() > 0.1 ? 3 : 2;
    const hasDinner = Math.random() > 0.05;
    const hasSnack = Math.random() > 0.6;

    meals.push({
      id: `${date.toISOString()}-breakfast`,
      date,
      mealType: 'breakfast',
      diningHall: diningHalls[Math.floor(Math.random() * diningHalls.length)],
      mealName: selectMealName('breakfast'),
      nutrition: generateNutritionForMealType('breakfast')
    });

    meals.push({
      id: `${date.toISOString()}-lunch`,
      date,
      mealType: 'lunch',
      diningHall: diningHalls[Math.floor(Math.random() * diningHalls.length)],
      mealName: selectMealName('lunch'),
      nutrition: generateNutritionForMealType('lunch')
    });

    if (hasDinner) {
      meals.push({
        id: `${date.toISOString()}-dinner`,
        date,
        mealType: 'dinner',
        diningHall: diningHalls[Math.floor(Math.random() * diningHalls.length)],
        mealName: selectMealName('dinner'),
        nutrition: generateNutritionForMealType('dinner')
      });
    }

    if (hasSnack) {
      meals.push({
        id: `${date.toISOString()}-snack`,
        date,
        mealType: 'snack',
        diningHall: diningHalls[Math.floor(Math.random() * diningHalls.length)],
        mealName: selectMealName('snack'),
        nutrition: generateNutritionForMealType('snack')
      });
    }
  }

  return meals.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function getMockNutritionGoals(): NutritionGoals {
  return {
    dailyCalorieTarget: 2200,
    proteinGramsTarget: 80,
    carbsGramsTarget: 250,
    fatGramsTarget: 73,
    sodiumMgLimit: 2300,
    fiberGramsTarget: 30,
    ironMgTarget: 8,
    calciumMgTarget: 1000
  };
}

export function aggregateMealsByDate(
  meals: MealEntry[],
  startDate: Date,
  endDate: Date
): DailyAggregate[] {
  const filteredMeals = meals.filter(meal => {
    const mealDate = new Date(meal.date);
    mealDate.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return mealDate >= start && mealDate <= end;
  });

  const dailyMap = new Map<string, DailyAggregate>();

  filteredMeals.forEach(meal => {
    const dateKey = meal.date.toISOString().split('T')[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: new Date(meal.date),
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalSodium: 0,
        totalFiber: 0,
        totalIron: 0,
        totalCalcium: 0,
        mealsCount: 0
      });
    }

    const aggregate = dailyMap.get(dateKey)!;
    aggregate.totalCalories += meal.nutrition.calories;
    aggregate.totalProtein += meal.nutrition.proteinGrams;
    aggregate.totalCarbs += meal.nutrition.carbsGrams;
    aggregate.totalFat += meal.nutrition.fatGrams;
    aggregate.totalSodium += meal.nutrition.sodiumMg;
    aggregate.totalFiber += meal.nutrition.fiberGrams;
    aggregate.totalIron += meal.nutrition.ironMg;
    aggregate.totalCalcium += meal.nutrition.calciumMg;
    aggregate.mealsCount += 1;
  });

  return Array.from(dailyMap.values()).sort((a, b) =>
    a.date.getTime() - b.date.getTime()
  );
}
