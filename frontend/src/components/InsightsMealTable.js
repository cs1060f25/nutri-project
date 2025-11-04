import React from 'react';
import { formatMetricValue } from '../utils/nutrition';

const nutrientOrder = [
  { key: 'calories', label: 'Calories' },
  { key: 'totalFat', label: 'Total Fat', suffix: 'g' },
  { key: 'saturatedFat', label: 'Sat. Fat', suffix: 'g' },
  { key: 'transFat', label: 'Trans Fat', suffix: 'g' },
  { key: 'cholesterol', label: 'Cholesterol', suffix: 'mg' },
  { key: 'sodium', label: 'Sodium', suffix: 'mg' },
  { key: 'totalCarb', label: 'Total Carbs', suffix: 'g' },
  { key: 'dietaryFiber', label: 'Fiber', suffix: 'g' },
  { key: 'sugars', label: 'Sugars', suffix: 'g' },
  { key: 'protein', label: 'Protein', suffix: 'g' },
];

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getTotals = (meal) => {
  const totals = meal.totals || {};
  const normalized = {};
  Object.entries(totals).forEach(([key, value]) => {
    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace(/[^0-9.-]/g, ''));
      normalized[key] = Number.isNaN(numeric) ? value : numeric;
    } else {
      normalized[key] = value;
    }
  });
  return normalized;
};

const InsightsMealTable = ({ meals = [] }) => {
  if (!meals.length) {
    return (
      <div className="insights-empty">
        <p>No meals logged in this range.</p>
      </div>
    );
  }

  return (
    <div className="insights-table-wrapper">
      <div className="insights-table-container">
        <table className="insights-table">
          <thead>
            <tr>
              <th>Logged On</th>
              <th>MEAL TYPE</th>
              <th>Location</th>
              <th>Items</th>
              {nutrientOrder.map(nutrient => (
                <th key={nutrient.key}>{nutrient.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {meals.map(meal => {
              const totals = getTotals(meal);
              const itemNames = (meal.items || []).map(item => item.recipeName || item.name);
              return (
                <tr key={meal.id}>
                  <td>{formatDateTime(meal.timestamp || meal.createdAt || meal.mealDate)}</td>
                  <td>{(meal.mealType || '—').toUpperCase()}</td>
                  <td>{meal.locationName || '—'}</td>
                  <td title={itemNames.join('\n')}>
                    {(meal.items && meal.items.length) || 0} item{meal.items?.length === 1 ? '' : 's'}
                  </td>
                  {nutrientOrder.map(nutrient => (
                    <td key={nutrient.key} className="insights-table-number">
                      {totals[nutrient.key] !== undefined
                        ? `${formatMetricValue(totals[nutrient.key])}${nutrient.suffix || ''}`
                        : '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InsightsMealTable;
