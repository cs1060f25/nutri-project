import React, { useEffect, useMemo, useState } from 'react';
import './Insights.css';
import { useAuth } from '../context/AuthContext';
import { getRangeProgress } from '../services/insightsService';

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

const metricName = (key) => {
  const map = {
    calories: 'Calories',
    protein: 'Protein',
    totalFat: 'Total Fat',
    saturatedFat: 'Saturated Fat',
    totalCarbs: 'Total Carbs',
    fiber: 'Fiber',
    sugars: 'Sugars',
    sodium: 'Sodium',
  };
  return map[key] || key;
};

const statusLabel = (status) => {
  switch (status) {
    case 'met':
      return 'Goal met';
    case 'close':
      return 'Almost there';
    default:
      return 'Needs attention';
  }
};

const DayProgressCard = ({ day }) => {
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
              <span className="insights-metric-name">{metricName(key)}</span>
              <span className={`insights-status insights-status-${metric.status}`}>
                {statusLabel(metric.status)}
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
                {Math.round(metric.current)} / {Math.round(metric.target)} {metric.unit}
              </span>
              <span>{metric.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Insights = () => {
  const { accessToken } = useAuth();
  const [range, setRange] = useState(defaultRange);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      {hasData ? (
        <section className="insights-days">
          {data.days.map(day => (
            <DayProgressCard key={day.date} day={day} />
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

