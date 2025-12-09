/**
 * Unit tests for insight and analytics functions
 */

const {
  buildProgress,
  computeStreak,
  parseNutrient
} = require('../controllers/nutritionProgressController');

const {
  calculateBMR,
  calculateTDEE,
  adjustCaloriesForGoal
} = require('../services/personalizedNutritionService');

describe('buildProgress', () => {
  test('calculates progress below target', () => {
    const consumedTotals = {
      calories: 1500,
      protein: 60
    };
    const metrics = {
      calories: {
        enabled: true,
        target: "2000",
        unit: "kcal"
      },
      protein: {
        enabled: true,
        target: "100",
        unit: "g"
      }
    };

    const result = buildProgress(consumedTotals, metrics);

    expect(result.calories.current).toBe(1500);
    expect(result.calories.target).toBe(2000);
    expect(result.calories.percentage).toBe(75);
    expect(result.calories.remaining).toBe(500);
    expect(result.calories.status).toBe('below'); // 75% is below 80% threshold
    expect(result.protein.current).toBe(60);
    expect(result.protein.target).toBe(100);
    expect(result.protein.percentage).toBe(60);
    expect(result.protein.remaining).toBe(40);
    expect(result.protein.status).toBe('below');
  });

  test('calculates progress met target', () => {
    const consumedTotals = {
      calories: 2100
    };
    const metrics = {
      calories: {
        enabled: true,
        target: "2000",
        unit: "kcal"
      }
    };

    const result = buildProgress(consumedTotals, metrics);

    expect(result.calories.percentage).toBe(105);
    expect(result.calories.status).toBe('met');
    expect(result.calories.remaining).toBe(0);
  });

  test('calculates progress close to target', () => {
    const consumedTotals = {
      calories: 1600
    };
    const metrics = {
      calories: {
        enabled: true,
        target: "2000",
        unit: "kcal"
      }
    };

    const result = buildProgress(consumedTotals, metrics);

    expect(result.calories.percentage).toBe(80);
    expect(result.calories.status).toBe('close');
  });

  test('handles zero target', () => {
    const consumedTotals = {
      calories: 500
    };
    const metrics = {
      calories: {
        enabled: true,
        target: "0",
        unit: "kcal"
      }
    };

    const result = buildProgress(consumedTotals, metrics);

    expect(result.calories.percentage).toBe(0);
  });
});

describe('computeStreak', () => {
  test('calculates streak for consecutive days', () => {
    const dailySummaries = [
      { date: '2024-01-05', mealCount: 2 },
      { date: '2024-01-04', mealCount: 1 },
      { date: '2024-01-03', mealCount: 3 }
    ];
    const rangeStart = '2024-01-01';
    const rangeEnd = '2024-01-05';

    const result = computeStreak(dailySummaries, rangeStart, rangeEnd);

    expect(result).toBe(3);
  });

  test('calculates streak with gap breaking streak', () => {
    const dailySummaries = [
      { date: '2024-01-05', mealCount: 2 },
      { date: '2024-01-03', mealCount: 1 }
    ];
    const rangeStart = '2024-01-01';
    const rangeEnd = '2024-01-05';

    const result = computeStreak(dailySummaries, rangeStart, rangeEnd);

    expect(result).toBe(1);
  });

  test('returns 0 for empty summaries', () => {
    const dailySummaries = [];
    const rangeStart = '2024-01-01';
    const rangeEnd = '2024-01-05';

    const result = computeStreak(dailySummaries, rangeStart, rangeEnd);

    expect(result).toBe(0);
  });

  test('calculates streak for single day', () => {
    const dailySummaries = [
      { date: '2024-01-05', mealCount: 1 }
    ];
    const rangeStart = '2024-01-01';
    const rangeEnd = '2024-01-05';

    const result = computeStreak(dailySummaries, rangeStart, rangeEnd);

    expect(result).toBe(1);
  });
});

describe('calculateBMR', () => {
  test('calculates BMR for male', () => {
    const result = calculateBMR(25, 'male', 6, 0, 180);

    // Expected: 10 * 81.65 + 6.25 * 182.88 - 5 * 25 + 5 = 1839 (rounded)
    expect(result).toBe(1839);
  });

  test('calculates BMR for female', () => {
    const result = calculateBMR(30, 'female', 5, 6, 140);

    // Expected: 10 * 63.5 + 6.25 * 167.64 - 5 * 30 - 161 = 1372 (rounded)
    expect(result).toBe(1372);
  });

  test('calculates BMR for non-binary (averages male and female)', () => {
    const result = calculateBMR(25, 'non-binary', 5, 10, 160);

    // Should be average of male and female calculations
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });
});

describe('calculateTDEE', () => {
  test('calculates TDEE for sedentary activity level', () => {
    const result = calculateTDEE(1500, 'sedentary');

    expect(result).toBe(1800); // 1500 * 1.2
  });

  test('calculates TDEE for moderately-active level', () => {
    const result = calculateTDEE(1500, 'moderately-active');

    expect(result).toBe(2325); // 1500 * 1.55
  });

  test('calculates TDEE for very-active level', () => {
    const result = calculateTDEE(1500, 'very-active');

    expect(result).toBe(2588); // 1500 * 1.725 = 2587.5, rounded to 2588
  });

  test('defaults to sedentary for invalid activity level', () => {
    const result = calculateTDEE(1500, 'invalid');

    expect(result).toBe(1800); // Defaults to sedentary multiplier 1.2
  });
});

describe('adjustCaloriesForGoal', () => {
  test('adjusts calories for weight-loss goal', () => {
    const result = adjustCaloriesForGoal(2000, 'weight-loss');

    expect(result).toBe(1500); // 2000 - 500
  });

  test('adjusts calories for weight-gain goal', () => {
    const result = adjustCaloriesForGoal(2000, 'weight-gain');

    expect(result).toBe(2300); // 2000 + 300
  });

  test('adjusts calories for weight-maintenance goal', () => {
    const result = adjustCaloriesForGoal(2000, 'weight-maintenance');

    expect(result).toBe(2000); // 2000 + 0
  });

  test('clamps to minimum 1200 calories', () => {
    const result = adjustCaloriesForGoal(1500, 'weight-loss');

    expect(result).toBe(1200); // 1500 - 500 = 1000, but clamped to minimum 1200
  });

  test('adjusts calories for muscle-gain goal', () => {
    const result = adjustCaloriesForGoal(2000, 'muscle-gain');

    expect(result).toBe(2300); // 2000 + 300
  });
});

