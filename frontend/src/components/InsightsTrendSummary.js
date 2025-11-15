import React from 'react';
import {
  getMetricName,
  formatMetricValue,
  formatPercentage,
  getDirectionIcon,
} from '../utils/nutrition';

const InsightsTrendSummary = ({ metricKey, trend }) => {
  if (!trend || !metricKey) {
    return null;
  }

  const metricTrend = trend.metrics?.[metricKey];
  if (!metricTrend) {
    return null;
  }

  const narrative = trend.narratives?.find(item => item.metric === metricKey);
  const direction = metricTrend.direction || 'flat';

  return (
    <div className="insights-trend-summary">
      <div className="insights-trend-stat">
        <span className="insights-trend-label">Average per day</span>
        <strong>{formatMetricValue(metricTrend.averagePerDay)}</strong>
      </div>
      <div className="insights-trend-stat">
        <span className="insights-trend-label">Average per meal</span>
        <strong>{formatMetricValue(metricTrend.averagePerMeal)}</strong>
      </div>
      <div className={`insights-trend-change insights-trend-change-${direction}`}>
        <span className="insights-trend-label">
          Change per meal
        </span>
        <div className="insights-trend-change-value">
          <span className="insights-trend-icon">{getDirectionIcon(direction)}</span>
          <strong>{formatPercentage(metricTrend.changePerMealPercent)}</strong>
        </div>
      </div>
      {narrative && (
        <div className="insights-trend-narrative">
          <strong>{getMetricName(metricKey)} insight:</strong>
          <span>{narrative.message}.</span>
        </div>
      )}
    </div>
  );
};

export default InsightsTrendSummary;

