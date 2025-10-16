// MacroDistributionChart.tsx
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface MacroData {
  date: string;
  carbs: number;
  protein: number;
  fats: number;
}

const MacroDistributionChart: React.FC<{
  data: MacroData[];
}> = ({ data }) => {
  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Macronutrient Distribution Over Time
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          View the balance of carbohydrates, proteins, and fats in your diet
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#9ca3af"
            label={{ value: 'Grams', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          <Bar dataKey="carbs" fill="#f59e0b" name="Carbohydrates" />
          <Bar dataKey="protein" fill="#8b5cf6" name="Protein" />
          <Bar dataKey="fats" fill="#06b6d4" name="Fats" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-orange-50 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs font-medium text-gray-700">Carbs</span>
          </div>
          <p className="text-xs text-gray-600">
            Primary energy source for brain and muscles
          </p>
        </div>
        
        <div className="p-3 bg-purple-50 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-xs font-medium text-gray-700">Protein</span>
          </div>
          <p className="text-xs text-gray-600">
            Essential for muscle repair and growth
          </p>
        </div>
        
        <div className="p-3 bg-cyan-50 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
            <span className="text-xs font-medium text-gray-700">Fats</span>
          </div>
          <p className="text-xs text-gray-600">
            Important for hormone production and absorption
          </p>
        </div>
      </div>
    </div>
  );
};

export default MacroDistributionChart;
