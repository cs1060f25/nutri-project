import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DateRangeSelector, DateRange } from './DateRangeSelector';
import { CalorieIntakeChart } from './CalorieIntakeChart';
import { MacronutrientDistribution } from './MacronutrientDistribution';
import { MicronutrientTrends } from './MicronutrientTrends';
import { GoalStreak } from './GoalStreak';
import { StatisticsSummary } from './StatisticsSummary';
import { RecommendationsPanel } from './RecommendationsPanel';
import {
  generateMockMeals,
  getMockNutritionGoals,
  aggregateMealsByDate
} from '../lib/mockData';
import { BarChart3 } from 'lucide-react';

export function InsightsDashboard() {
  const [selectedRange, setSelectedRange] = useState<DateRange>({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
    endDate: new Date(),
    label: 'Last 30 Days'
  });

  const meals = useMemo(() => generateMockMeals(90), []);
  const goals = useMemo(() => getMockNutritionGoals(), []);

  const dailyData = useMemo(() => {
    return aggregateMealsByDate(meals, selectedRange.startDate, selectedRange.endDate);
  }, [meals, selectedRange]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Nutrition Insights
              </h1>
              <p className="text-gray-600 mt-1">
                Harvard University Dining Services Analytics
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <DateRangeSelector
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </motion.div>

        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <StatisticsSummary dailyData={dailyData} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="grid lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2">
              <CalorieIntakeChart dailyData={dailyData} goals={goals} />
            </div>
            <div>
              <GoalStreak dailyData={dailyData} goals={goals} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <MacronutrientDistribution dailyData={dailyData} goals={goals} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <MicronutrientTrends dailyData={dailyData} goals={goals} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <RecommendationsPanel dailyData={dailyData} goals={goals} />
          </motion.div>
        </div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-12 pt-8 border-t border-gray-200 text-center"
        >
          <p className="text-sm text-gray-500">
            HUDS Nutrition Analyzer Prototype - Data shown is for demonstration purposes
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
