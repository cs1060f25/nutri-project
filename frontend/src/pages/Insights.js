import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './Insights.css';
import { useAuth } from '../context/AuthContext';
import { getRangeProgress } from '../services/insightsService';
import InsightsDayCard from '../components/InsightsDayCard';
import InsightsTrendChart from '../components/InsightsTrendChart';
import InsightsTrendSummary from '../components/InsightsTrendSummary';
import InsightsMacroPie from '../components/InsightsMacroPie';
import InsightsMealTable from '../components/InsightsMealTable';
import { getMetricName } from '../utils/nutrition';
import CustomSelect from '../components/CustomSelect';

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
  const [trendView, setTrendView] = useState('line');
  const [selectedMacroDay, setSelectedMacroDay] = useState('');

  const activeRange = useMemo(() => ({
    start: range.start,
    end: range.end,
  }), [range.start, range.end]);

  const fetchData = useCallback(async () => {
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
  }, [accessToken, activeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for meal log updates (from post creation, etc.)
  useEffect(() => {
    const handleMealLogUpdate = () => {
      fetchData();
    };

    window.addEventListener('mealLogUpdated', handleMealLogUpdate);
    return () => {
      window.removeEventListener('mealLogUpdated', handleMealLogUpdate);
    };
  }, [fetchData]);

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

  useEffect(() => {
    if (data?.days?.length) {
      const lastDay = data.days[data.days.length - 1];
      setSelectedMacroDay((prev) =>
        prev && data.days.some(day => day.date === prev) ? prev : lastDay.date
      );
    } else {
      setSelectedMacroDay('');
    }
  }, [data?.days]);

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
          {data?.planName && (
            <div className="insights-plan-pill">
              Active plan: <strong>{data.planName}</strong>
            </div>
          )}
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

      {!loading && data?.streak !== undefined && (
        <div className="insights-streak-card">
          {data.streak > 0
            ? <>You logged meals {data.streak} day{data.streak === 1 ? '' : 's'} in a row 🔥</>
            : <>No streak yet. Log today’s meals to start one!</>}
        </div>
      )}

      {data?.hasActivePlan === false && (
        <div className="insights-empty">
          <p>No active nutrition plan found. Create a plan to track your progress.</p>
        </div>
      )}

      {(metricOptions.length > 0 || data?.days?.length > 0) && (
        <section className="insights-trend-section">
          <div className="insights-trend-controls">
            <div>
              <h2>Progress & Trends</h2>
              <p>Track how your goals are trending across this range.</p>
            </div>
            <div className="insights-trend-actions">
              {trendView !== 'pie' && metricOptions.length > 0 && (
                <label className="insights-metric-select">
                  Metric
                  <CustomSelect
                    value={selectedMetric}
                    onChange={setSelectedMetric}
                    options={metricOptions.map(option => ({
                      value: option,
                      label: getMetricName(option)
                    }))}
                    placeholder="Select metric"
                    className="insights-metric-select-wrapper"
                  />
                </label>
              )}
              {trendView === 'pie' && data?.days?.length > 0 && (
                <label className="insights-metric-select">
                  Day
                  <CustomSelect
                    value={selectedMacroDay}
                    onChange={setSelectedMacroDay}
                    options={data.days.map(day => ({
                      value: day.date,
                      label: `${day.date} (${day.mealCount} meals)`
                    }))}
                    placeholder="Select day"
                    className="insights-metric-select-wrapper"
                  />
                </label>
              )}
              <div className="insights-view-toggle">
                <button
                  type="button"
                  className={trendView === 'line' ? 'active' : ''}
                  onClick={() => setTrendView('line')}
                >
                  Line
                </button>
                <button
                  type="button"
                  className={trendView === 'stacked' ? 'active' : ''}
                  onClick={() => setTrendView('stacked')}
                >
                  Stacked
                </button>
                <button
                  type="button"
                  className={trendView === 'pie' ? 'active' : ''}
                  onClick={() => setTrendView('pie')}
                >
                  Pie Chart
                </button>
              </div>
            </div>
          </div>
          {trendView === 'pie' ? (
            <InsightsMacroPie
              day={data?.days?.find(day => day.date === selectedMacroDay)}
            />
          ) : (
            <>
              <InsightsTrendChart
                series={data?.trend?.series || []}
                metricKey={selectedMetric}
                trendMetrics={data?.trend?.metrics}
                viewMode={trendView}
              />
              <InsightsTrendSummary
                metricKey={selectedMetric}
                trend={data?.trend}
              />
            </>
          )}
        </section>
      )}

      {hasData ? (
        <section className="insights-days">
          <InsightsDayCard
            day={(() => {
              const today = data?.range?.end;
              return data.days.find(day => day.date === today)
                || data.days[data.days.length - 1];
            })()}
          />
        </section>
      ) : (
        !loading &&
        data?.hasActivePlan &&
        <div className="insights-empty">
          <p>No meals logged for this date range yet. Log meals to see your progress.</p>
        </div>
      )}

      {data?.meals && data.meals.length > 0 && (
        <section className="insights-table-section">
          <div className="insights-table-header">
            <h2>Meal History</h2>
            <p>Review every meal you logged in this range with full nutrition details.</p>
          </div>
          <InsightsMealTable meals={data.meals} />
        </section>
      )}
    </div>
  );
};

export default Insights;
