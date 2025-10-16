import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DailyAggregate, NutritionGoals } from '../lib/mockData';
import {
  AlertCircle,
  CheckCircle,
  Info,
  Lightbulb,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface RecommendationsProps {
  dailyData: DailyAggregate[];
  goals: NutritionGoals;
}

interface Recommendation {
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  icon: any;
}

export function RecommendationsPanel({ dailyData, goals }: RecommendationsProps) {
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const totalDays = dailyData.length;

    const averages = dailyData.reduce(
      (acc, day) => ({
        calories: acc.calories + day.totalCalories,
        protein: acc.protein + day.totalProtein,
        carbs: acc.carbs + day.totalCarbs,
        fat: acc.fat + day.totalFat,
        sodium: acc.sodium + day.totalSodium,
        fiber: acc.fiber + day.totalFiber,
        iron: acc.iron + day.totalIron,
        calcium: acc.calcium + day.totalCalcium
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 0, fiber: 0, iron: 0, calcium: 0 }
    );

    const avg = {
      calories: averages.calories / totalDays,
      protein: averages.protein / totalDays,
      carbs: averages.carbs / totalDays,
      fat: averages.fat / totalDays,
      sodium: averages.sodium / totalDays,
      fiber: averages.fiber / totalDays,
      iron: averages.iron / totalDays,
      calcium: averages.calcium / totalDays
    };

    const caloriesDiff = ((avg.calories - goals.dailyCalorieTarget) / goals.dailyCalorieTarget) * 100;

    if (Math.abs(caloriesDiff) <= 10) {
      recs.push({
        type: 'success',
        title: 'Excellent Calorie Management',
        message: `Your average daily intake of ${Math.round(avg.calories)} kcal is within 10% of your target. Keep maintaining this consistency!`,
        icon: CheckCircle
      });
    } else if (caloriesDiff > 10) {
      recs.push({
        type: 'warning',
        title: 'Calorie Intake Above Target',
        message: `You're averaging ${Math.round(caloriesDiff)}% above your daily calorie goal. Consider reducing portion sizes or choosing lower-calorie alternatives.`,
        icon: AlertTriangle
      });
    } else {
      recs.push({
        type: 'alert',
        title: 'Calorie Intake Below Target',
        message: `You're averaging ${Math.round(Math.abs(caloriesDiff))}% below your daily calorie goal. Ensure you're eating enough to support your energy needs and activities.`,
        icon: AlertCircle
      });
    }

    if (avg.protein < goals.proteinGramsTarget * 0.8) {
      recs.push({
        type: 'warning',
        title: 'Insufficient Protein Intake',
        message: `Your average protein intake (${Math.round(avg.protein)}g) is below 80% of your target. Try adding lean meats, fish, legumes, or Greek yogurt to your meals.`,
        icon: AlertTriangle
      });
    } else if (avg.protein >= goals.proteinGramsTarget) {
      recs.push({
        type: 'success',
        title: 'Great Protein Intake',
        message: `You're meeting your protein goals with an average of ${Math.round(avg.protein)}g per day. Protein supports muscle maintenance and satiety.`,
        icon: CheckCircle
      });
    }

    if (avg.sodium > goals.sodiumMgLimit) {
      recs.push({
        type: 'alert',
        title: 'High Sodium Levels',
        message: `Your sodium intake averages ${Math.round(avg.sodium)}mg, exceeding your limit of ${goals.sodiumMgLimit}mg. Consider reducing processed foods and adding less salt to meals.`,
        icon: AlertCircle
      });
    }

    if (avg.fiber < goals.fiberGramsTarget * 0.7) {
      recs.push({
        type: 'warning',
        title: 'Low Fiber Intake',
        message: `At ${avg.fiber.toFixed(1)}g per day, you're below 70% of your fiber goal. Include more whole grains, vegetables, fruits, and legumes for digestive health.`,
        icon: Info
      });
    }

    if (avg.calcium < goals.calciumMgTarget * 0.7) {
      recs.push({
        type: 'info',
        title: 'Boost Calcium Intake',
        message: `Your calcium intake averages ${Math.round(avg.calcium)}mg, below optimal levels. Consider adding dairy products, fortified plant milks, or leafy greens to support bone health.`,
        icon: Lightbulb
      });
    }

    if (avg.iron < goals.ironMgTarget * 0.7) {
      recs.push({
        type: 'info',
        title: 'Consider Iron-Rich Foods',
        message: `At ${avg.iron.toFixed(1)}mg per day, your iron intake could be improved. Include red meat, spinach, lentils, or fortified cereals. Pair with vitamin C for better absorption.`,
        icon: Lightbulb
      });
    }

    const variance = dailyData.map(d => Math.abs(d.totalCalories - avg.calories));
    const avgVariance = variance.reduce((a, b) => a + b, 0) / variance.length;

    if (avgVariance < goals.dailyCalorieTarget * 0.15) {
      recs.push({
        type: 'success',
        title: 'Consistent Eating Patterns',
        message: 'Your daily calorie intake shows good consistency. Regular eating patterns support better metabolic health and energy levels.',
        icon: TrendingUp
      });
    } else {
      recs.push({
        type: 'info',
        title: 'Variable Eating Patterns',
        message: 'Your daily intake varies significantly. Try to maintain more consistent meal timing and portions for better energy regulation throughout the day.',
        icon: Info
      });
    }

    const lowCalorieDays = dailyData.filter(d => d.totalCalories < goals.dailyCalorieTarget * 0.7).length;
    if (lowCalorieDays > totalDays * 0.2) {
      recs.push({
        type: 'alert',
        title: 'Frequent Low-Calorie Days',
        message: `You had ${lowCalorieDays} days with very low calorie intake. Consistent under-eating can affect energy, mood, and metabolism. Consider meal planning to ensure adequate nutrition.`,
        icon: AlertCircle
      });
    }

    return recs.slice(0, 6);
  }, [dailyData, goals]);

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          titleColor: 'text-green-800'
        };
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-100',
          iconColor: 'text-orange-600',
          titleColor: 'text-orange-800'
        };
      case 'alert':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-800'
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-800'
        };
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-amber-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-800">Personalized Recommendations</h2>
          <p className="text-sm text-gray-500">Insights based on your nutrition patterns</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => {
          const styles = getTypeStyles(rec.type);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`${styles.bg} ${styles.border} border rounded-lg p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-3">
                <div className={`${styles.iconBg} p-2 rounded-lg flex-shrink-0`}>
                  <rec.icon className={`w-5 h-5 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-bold ${styles.titleColor} mb-1`}>
                    {rec.title}
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {rec.message}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
