import React, { useEffect, useState, useCallback } from 'react';
import { Star, Edit2 } from 'lucide-react';
import './MealLogs.css';
import { useAuth } from '../context/AuthContext';
import { getMealLogs, deleteMealLog } from '../services/mealLogService';
import CustomSelect from '../components/CustomSelect';
import ConfirmModal from '../components/ConfirmModal';
import EditMealLogModal from '../components/EditMealLogModal';

const MealLogs = () => {
  const { accessToken } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    mealType: '',
    startDate: '',
    endDate: '',
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mealToDelete, setMealToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [mealToEdit, setMealToEdit] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setError('');
    try {
      const filters = {};
      if (filter.mealType) filters.mealType = filter.mealType;
      if (filter.startDate) filters.startDate = filter.startDate;
      if (filter.endDate) filters.endDate = filter.endDate;

      const response = await getMealLogs(filters, accessToken);
      setLogs(response.meals || []);
    } catch (err) {
      setError(err.message || 'Failed to load meal logs');
    } finally {
      setLoading(false);
    }
  }, [accessToken, filter.mealType, filter.startDate, filter.endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleEditClick = (log) => {
    setMealToEdit(log);
    setShowEditModal(true);
  };

  const handleEditSuccess = (updatedLog) => {
    setLogs(logs.map(log => log.id === updatedLog.id ? updatedLog : log));
    setShowEditModal(false);
    setMealToEdit(null);
  };

  const handleDeleteClick = (mealId) => {
    setMealToDelete(mealId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!mealToDelete) return;

    try {
      await deleteMealLog(mealToDelete, accessToken);
      setLogs(logs.filter(log => log.id !== mealToDelete));
      setMealToDelete(null);
    } catch (err) {
      setError(err.message || 'Failed to delete meal log');
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const parseNutrient = (value) => {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const formatDecimal = (value, digits = 1) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return (0).toFixed(digits);
    }
    return Number(value).toFixed(digits);
  };

  const getTotalNutrition = (items, logTotals) => {
    const emptyTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      saturatedFat: 0,
      cholesterol: 0,
      sodium: 0,
      sugars: 0,
      dietaryFiber: 0,
    };

    // Always calculate from items if available (items are the source of truth)
    if (items && items.length > 0) {
      return items.reduce((totals, item) => {
        const qty = item.quantity || 1;
        return {
          calories: totals.calories + parseNutrient(item.calories) * qty,
          protein: totals.protein + parseNutrient(item.protein) * qty,
          carbs:
            totals.carbs +
            parseNutrient(item.totalCarbs || item.totalCarb || item.carbs) * qty,
          fat: totals.fat + parseNutrient(item.totalFat || item.fat) * qty,
          saturatedFat:
            totals.saturatedFat + parseNutrient(item.saturatedFat) * qty,
          cholesterol:
            totals.cholesterol + parseNutrient(item.cholesterol) * qty,
          sodium: totals.sodium + parseNutrient(item.sodium) * qty,
          sugars: totals.sugars + parseNutrient(item.sugars) * qty,
          dietaryFiber:
            totals.dietaryFiber +
            parseNutrient(item.dietaryFiber ?? item.fiber) * qty,
        };
      }, emptyTotals);
    }

    // Fallback to stored totals if items are not available
    if (logTotals) {
      return {
        calories: parseNutrient(logTotals.calories),
        protein: parseNutrient(logTotals.protein),
        carbs: parseNutrient(
          logTotals.totalCarbs || logTotals.totalCarb || logTotals.carbs
        ),
        fat: parseNutrient(logTotals.totalFat || logTotals.fat),
        saturatedFat: parseNutrient(logTotals.saturatedFat),
        cholesterol: parseNutrient(logTotals.cholesterol),
        sodium: parseNutrient(logTotals.sodium),
        sugars: parseNutrient(logTotals.sugars),
        dietaryFiber: parseNutrient(logTotals.dietaryFiber || logTotals.fiber),
      };
    }

    // Default to zeros if nothing is available
    return emptyTotals;
  };

  return (
    <div className="meal-logs-page">
      <div className="meal-logs-header">
        <div>
          <h1 className="meal-logs-title">Meal Logs</h1>
          <p className="meal-logs-subtitle">View your complete meal history</p>
        </div>
      </div>

      <div className="meal-logs-filters">
        <div className="filter-group">
          <label htmlFor="meal-type-filter">Meal Type</label>
          <CustomSelect
            value={filter.mealType}
            onChange={(value) => setFilter({ ...filter, mealType: value })}
            options={[
              { value: '', label: 'All' },
              { value: 'breakfast', label: 'Breakfast' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' }
            ]}
            placeholder="All"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="start-date-filter">Start Date</label>
          <input
            id="start-date-filter"
            type="date"
            value={filter.startDate}
            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="end-date-filter">End Date</label>
          <input
            id="end-date-filter"
            type="date"
            value={filter.endDate}
            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
            className="filter-input"
          />
        </div>

        {(filter.mealType || filter.startDate || filter.endDate) && (
          <button
            onClick={() => setFilter({ mealType: '', startDate: '', endDate: '' })}
            className="filter-clear-btn"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && (
        <div className="meal-logs-loading">
          <div className="spinner"></div>
          <p>Loading meal logs...</p>
        </div>
      )}

      {error && <div className="meal-logs-error">{error}</div>}

      {!loading && !error && logs.length === 0 && (
        <div className="meal-logs-empty">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <h3>No meal logs found</h3>
          <p>Start logging your meals to see them here</p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div className="meal-logs-list">
          {logs.map((log) => {
            const totals = getTotalNutrition(log.items || [], log.totals);
            const formatStatValue = (value, unit = '') => {
              if (value === undefined || value === null || Number.isNaN(value)) {
                return `0${unit}`;
              }
              return `${Math.round(value)}${unit}`;
            };

            const macroStats = [
              { label: 'Calories', value: formatStatValue(totals.calories) },
              { label: 'Protein', value: formatStatValue(totals.protein, 'g') },
              { label: 'Carbs', value: formatStatValue(totals.carbs, 'g') },
              { label: 'Fat', value: formatStatValue(totals.fat, 'g') },
            ];

            const detailStats = [
              { label: 'Saturated Fat', value: formatStatValue(totals.saturatedFat, 'g') },
              { label: 'Cholesterol', value: formatStatValue(totals.cholesterol, 'mg') },
              { label: 'Sodium', value: formatStatValue(totals.sodium, 'mg') },
              { label: 'Sugars', value: formatStatValue(totals.sugars, 'g') },
              { label: 'Fiber', value: formatStatValue(totals.dietaryFiber, 'g') },
            ];
            return (
              <div key={log.id} className="meal-log-card">
                <div className="meal-log-header">
                  <div className="meal-log-info">
                    <h3 className="meal-log-name">
                      {log.mealName || log.mealType || 'Meal'}
                    </h3>
                    <div className="meal-log-meta">
                      <span className="meal-log-type-badge">
                        {log.mealType || 'other'}
                      </span>
                      <span className="meal-log-date">{formatDate(log.timestamp)}</span>
                      {log.locationName && (
                        <span className="meal-log-location">📍 {log.locationName}</span>
                      )}
                    </div>
                    {log.rating && (
                      <div className="meal-log-rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={18}
                            fill={star <= log.rating ? '#fbbf24' : 'none'}
                            stroke={star <= log.rating ? '#fbbf24' : '#d1d5db'}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="meal-log-actions">
                    <button
                      onClick={() => handleEditClick(log)}
                      className="meal-log-edit-btn"
                      title="Edit meal log"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(log.id)}
                      className="meal-log-delete-btn"
                      title="Delete meal log"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>

                {log.imageUrl && (
                  <div className="meal-log-image-container">
                    <img 
                      src={log.imageUrl} 
                      alt={log.mealName || 'Meal'} 
                      className="meal-log-image"
                    />
                  </div>
                )}

                {log.review && (
                  <div className="meal-log-review">
                    <p className="meal-log-review-text">"{log.review}"</p>
                  </div>
                )}

                <div className="meal-log-nutrition">
                  {macroStats.map((stat) => (
                    <div key={stat.label} className="nutrition-stat">
                      <span className="nutrition-label">{stat.label}</span>
                      <span className="nutrition-value">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="meal-log-nutrition micro">
                  {detailStats.map((stat) => (
                    <div key={stat.label} className="nutrition-stat">
                      <span className="nutrition-label">{stat.label}</span>
                      <span className="nutrition-value">{stat.value}</span>
                    </div>
                  ))}
                </div>

                {log.items && log.items.length > 0 && (
                  <div className="meal-log-items">
                    <h4 className="meal-items-heading">Items ({log.items.length})</h4>
                    <div className="meal-items-list">
                      {log.items.map((item, index) => (
                        <div key={index} className="meal-item">
                          <div className="meal-item-info">
                            <span className="meal-item-name">{item.recipeName}</span>
                            {item.portionDescription && (
                              <span className="meal-item-portion">{item.portionDescription}</span>
                            )}
                            {!item.portionDescription && item.servings && (
                              <span className="meal-item-portion">{item.servings} serving(s)</span>
                            )}
                          </div>
                          <div className="meal-item-nutrition">
                            <div className="meal-item-macros">
                              <span className="meal-item-calories">{Math.round(parseNutrient(item.calories))} cal</span>
                              <span>Protein: {Math.round(parseNutrient(item.protein))}g</span>
                              <span>Carbs: {Math.round(parseNutrient(item.totalCarbs || item.totalCarb || item.carbs))}g</span>
                              <span>Fat: {Math.round(parseNutrient(item.totalFat || item.fat))}g</span>
                            </div>
                            <div className="meal-item-micros">
                              <span>Sat Fat: {formatDecimal(parseNutrient(item.saturatedFat), 1)}g</span>
                              <span>Trans Fat: {formatDecimal(parseNutrient(item.transFat), 1)}g</span>
                              <span>Cholesterol: {Math.round(parseNutrient(item.cholesterol))}mg</span>
                              <span>Fiber: {formatDecimal(parseNutrient(item.dietaryFiber || item.fiber), 1)}g</span>
                              <span>Sodium: {Math.round(parseNutrient(item.sodium))}mg</span>
                              <span>Sugars: {formatDecimal(parseNutrient(item.sugars), 1)}g</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setMealToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Meal Log"
        message="This action is permanent. This meal will be removed from your history and will not be included in any nutrition data or insights."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
      />

      <EditMealLogModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setMealToEdit(null);
        }}
        onSuccess={handleEditSuccess}
        mealLog={mealToEdit}
      />
    </div>
  );
};

export default MealLogs;

