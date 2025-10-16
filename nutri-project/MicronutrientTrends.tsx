// MicronutrientTrends.tsx
import React from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, Tooltip
} from 'recharts';

interface MicronutrientData {
  nutrient: string;
  value: number;
  recommended: number;
  unit: string;
}

const MicronutrientTrends: React.FC<{
  data: MicronutrientData[];
}> = ({ data }) => {
  const chartData = data.map(item => ({
    nutrient: item.nutrient,
    percentage: Math.min((item.value / item.recommended) * 100, 150),
    actual: `${item.value}${item.unit}`,
    recommended: `${item.recommended}${item.unit}`
  }));

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Key Micronutrient Trends
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Average daily intake as percentage of recommended values
        </p>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis 
            dataKey="nutrient" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 150]}
            tick={{ fontSize: 10 }}
          />
          <Radar
            name="Your Intake"
            dataKey="percentage"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.5}
          />
          <Tooltip
            content={({ payload }) => {
              if (payload?.[0]) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-lg shadow-lg border">
                    <p className="text-sm font-medium">{data.nutrient}</p>
                    <p className="text-xs text-gray-600">
                      Your avg: {data.actual}
                    </p>
                    <p className="text-xs text-gray-600">
                      Recommended: {data.recommended}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((item, index) => (
          <div key={index} className="p-3 bg-gray-50 rounded-md">
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-medium text-gray-900">
                {item.nutrient}
              </span>
              <span className="text-xs text-gray-600">
                {item.value}{item.unit}
              </span>
            </div>
            <div className="text-xs text-gray-600">
              Recommended: {item.recommended}{item.unit}/day
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MicronutrientTrends;
