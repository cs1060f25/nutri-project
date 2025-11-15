import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

const MACRO_CONFIG = [
  { key: 'protein', label: 'Protein', color: '#22c55e' },
  { key: 'totalCarbs', label: 'Carbs', color: '#0ea5e9' },
  { key: 'totalFat', label: 'Fat', color: '#f97316' },
];

const formatValue = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }
  return Math.round(value);
};

const InsightsMacroPie = ({ day }) => {
  if (!day) {
    return (
      <div className="insights-chart-empty">
        <p>Select a day to view macro distribution.</p>
      </div>
    );
  }

  const data = MACRO_CONFIG.map((macro) => ({
    name: macro.label,
    value: formatValue(day.totalsNumeric?.[macro.key]),
    fill: macro.color,
  })).filter((entry) => entry.value > 0);

  if (!data.length) {
    return (
      <div className="insights-chart-empty">
        <p>No macro data logged for this day.</p>
      </div>
    );
  }

  return (
    <div className="insights-chart">
      <div className="insights-chart-header">
        <h3>Macro balance for {day.date}</h3>
        <span>Distribution of protein, carbs, and fat</span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} g`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InsightsMacroPie;
