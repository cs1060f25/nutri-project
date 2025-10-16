// InsightsDashboard.tsx
import React, { useState, useEffect } from 'react';
import DateRangeSelector from './DateRangeSelector';
import CalorieProgressChart from './CalorieProgressChart';
import MacroDistributionChart from './MacroDistributionChart';
import MicronutrientTrends from './MicronutrientTrends';
import GoalProgressSummary from './GoalProgressSummary';
import InsightsSummary from './InsightsSummary';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const InsightsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  
  const [nutritionData, setNutritionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNutritionData();
  }, [dateRange]);

  const fetchNutritionData = async () => {
    setLoading(true);
    try {
      // API call to fetch user's nutrition data
      const response = await fetch('/api/nutrition/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        }),
      });
      
      const data = await response.json();
      setNutritionData(data);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Nutrition Insights
          </h1>
          <p className="text-gray-600">
            Understand your eating patterns and make informed decisions about your nutrition
          </p>
        </div>

        {/* Important Disclaimer */}
        <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <svg 
              className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">
                Important: This Tool is for Educational Purposes Only
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                This prototype is designed to help you understand nutrition data from 
                HUDS meals. It should not replace professional medical or nutritional 
                advice. If you have concerns about your diet, eating patterns, or 
                relationship with food, please contact Harvard University Health 
                Services at (617) 495-2068 or visit CAMHS for confidential support.
              </p>
            </div>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6">
          <DateRangeSelector onRangeChange={setDateRange} />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        )}

        {/* Dashboard Content */}
        {!loading && nutritionData && (
          <div className="space-y-6">
            {/* Goal Progress Summary */}
            <GoalProgressSummary goals={nutritionData.goals} />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CalorieProgressChart 
                data={nutritionData.dailyCalories}
                goal={nutritionData.calorieGoal}
              />
              <MacroDistributionChart data={nutritionData.macros} />
            </div>

            {/* Micronutrient Trends */}
            <MicronutrientTrends data={nutritionData.micronutrients} />

            {/* Insights */}
            <InsightsSummary
              dateRange={{
                start: dateRange.startDate.toLocaleDateString(),
                end: dateRange.endDate.toLocaleDateString(),
              }}
              avgCalories={nutritionData.avgCalories}
              highestDay={nutritionData.highestDay}
              lowestDay={nutritionData.lowestDay}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default InsightsDashboard;
