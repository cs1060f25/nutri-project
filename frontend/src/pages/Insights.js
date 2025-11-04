import React, { useEffect, useMemo, useState } from 'react';
import './Insights.css';
import { useAuth } from '../context/AuthContext';
import { getRangeProgress } from '../services/insightsService';
import InsightsDayCard from '../components/InsightsDayCard';
import InsightsTrendChart from '../components/InsightsTrendChart';
import InsightsTrendSummary from '../components/InsightsTrendSummary';
import { getMetricName } from '../utils/nutrition';

const formatDateInput = (date) => date.toISOString().split('T')[0];

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
};

const Insights = () => {
  const { accessToken } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('');

  const activeRange = useMemo(() => ({
    start: range.start,
    end: range.end,
  }), [range.start, range.end]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getRangeProgress(activeRange, accessToken);
        setData(result);
      } catch (err) {
        setError(err.message || 'Failed to load insights');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, activeRange]);

  const metricOptions = useMemo(() => {
    if (!data?.trend?.metrics) return [];
    return Object.keys(data.trend.metrics);
  }, [data]);

  useEffect(() => {
    if (!metricOptions.length) {
      setSelectedMetric('');
      return;
    }

    if (!selectedMetric || !metricOptions.includes(selectedMetric)) {
      setSelectedMetric(metricOptions[0]);
    }
  }, [metricOptions, selectedMetric]);

  const handleRangeChange = (event) => {
    const { name, value } = event.target;
    setRange(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyRange = async (event) => {
    event.preventDefault();
    if (!accessToken) return;

    setLoading(true);
    setError('');
    try {
      const result = await getRangeProgress(activeRange, accessToken);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  const hasData = data?.days?.length > 0;

  return (
    <div className="insights-page">
      <header className="insights-header">
        <div>
          <h1>Insights</h1>
          <p>Compare your nutrition progress across a custom date range.</p>
        </div>

        <form className="insights-range-form" onSubmit={handleApplyRange}>
          <label>
            Start
            <input
              type="date"
              name="start"
              value={range.start}
              max={range.end}
              onChange={handleRangeChange}
              required
            />
          </label>
          <label>
            End
            <input
              type="date"
              name="end"
              value={range.end}
              min={range.start}
              onChange={handleRangeChange}
              required
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </form>
      </header>

      {error && <div className="insights-error">{error}</div>}

      {loading && !data && (
        <div className="insights-loading">Loading progress...</div>
      )}

      {data?.hasActivePlan === false && (
        <div className="insights-empty">
          <p>No active nutrition plan found. Create a plan to track your progress.</p>
        </div>
      )}

      {metricOptions.length > 0 && (
        <section className="insights-trend-section">
          <div className="insights-trend-controls">
            <div>
              <h2>Progress & Trends</h2>
              <p>Track how your goals are trending across this range.</p>
            </div>
            <label className="insights-metric-select">
              Metric
              <select
                value={selectedMetric}
                onChange={(event) => setSelectedMetric(event.target.value)}
              >
                {metricOptions.map(option => (
                  <option key={option} value={option}>
                    {getMetricName(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <InsightsTrendChart
            series={data?.trend?.series || []}
            metricKey={selectedMetric}
            trendMetrics={data?.trend?.metrics}
          />
          <InsightsTrendSummary
            metricKey={selectedMetric}
            trend={data?.trend}
          />
        </section>
      )}

      {hasData ? (
        <section className="insights-days">
          {data.days.map(day => (
            <InsightsDayCard key={day.date} day={day} />
          ))}
        </section>
      ) : (
        !loading &&
        data?.hasActivePlan &&
        <div className="insights-empty">
          <p>No meals logged for this date range yet. Log meals to see your progress.</p>
        </div>
      )}
    </div>
  );
};

export default Insights;
