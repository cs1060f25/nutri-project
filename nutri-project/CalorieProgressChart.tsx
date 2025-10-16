// CalorieProgressChart.tsx
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface CalorieData {
  date: string;
  calories: number;
  goal: number;
}

const CalorieProgressChart: React.FC<{
  data: CalorieData[];
  goal: number;
}> = ({ data, goal }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload;
      const difference = data.calories - goal;
      
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border 
                      border-gray-200">
          <p className="text-sm font-medium text-gray-900">
            {data.date}
          </p>
          <p className="text-sm text-gray-600">
            Intake: {data.calories} kcal
          </p>
          <p className="text-xs text-gray-500">
            {Math.abs(difference)} kcal {difference > 0 ? 'above' : 'below'} goal
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Daily Caloric Intake
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Track your daily intake relative to your personal goal
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{ value: 'Calories', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine 
            y={goal} 
            stroke="#6366f1" 
            strokeDasharray="5 5"
            label={{ value: 'Your Goal', position: 'right', fill: '#6366f1' }}
          />
          
          <Line
            type="monotone"
            dataKey="calories"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: '#8b5cf6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <p className="text-xs text-gray-700">
          <strong>Note:</strong> Daily needs vary based on activity level, 
          stress, and other factors. These visualizations help identify 
          patterns over time rather than judge individual days.
        </p>
      </div>
    </div>
  );
};

export default CalorieProgressChart;
