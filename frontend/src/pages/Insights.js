import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './Insights.css';
import { useAuth } from '../context/AuthContext';
import { getRangeProgress, getAiSummary } from '../services/insightsService';
import InsightsDayCard from '../components/InsightsDayCard';
import InsightsTrendChart from '../components/InsightsTrendChart';
import InsightsTrendSummary from '../components/InsightsTrendSummary';
import InsightsMacroPie from '../components/InsightsMacroPie';
import { getMetricName } from '../utils/nutrition';
import CustomSelect from '../components/CustomSelect';

// Get date in Eastern Time format (YYYY-MM-DD)
const getEasternDate = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
};

const defaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  return {
    start: getEasternDate(start),
    end: getEasternDate(end),
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
  const [aiSummary, setAiSummary] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [autoRequested, setAutoRequested] = useState(false);

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
        setSelectedMacroDay((prev) => {
          if (result?.days?.some(day => day.date === prev)) return prev;
          return result?.days?.[result.days.length - 1]?.date || '';
        });
      } catch (err) {
        setError(err.message || 'Failed to load insights');
      } finally {
        setLoading(false);
      }
  }, [accessToken, activeRange]);

  const handleRefreshSummary = useCallback(async () => {
    if (!data?.range || !accessToken) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await getAiSummary(
        { start: data.range.start, end: data.range.end },
        accessToken
      );
      setAiSummary(res.summary);
    } catch (err) {
      setAiError(err.message || 'Failed to load AI summary');
      setAiSummary('');
    } finally {
      setAiLoading(false);
    }
  }, [accessToken, data?.range]);

  // Auto-generate summary on first load when user has data/plan
  useEffect(() => {
    if (
      !autoRequested &&
      !aiLoading &&
      !aiSummary &&
      data?.hasActivePlan &&
      data?.days?.length > 0
    ) {
      setAutoRequested(true);
      handleRefreshSummary();
    }
  }, [autoRequested, aiLoading, aiSummary, data?.hasActivePlan, data?.days?.length, handleRefreshSummary]);

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

  // Refresh data when page becomes visible (user returns to tab/window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && accessToken) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData, accessToken]);

  const metricOptions = useMemo(() => {
    if (!data?.trend?.metrics) return [];
    return Object.keys(data.trend.metrics);
  }, [data]);

  const dayOptions = useMemo(() => {
    if (!data?.days?.length) return [];
    return data.days.map((day) => ({
      value: day.date,
      label: new Date(day.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data?.days]);

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

  // Track range changes
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
    setAiSummary('');
    setAiError('');
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
          {(data?.planName || data?.streak !== undefined) && (
            <div className="insights-plan-meta">
              {data?.planName && (
                <div className="insights-plan-pill">
                  Active plan: <strong>{data.planName}</strong>
                </div>
              )}
              {data?.streak !== undefined && (
                <div className="insights-streak-pill">
                  {data.streak > 0
                    ? `Streak: ${data.streak} day${data.streak === 1 ? '' : 's'} 🔥`
                    : 'No streak yet'}
                </div>
              )}
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
      {aiError && <div className="insights-error">{aiError}</div>}

      {loading && !data && (
        <div className="insights-loading">Loading progress...</div>
      )}

      {hasData && (
        <div className="insights-ai-card">
          <div className="insights-ai-card-header">
            <div>
              <h3>Daily Insight</h3>
              <p>Personalized by Llama</p>
            </div>
            <button type="button" onClick={handleRefreshSummary} disabled={aiLoading}>
              {aiLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="insights-ai-card-body">
            {aiLoading && <span>Generating summary...</span>}
            {!aiLoading && aiSummary && (
              <div className="insights-ai-summary">
                {(() => {
                  const parts = aiSummary
                    .split(/(?<=\.)\s+/)
                    .map((p) => p.trim())
                    .filter(Boolean);
                  const [lead = '', ...rest] = parts;
                  const [second = '', ...remaining] = rest;
                  const summary = lead || aiSummary;
                  const interpretation = second || '';
                  const actions = remaining.filter(Boolean).slice(0, 4);

                  return (
                    <>
                      <div className="insights-ai-block">
                        <h4>Highlights</h4>
                        <p>{summary}</p>
                      </div>
                      {interpretation && (
                        <div className="insights-ai-block">
                          <h4>What it means</h4>
                          <p>{interpretation}</p>
                        </div>
                      )}
                      {actions.length > 0 && (
                        <div className="insights-ai-block">
                          <h4>Next steps</h4>
                          <ul className="insights-ai-summary-list">
                            {actions.map((line, idx) => (
                              <li key={idx}>{line}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            {!aiLoading && !aiSummary && <span>No summary available yet.</span>}
          </div>
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
            <>
              <InsightsMacroPie
                day={data?.days?.find(day => day.date === selectedMacroDay)}
              />
              <div className="insights-trend-summary">
                <div className="insights-trend-stat">
                  <span className="insights-trend-label">Macro balance</span>
                  <strong>{selectedMacroDay ? `For ${selectedMacroDay}` : 'Select a day'}</strong>
                </div>
                <div className="insights-trend-stat">
                  <span className="insights-trend-label">Tip</span>
                  <strong>Protein, carbs, and fat shown for this day.</strong>
                </div>
              </div>
            </>
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

    </div>
  );
};

export default Insights;
