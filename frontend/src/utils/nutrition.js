const metricDisplayNames = {
  calories: 'Calories',
  protein: 'Protein',
  totalFat: 'Total Fat',
  saturatedFat: 'Saturated Fat',
  totalCarbs: 'Total Carbs',
  fiber: 'Fiber',
  sugars: 'Sugars',
  sodium: 'Sodium',
};

export const getMetricName = (key) => metricDisplayNames[key] || key;

export const getStatusLabel = (status) => {
  switch (status) {
    case 'met':
      return 'Goal met';
    case 'close':
      return 'Almost there';
    default:
      return 'Needs attention';
  }
};

export const formatMetricValue = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0';
  }
  return Math.round(value).toLocaleString();
};

export const formatPercentage = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0%';
  }
  const rounded = Math.round(value);
  return `${rounded > 0 ? rounded : Math.abs(rounded)}%`;
};

export const getDirectionIcon = (direction) => {
  if (direction === 'up') return '↑';
  if (direction === 'down') return '↓';
  return '→';
};

