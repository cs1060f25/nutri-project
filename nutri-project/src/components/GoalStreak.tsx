import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DailyAggregate, NutritionGoals } from '../lib/mockData';
import { Flame, Award, TrendingUp, CheckCircle2 } from 'lucide-react';

interface GoalStreakProps {
  dailyData: DailyAggregate[];
  goals: NutritionGoals;
}

export function GoalStreak({ dailyData, goals }: GoalStreakProps) {
  const streakData = useMemo(() => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let daysOnTarget = 0;

    const sortedData = [...dailyData].sort((a, b) => b.date.getTime() - a.date.getTime());

    sortedData.forEach((day, index) => {
      const caloriesDiff = Math.abs(day.totalCalories - goals.dailyCalorieTarget);
      const caloriesWithinRange = caloriesDiff <= goals.dailyCalorieTarget * 0.1;

      const proteinMet = day.totalProtein >= goals.proteinGramsTarget * 0.8;
      const carbsMet = day.totalCarbs >= goals.carbsGramsTarget * 0.8;
      const fatMet = day.totalFat >= goals.fatGramsTarget * 0.8;

      const goalMet = caloriesWithinRange && proteinMet && carbsMet && fatMet;

      if (goalMet) {
        daysOnTarget++;
        tempStreak++;

        if (index === 0 || currentStreak > 0) {
          currentStreak = tempStreak;
        }

        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        if (index > 0) {
          currentStreak = 0;
        }
        tempStreak = 0;
      }
    });

    const consistency = ((daysOnTarget / dailyData.length) * 100).toFixed(0);

    return {
      currentStreak,
      longestStreak,
      daysOnTarget,
      consistency: Number(consistency)
    };
  }, [dailyData, goals]);

  const getStreakColor = (streak: number) => {
    if (streak >= 7) return 'from-green-500 to-emerald-600';
    if (streak >= 3) return 'from-blue-500 to-cyan-600';
    return 'from-gray-400 to-gray-500';
  };

  const getConsistencyLevel = (percentage: number) => {
    if (percentage >= 80) return { text: 'Excellent', color: 'text-green-600' };
    if (percentage >= 60) return { text: 'Good', color: 'text-blue-600' };
    if (percentage >= 40) return { text: 'Fair', color: 'text-orange-600' };
    return { text: 'Needs Improvement', color: 'text-red-600' };
  };

  const consistencyLevel = getConsistencyLevel(streakData.consistency);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Goal Streak</h2>
          <p className="text-sm text-gray-500 mt-1">Track your nutrition consistency</p>
        </div>
        <Flame className="w-6 h-6 text-orange-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${getStreakColor(streakData.currentStreak)} p-6 text-white`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">Current Streak</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{streakData.currentStreak}</span>
              <span className="text-lg font-medium opacity-90">
                {streakData.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </div>
            {streakData.currentStreak >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm font-medium"
              >
                Keep it up!
              </motion.div>
            )}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-10 rounded-full -ml-12 -mb-12" />
        </motion.div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-xs text-gray-600 font-medium">Longest Streak</div>
                <div className="text-2xl font-bold text-gray-800">{streakData.longestStreak}</div>
              </div>
            </div>
            <span className="text-sm text-gray-600">
              {streakData.longestStreak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-xs text-gray-600 font-medium">Days On Target</div>
                <div className="text-2xl font-bold text-gray-800">{streakData.daysOnTarget}</div>
              </div>
            </div>
            <span className="text-sm text-gray-600">
              of {dailyData.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Consistency Score</span>
          </div>
          <span className={`text-sm font-bold ${consistencyLevel.color}`}>
            {consistencyLevel.text}
          </span>
        </div>

        <div className="relative">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${streakData.consistency}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-500">0%</span>
            <span className="text-sm font-bold text-gray-700">{streakData.consistency}%</span>
            <span className="text-xs text-gray-500">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
