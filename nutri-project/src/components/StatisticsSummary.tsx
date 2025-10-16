import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DailyAggregate } from '../lib/mockData';
import { TrendingUp, TrendingDown, Calendar, Utensils, Apple } from 'lucide-react';
import { format } from 'date-fns';

interface StatisticsSummaryProps {
  dailyData: DailyAggregate[];
}

export function StatisticsSummary({ dailyData }: StatisticsSummaryProps) {
  const statistics = useMemo(() => {
    const totalDays = dailyData.length;

    const totals = dailyData.reduce(
      (acc, day) => ({
        calories: acc.calories + day.totalCalories,
        protein: acc.protein + day.totalProtein,
        meals: acc.meals + day.mealsCount
      }),
      { calories: 0, protein: 0, meals: 0 }
    );

    const averages = {
      calories: Math.round(totals.calories / totalDays),
      protein: Math.round(totals.protein / totalDays),
      meals: (totals.meals / totalDays).toFixed(1)
    };

    const sortedByCalories = [...dailyData].sort((a, b) => b.totalCalories - a.totalCalories);
    const highestDay = sortedByCalories[0];
    const lowestDay = sortedByCalories[sortedByCalories.length - 1];

    const firstHalfDays = Math.floor(totalDays / 2);
    const firstHalf = dailyData.slice(0, firstHalfDays);
    const secondHalf = dailyData.slice(firstHalfDays);

    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.totalCalories, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.totalCalories, 0) / secondHalf.length;

    const trend = secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing';
    const trendPercentage = Math.abs(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1);

    return {
      averages,
      highestDay,
      lowestDay,
      trend,
      trendPercentage,
      totalMeals: totals.meals
    };
  }, [dailyData]);

  const cards = [
    {
      title: 'Average Daily Intake',
      value: statistics.averages.calories.toLocaleString(),
      unit: 'kcal',
      icon: Apple,
      color: 'blue',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Average Protein',
      value: statistics.averages.protein,
      unit: 'g/day',
      icon: TrendingUp,
      color: 'red',
      gradient: 'from-red-500 to-pink-500'
    },
    {
      title: 'Total Meals Logged',
      value: statistics.totalMeals,
      unit: 'meals',
      icon: Utensils,
      color: 'green',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      title: 'Meals Per Day',
      value: statistics.averages.meals,
      unit: 'avg',
      icon: Calendar,
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="text-sm font-medium text-gray-600 mb-1">{card.title}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-gray-800">{card.value}</span>
              <span className="text-sm text-gray-500 font-medium">{card.unit}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Highest Intake Day
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Date</span>
              <span className="text-sm font-semibold text-gray-800">
                {format(statistics.highestDay.date, 'MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Calories</span>
              <span className="text-lg font-bold text-green-600">
                {statistics.highestDay.totalCalories.toLocaleString()} kcal
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Meals</span>
              <span className="text-sm font-semibold text-gray-800">
                {statistics.highestDay.mealsCount}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500">Protein</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.highestDay.totalProtein)}g
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Carbs</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.highestDay.totalCarbs)}g
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Fat</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.highestDay.totalFat)}g
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-blue-600" />
            Lowest Intake Day
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Date</span>
              <span className="text-sm font-semibold text-gray-800">
                {format(statistics.lowestDay.date, 'MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Calories</span>
              <span className="text-lg font-bold text-blue-600">
                {statistics.lowestDay.totalCalories.toLocaleString()} kcal
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Meals</span>
              <span className="text-sm font-semibold text-gray-800">
                {statistics.lowestDay.mealsCount}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
              <div className="text-center">
                <div className="text-xs text-gray-500">Protein</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.lowestDay.totalProtein)}g
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Carbs</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.lowestDay.totalCarbs)}g
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500">Fat</div>
                <div className="text-sm font-bold text-gray-800">
                  {Math.round(statistics.lowestDay.totalFat)}g
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          {statistics.trend === 'increasing' ? (
            <TrendingUp className="w-6 h-6 text-orange-600" />
          ) : (
            <TrendingDown className="w-6 h-6 text-green-600" />
          )}
          <h3 className="text-lg font-bold text-gray-800">Period Trend Analysis</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-lg ${
            statistics.trend === 'increasing' ? 'bg-orange-50' : 'bg-green-50'
          }`}>
            <span className={`text-2xl font-bold ${
              statistics.trend === 'increasing' ? 'text-orange-600' : 'text-green-600'
            }`}>
              {statistics.trend === 'increasing' ? '+' : '-'}{statistics.trendPercentage}%
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Your caloric intake has been{' '}
            <span className="font-semibold text-gray-800">{statistics.trend}</span> compared to the
            earlier period. {statistics.trend === 'increasing'
              ? 'Consider monitoring your portions if weight management is a goal.'
              : 'Make sure you\'re meeting your energy needs for daily activities.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
