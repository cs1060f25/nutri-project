import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { getMetricName, formatMetricValue } from '../utils/nutrition';

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const InsightsTrendChart = ({ series = [], metricKey, trendMetrics }) => {
  if (!metricKey || !trendMetrics?.[metricKey] || series.length === 0) {
    return (
      <div className="insights-chart-empty">
        <p>No trend data available for this range yet.</p>
      </div>
    );
  }

  const data = series.map(point => ({
    date: point.date,
    value: point.values[metricKey] || 0,
    target: point.targets[metricKey] || 0,
  }));

  return (
    <div className="insights-chart">
      <div className="insights-chart-header">
        <h3>{getMetricName(metricKey)} trend</h3>
        <span>Daily totals vs. target</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            stroke="#94a3b8"
          />
          <YAxis
            stroke="#94a3b8"
            tickFormatter={(value) => formatMetricValue(value)}
          />
          <Tooltip
            formatter={(value, name) => [
              formatMetricValue(value),
              name === 'value' ? 'Actual' : 'Target',
            ]}
            labelFormatter={(value) => formatDateLabel(value)}
          />
          <ReferenceLine
            y={trendMetrics[metricKey].target}
            stroke="#94a3b8"
            strokeDasharray="5 5"
            ifOverflow="extendDomain"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InsightsTrendChart;

