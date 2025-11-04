import React from 'react';
import { getMetricName, getStatusLabel, formatMetricValue } from '../utils/nutrition';

const InsightsDayCard = ({ day }) => {
  if (!day) return null;

  return (
    <div className="insights-day-card">
      <div className="insights-day-header">
        <h3>{new Date(day.date).toLocaleDateString()}</h3>
        <span>{day.mealCount} meals logged</span>
      </div>
      <div className="insights-metrics-grid">
        {Object.entries(day.progress).map(([key, metric]) => (
          <div key={key} className="insights-metric">
            <div className="insights-metric-header">
              <span className="insights-metric-name">{getMetricName(key)}</span>
              <span className={`insights-status insights-status-${metric.status}`}>
                {getStatusLabel(metric.status)}
              </span>
            </div>
            <div className="insights-metric-bar">
              <div
                className="insights-metric-fill"
                style={{ width: `${Math.min(metric.percentage, 100)}%` }}
              />
            </div>
            <div className="insights-metric-info">
              <span>
                {formatMetricValue(metric.current)} / {formatMetricValue(metric.target)} {metric.unit}
              </span>
              <span>{metric.percentage}%</span>
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
