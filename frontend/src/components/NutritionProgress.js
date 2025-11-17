import React from 'react';
import { RefreshCw } from 'lucide-react';
import './NutritionProgress.css';

const NutritionProgress = ({ progressData, onRefresh, refreshing }) => {
  if (!progressData || !progressData.hasActivePlan) {
    return (
      <div className="nutrition-progress-card">
        <div className="card-header">
          <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <h2 className="progress-title">Today's Progress</h2>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="progress-refresh-button"
              disabled={refreshing}
              title="Refresh progress"
            >
              <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            </button>
          )}
        </div>
        <div className="no-plan-content">
          <svg className="no-plan-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <p className="no-plan-message">
            No active nutrition plan. Create one in the Nutrition Plan page to start tracking your daily goals!
          </p>
        </div>
      </div>
    );
  }

  const { mealCount, progress } = progressData;

  // Helper to format numbers
  const formatNumber = (num) => {
    return Math.round(num);
  };

  // Helper to get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'met':
        return '#52b788'; // green
      case 'close':
        return '#95d5b2'; // light green
      default:
        return '#b7e4c7'; // very light green
    }
  };

  // Helper to create SVG circle path
  const getCircleProps = (percentage) => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;
    return { circumference, offset };
  };

  const isHypothetical = progressData?.isHypothetical || false;

  return (
    <div className="nutrition-progress-card">
      <div className="card-header">
        <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <h2 className="progress-title">
          Today's Progress
          {isHypothetical && (
            <span className="hypothetical-badge" title="Shows hypothetical progress if suggested meal is added">
              <svg className="hypothetical-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              Hypothetical
            </span>
          )}
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="progress-refresh-button"
            disabled={refreshing}
            title="Refresh progress"
          >
            <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          </button>
        )}
        <div className="meals-stat">
          <svg className="meal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"/>
          </svg>
          <div className="meal-info">
            <span className="meal-count">{mealCount}</span>
            <span className="meal-label">Meals</span>
          </div>
        </div>
      </div>

      {Object.keys(progress).length === 0 ? (
        <div className="no-meals-content">
          <svg className="no-meals-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <p className="no-meals-message">
            No meals logged today. Use the + button to log your meals!
          </p>
        </div>
      ) : (
        <div className="progress-circles-grid">
          {Object.entries(progress).map(([key, metric]) => {
            const { circumference, offset } = getCircleProps(metric.percentage);
            const color = getStatusColor(metric.status);
            
            return (
              <div key={key} className="circle-metric">
                <div className="circle-container">
                  <svg className="progress-circle" viewBox="0 0 80 80">
                    {/* Background circle */}
                    <circle
                      className="circle-bg"
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke="#e8f5e9"
                      strokeWidth="6"
                    />
                    {/* Progress circle */}
                    <circle
                      className="circle-progress"
                      cx="40"
                      cy="40"
                      r="36"
                      fill="none"
                      stroke={color}
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      strokeLinecap="round"
                      transform="rotate(-90 40 40)"
                    />
                  </svg>
                  <div className="circle-center">
                    <span className="circle-percentage">{metric.percentage}%</span>
                  </div>
                </div>
                <div className="metric-details">
                  <span className="metric-name">{formatMetricName(key)}</span>
                  <span className="metric-values">
                    <strong>{formatNumber(metric.current)}</strong>
                    <span className="separator">/</span>
                    <span className="target">{formatNumber(metric.target)}</span>
                    <span className="unit">{metric.unit}</span>
                  </span>
                  {metric.remaining > 0 ? (
                    <span className="remaining-badge">
                      {formatNumber(metric.remaining)} {metric.unit} left
                    </span>
                  ) : (
                    <span className="goal-met-badge">
                      ✓ Goal met!
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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

