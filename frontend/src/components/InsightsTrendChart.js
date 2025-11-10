import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
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

const InsightsTrendChart = ({
  series = [],
  metricKey,
  trendMetrics,
  viewMode = 'line',
}) => {
  if (!metricKey || !trendMetrics?.[metricKey] || series.length === 0) {
    return (
      <div className="insights-chart-empty">
        <p>No trend data available for this range yet.</p>
      </div>
    );
  }

  const baseData = series.map(point => {
    const actual = point.values[metricKey] || 0;
    const target = point.targets[metricKey] || 0;
    return {
      date: point.date,
      value: actual,
      target,
    };
  });

  if (viewMode === 'stacked') {
    const stackedData = baseData.map(point => {
      const cappedActual = Math.min(point.value, point.target);
      const remaining = Math.max(point.target - point.value, 0);
      return {
        date: point.date,
        actual: cappedActual,
        targetRemaining: remaining,
        actualTotal: point.value,
        targetTotal: point.target,
      };
    });

    return (
      <div className="insights-chart">
        <div className="insights-chart-header">
          <h3>{getMetricName(metricKey)} vs target (stacked)</h3>
          <span>Daily totals stacked against your goal</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={stackedData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
              formatter={(value, name, props) => {
                if (name === 'actual') {
                  return [`${formatMetricValue(props.payload.actualTotal)} (actual)`, 'Actual'];
                }
                if (name === 'targetRemaining') {
                  return [`${formatMetricValue(props.payload.targetTotal)} (target)`, 'Target'];
                }
                return [formatMetricValue(value), name];
              }}
              labelFormatter={(value) => formatDateLabel(value)}
            />
            <Area
              type="monotone"
              dataKey="targetRemaining"
              stackId="stack"
              stroke="#94a3b8"
              fill="#cbd5f5"
              fillOpacity={0.8}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stackId="stack"
              stroke="#0ea5e9"
              fill="#7dd3fc"
              fillOpacity={0.9}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="insights-chart">
      <div className="insights-chart-header">
        <h3>{getMetricName(metricKey)} trend</h3>
        <span>Daily totals vs. target</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={baseData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
