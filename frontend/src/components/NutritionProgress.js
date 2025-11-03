import React from 'react';
import './NutritionProgress.css';

const NutritionProgress = ({ progressData }) => {
  if (!progressData || !progressData.hasActivePlan) {
    return (
      <div className="nutrition-progress-card">
        <h2 className="progress-title">Today's Nutrition</h2>
        <p className="no-plan-message">
          No active nutrition plan. Create one in the Nutrition Plan page to track your daily goals!
        </p>
      </div>
    );
  }

  const { planName, mealCount, progress } = progressData;

  // Helper to format numbers
  const formatNumber = (num) => {
    return Math.round(num);
  };

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'met':
        return '#4caf50'; // green
      case 'close':
        return '#ff9800'; // orange
      default:
        return '#2196f3'; // blue
    }
  };

  return (
    <div className="nutrition-progress-card">
      <div className="progress-header">
        <h2 className="progress-title">Today's Nutrition</h2>
        <span className="plan-badge">{planName}</span>
      </div>
      
      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-label">Meals Logged</span>
          <span className="stat-value">{mealCount}</span>
        </div>
      </div>

      <div className="progress-metrics">
        {Object.keys(progress).length === 0 ? (
          <p className="no-meals-message">
            No meals logged today. Use the + button to log your meals!
          </p>
        ) : (
          Object.entries(progress).map(([key, metric]) => (
            <div key={key} className="metric-row">
              <div className="metric-header">
                <span className="metric-name">{formatMetricName(key)}</span>
                <span className="metric-values">
                  <strong>{formatNumber(metric.current)}</strong>
                  <span className="metric-separator">/</span>
                  <span>{formatNumber(metric.target)} {metric.unit}</span>
                </span>
              </div>
              
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${Math.min(metric.percentage, 100)}%`,
                    backgroundColor: getStatusColor(metric.status),
                  }}
                />
              </div>
              
              <div className="metric-footer">
                <span className="percentage-text">{metric.percentage}%</span>
                {metric.remaining > 0 && (
                  <span className="remaining-text">
                    {formatNumber(metric.remaining)} {metric.unit} remaining
                  </span>
                )}
                {metric.status === 'met' && (
                  <span className="status-badge status-met">✓ Goal met!</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Helper function to format metric names
const formatMetricName = (key) => {
  const names = {
    calories: 'Calories',
    protein: 'Protein',
    totalFat: 'Total Fat',
    saturatedFat: 'Saturated Fat',
    totalCarbs: 'Total Carbs',
    fiber: 'Fiber',
    sugars: 'Sugars',
    sodium: 'Sodium',
  };
  return names[key] || key;
};

export default NutritionProgress;

