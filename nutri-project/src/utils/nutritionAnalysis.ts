import { MealLog, MealItem, DietGoal } from '../lib/supabase';

export interface DailyNutrition {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sodium: number;
  calcium: number;
  iron: number;
  fiber: number;
  sugar: number;
}

export interface NutritionSummary {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgSodium: number;
  avgCalcium: number;
  avgIron: number;
  highestCalorieDay: { date: string; calories: number };
  lowestCalorieDay: { date: string; calories: number };
  goalAlignment: number;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  successfulDays: number;
}

export const calculateDailyNutrition = (
  mealLogs: (MealLog & { meal_items: MealItem[] })[]
): DailyNutrition[] => {
  const dailyMap = new Map<string, DailyNutrition>();

  mealLogs.forEach(meal => {
    const date = meal.meal_date;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        sodium: 0,
        calcium: 0,
        iron: 0,
        fiber: 0,
        sugar: 0,
      });
    }

    const daily = dailyMap.get(date)!;

    meal.meal_items.forEach(item => {
      daily.calories += item.calories;
      daily.protein += Number(item.protein_g);
      daily.carbs += Number(item.carbs_g);
      daily.fat += Number(item.fat_g);
      daily.sodium += Number(item.sodium_mg);
      daily.calcium += Number(item.calcium_mg || 0);
      daily.iron += Number(item.iron_mg || 0);
      daily.fiber += Number(item.fiber_g || 0);
      daily.sugar += Number(item.sugar_g || 0);
    });
  });

  return Array.from(dailyMap.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const calculateNutritionSummary = (
  dailyNutrition: DailyNutrition[],
  goal: DietGoal
): NutritionSummary => {
  if (dailyNutrition.length === 0) {
    return {
      avgCalories: 0,
      avgProtein: 0,
      avgCarbs: 0,
      avgFat: 0,
      avgSodium: 0,
      avgCalcium: 0,
      avgIron: 0,
      highestCalorieDay: { date: '', calories: 0 },
      lowestCalorieDay: { date: '', calories: 0 },
      goalAlignment: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0,
      successfulDays: 0,
    };
  }

  const totalCalories = dailyNutrition.reduce((sum, d) => sum + d.calories, 0);
  const totalProtein = dailyNutrition.reduce((sum, d) => sum + d.protein, 0);
  const totalCarbs = dailyNutrition.reduce((sum, d) => sum + d.carbs, 0);
  const totalFat = dailyNutrition.reduce((sum, d) => sum + d.fat, 0);
  const totalSodium = dailyNutrition.reduce((sum, d) => sum + d.sodium, 0);
  const totalCalcium = dailyNutrition.reduce((sum, d) => sum + d.calcium, 0);
  const totalIron = dailyNutrition.reduce((sum, d) => sum + d.iron, 0);

  const days = dailyNutrition.length;

  const highestDay = dailyNutrition.reduce((max, d) =>
    d.calories > max.calories ? d : max
  );
  const lowestDay = dailyNutrition.reduce((min, d) =>
    d.calories < min.calories ? d : min
  );

  const successfulDays = dailyNutrition.filter(d =>
    isWithinGoalRange(d.calories, goal.target_calories) &&
    isWithinGoalRange(d.protein, Number(goal.target_protein_g)) &&
    isWithinGoalRange(d.carbs, Number(goal.target_carbs_g)) &&
    isWithinGoalRange(d.fat, Number(goal.target_fat_g))
  ).length;

  const streaks = calculateStreaks(dailyNutrition, goal);

  return {
    avgCalories: totalCalories / days,
    avgProtein: totalProtein / days,
    avgCarbs: totalCarbs / days,
    avgFat: totalFat / days,
    avgSodium: totalSodium / days,
    avgCalcium: totalCalcium / days,
    avgIron: totalIron / days,
    highestCalorieDay: { date: highestDay.date, calories: highestDay.calories },
    lowestCalorieDay: { date: lowestDay.date, calories: lowestDay.calories },
    goalAlignment: (successfulDays / days) * 100,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    totalDays: days,
    successfulDays,
  };
};

const isWithinGoalRange = (actual: number, target: number, tolerance: number = 0.15): boolean => {
  const lower = target * (1 - tolerance);
  const upper = target * (1 + tolerance);
  return actual >= lower && actual <= upper;
};

const calculateStreaks = (dailyNutrition: DailyNutrition[], goal: DietGoal) => {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const sortedDays = [...dailyNutrition].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  sortedDays.forEach((day, index) => {
    const isSuccessful =
      isWithinGoalRange(day.calories, goal.target_calories) &&
      isWithinGoalRange(day.protein, Number(goal.target_protein_g)) &&
      isWithinGoalRange(day.carbs, Number(goal.target_carbs_g)) &&
      isWithinGoalRange(day.fat, Number(goal.target_fat_g));

    if (isSuccessful) {
      tempStreak++;
      if (index === 0) {
        currentStreak = tempStreak;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      if (index === 0) {
        currentStreak = 0;
      }
      tempStreak = 0;
    }
  });

  return { current: currentStreak, longest: longestStreak };
};

export const generateRecommendations = (
  summary: NutritionSummary,
  goal: DietGoal
): string[] => {
  const recommendations: string[] = [];

  if (summary.avgCalories < goal.target_calories * 0.85) {
    recommendations.push('Your average calorie intake is below your target. Consider adding more nutrient-dense foods to your meals.');
  } else if (summary.avgCalories > goal.target_calories * 1.15) {
    recommendations.push('Your average calorie intake exceeds your target. Try reducing portion sizes or choosing lower-calorie options.');
  }

  if (summary.avgProtein < Number(goal.target_protein_g) * 0.85) {
    recommendations.push('Increase protein intake by adding lean meats, fish, eggs, or plant-based proteins to your meals.');
  }

  if (summary.avgSodium > Number(goal.target_sodium_mg)) {
    recommendations.push('Your sodium intake is high. Try to limit processed foods and add less salt to your meals.');
  }

  if (summary.avgCalcium < Number(goal.target_calcium_mg || 1000) * 0.85) {
    recommendations.push('Consider adding more calcium-rich foods like dairy products, leafy greens, or fortified foods.');
  }

  if (summary.currentStreak === 0 && summary.longestStreak > 0) {
    recommendations.push('You had a great streak going! Try to get back on track with your nutrition goals.');
  }

  if (summary.goalAlignment >= 80) {
    recommendations.push('Great job! You are consistently meeting your nutrition goals.');
  }

  return recommendations;
};
