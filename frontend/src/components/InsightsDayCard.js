import React from 'react';
import { getMetricName, getStatusLabel, formatMetricValue } from '../utils/nutrition';

const InsightsDayCard = ({ day }) => {
  if (!day) return null;

  const metrics = Object.entries(day.progress || {});
  if (metrics.length === 0) {
    return null;
  }

  const renderRing = (metric) => {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.max(0, Math.min(metric.percentage, 200));
    const dashOffset = circumference - (percentage / 100) * circumference;

    return (
      <svg className="insights-ring" viewBox="0 0 80 80">
        <circle
          className="insights-ring-track"
          cx="40"
          cy="40"
          r={radius}
        />
        <circle
          className="insights-ring-progress"
          cx="40"
          cy="40"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle">
          {Math.round(percentage)}%
        </text>
      </svg>
    );
  };

  return (
    <div className="insights-day-card">
      <div className="insights-day-header">
        <h3>Today</h3>
        <span>{day.mealCount} meals logged</span>
      </div>
      <div className="insights-rings-grid">
        {metrics.map(([key, metric]) => (
          <div key={key} className="insights-ring-card">
            {renderRing(metric)}
            <div className="insights-ring-info">
              <div className="insights-ring-title">{getMetricName(key)}</div>
              <div className={`insights-status insights-status-${metric.status}`}>
                {getStatusLabel(metric.status)}
              </div>
              <div className="insights-ring-details">
                {formatMetricValue(metric.current)} / {formatMetricValue(metric.target)} {metric.unit}
              </div>
            </div>
          </div>
        ))}
      </div>
      {day.callToAction && (
        <div className="insights-cta">
          <strong>Keep in mind:</strong>
          <span>{day.callToAction.message}</span>
        </div>
      )}
    </div>
  );
};

export default InsightsDayCard;
