/**
 * Unit tests for meal planning utility functions
 */

const {
  validateMealType,
  sortMealPlans,
  filterMealPlansByDateRange,
  validateMealPlanData,
  groupMealPlansByDate
} = require('../services/mealPlanService');

describe('validateMealType', () => {
  test('returns true for valid meal types', () => {
    expect(validateMealType('breakfast')).toBe(true);
    expect(validateMealType('lunch')).toBe(true);
    expect(validateMealType('dinner')).toBe(true);
  });

  test('handles case-insensitive validation', () => {
    expect(validateMealType('Breakfast')).toBe(true);
    expect(validateMealType('LUNCH')).toBe(true);
    expect(validateMealType('Dinner')).toBe(true);
  });

  test('returns false for invalid meal types', () => {
    expect(validateMealType('snack')).toBe(false);
    expect(validateMealType('brunch')).toBe(false);
    expect(validateMealType('')).toBe(false);
  });

  test('returns false for null/undefined', () => {
    expect(validateMealType(null)).toBe(false);
    expect(validateMealType(undefined)).toBe(false);
  });
});

describe('sortMealPlans', () => {
  test('sorts by date first', () => {
    const plans = [
      { date: '2024-01-03', mealType: 'breakfast' },
      { date: '2024-01-01', mealType: 'dinner' },
      { date: '2024-01-02', mealType: 'lunch' },
    ];

    const sorted = sortMealPlans(plans);

    expect(sorted[0].date).toBe('2024-01-01');
    expect(sorted[1].date).toBe('2024-01-02');
    expect(sorted[2].date).toBe('2024-01-03');
  });

  test('sorts by meal type when dates are equal', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'dinner' },
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-01', mealType: 'lunch' },
    ];

    const sorted = sortMealPlans(plans);

    expect(sorted[0].mealType).toBe('breakfast');
    expect(sorted[1].mealType).toBe('lunch');
    expect(sorted[2].mealType).toBe('dinner');
  });

  test('handles plans with unknown meal types', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-01', mealType: 'unknown' },
      { date: '2024-01-01', mealType: 'lunch' },
    ];

    const sorted = sortMealPlans(plans);

    expect(sorted[0].mealType).toBe('breakfast');
    expect(sorted[1].mealType).toBe('lunch');
    expect(sorted[2].mealType).toBe('unknown'); // Unknown types go last
  });
});

describe('filterMealPlansByDateRange', () => {
  test('filters plans within date range', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-05', mealType: 'lunch' },
      { date: '2024-01-10', mealType: 'dinner' },
      { date: '2024-01-15', mealType: 'breakfast' },
    ];

    const filtered = filterMealPlansByDateRange(plans, '2024-01-05', '2024-01-10');

    expect(filtered.length).toBe(2);
    expect(filtered.every(p => p.date >= '2024-01-05' && p.date <= '2024-01-10')).toBe(true);
  });

  test('includes boundary dates', () => {
    const plans = [
      { date: '2024-01-05', mealType: 'breakfast' },
      { date: '2024-01-10', mealType: 'lunch' },
    ];

    const filtered = filterMealPlansByDateRange(plans, '2024-01-05', '2024-01-10');

    expect(filtered.length).toBe(2);
  });

  test('returns empty array when no plans match', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-15', mealType: 'lunch' },
    ];

    const filtered = filterMealPlansByDateRange(plans, '2024-01-05', '2024-01-10');

    expect(filtered.length).toBe(0);
  });
});

describe('validateMealPlanData', () => {
  test('returns valid for complete meal plan data', () => {
    const mealPlanData = {
      date: '2024-01-01',
      mealType: 'breakfast',
      locationId: 'loc123',
      locationName: 'Annenberg',
      selectedItems: [{ id: 'item1' }]
    };

    const result = validateMealPlanData(mealPlanData);

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('returns errors for missing required fields', () => {
    const mealPlanData = {
      mealType: 'breakfast'
      // Missing date, locationId, locationName, selectedItems
    };

    const result = validateMealPlanData(mealPlanData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('date is required');
    expect(result.errors).toContain('locationId is required');
  });

  test('validates mealType', () => {
    const mealPlanData = {
      date: '2024-01-01',
      mealType: 'invalid',
      locationId: 'loc123',
      locationName: 'Annenberg',
      selectedItems: []
    };

    const result = validateMealPlanData(mealPlanData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('mealType must be breakfast, lunch, or dinner');
  });

  test('validates selectedItems is an array', () => {
    const mealPlanData = {
      date: '2024-01-01',
      mealType: 'breakfast',
      locationId: 'loc123',
      locationName: 'Annenberg',
      selectedItems: 'not an array'
    };

    const result = validateMealPlanData(mealPlanData);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('selectedItems must be an array');
  });
});

describe('groupMealPlansByDate', () => {
  test('groups plans by date', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-01', mealType: 'lunch' },
      { date: '2024-01-02', mealType: 'dinner' },
    ];

    const grouped = groupMealPlansByDate(plans);

    expect(Object.keys(grouped).length).toBe(2);
    expect(grouped['2024-01-01'].length).toBe(2);
    expect(grouped['2024-01-02'].length).toBe(1);
  });

  test('sorts plans within each date by meal type', () => {
    const plans = [
      { date: '2024-01-01', mealType: 'dinner' },
      { date: '2024-01-01', mealType: 'breakfast' },
      { date: '2024-01-01', mealType: 'lunch' },
    ];

    const grouped = groupMealPlansByDate(plans);

    expect(grouped['2024-01-01'][0].mealType).toBe('breakfast');
    expect(grouped['2024-01-01'][1].mealType).toBe('lunch');
    expect(grouped['2024-01-01'][2].mealType).toBe('dinner');
  });

  test('handles empty array', () => {
    const grouped = groupMealPlansByDate([]);

    expect(Object.keys(grouped).length).toBe(0);
  });
});

