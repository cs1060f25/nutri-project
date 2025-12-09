/**
 * Unit tests for nutrition planner calculation functions
 */

const {
  calculateProteinTarget,
  calculateCarbTarget,
  calculateFatTarget,
  calculateSodiumTarget,
  calculateFiberTarget
} = require('../services/personalizedNutritionService');

describe('calculateProteinTarget', () => {
  test('calculates protein for muscle-gain goal', () => {
    const result = calculateProteinTarget(180, 'muscle-gain', 'male');
    
    // 180 lbs * 0.453592 * 2.2 = 179.62, rounded to 180
    expect(result).toBe(180);
  });

  test('calculates protein for weight-loss goal', () => {
    const result = calculateProteinTarget(140, 'weight-loss', 'female');
    
    // 140 lbs * 0.453592 * 2.0 = ~127.0, rounded to 127
    expect(result).toBe(127);
  });

  test('calculates protein for weight-maintenance goal', () => {
    const result = calculateProteinTarget(160, 'weight-maintenance', 'male');
    
    // 160 lbs * 0.453592 * 1.6 = ~116.1, rounded to 116
    expect(result).toBe(116);
  });

  test('calculates protein for weight-gain goal', () => {
    const result = calculateProteinTarget(150, 'weight-gain', 'female');
    
    // 150 lbs * 0.453592 * 1.8 = 122.47, rounded to 122
    expect(result).toBe(122);
  });

  test('calculates protein with default multiplier for unknown goal', () => {
    const result = calculateProteinTarget(160, 'unknown-goal', 'male');
    
    // Should use default 1.6 multiplier
    expect(result).toBe(116);
  });
});

describe('calculateCarbTarget', () => {
  test('calculates carbs for weight-loss goal without diabetes', () => {
    const result = calculateCarbTarget(2000, 'weight-loss', false);
    
    // 2000 * 0.40 / 4 = 200g
    expect(result).toBe(200);
  });

  test('calculates carbs for muscle-gain goal without diabetes', () => {
    const result = calculateCarbTarget(2000, 'muscle-gain', false);
    
    // 2000 * 0.45 / 4 = 225g
    expect(result).toBe(225);
  });

  test('calculates carbs for weight-maintenance goal without diabetes', () => {
    const result = calculateCarbTarget(2000, 'weight-maintenance', false);
    
    // 2000 * 0.50 / 4 = 250g
    expect(result).toBe(250);
  });

  test('calculates carbs for weight-loss goal with diabetes', () => {
    const result = calculateCarbTarget(2000, 'weight-loss', true);
    
    // 2000 * 0.35 / 4 = 175g (diabetes overrides goal)
    expect(result).toBe(175);
  });

  test('calculates carbs for muscle-gain goal with diabetes', () => {
    const result = calculateCarbTarget(2000, 'muscle-gain', true);
    
    // 2000 * 0.35 / 4 = 175g (diabetes overrides goal)
    expect(result).toBe(175);
  });

  test('calculates carbs for different calorie amounts', () => {
    const result = calculateCarbTarget(1500, 'weight-maintenance', false);
    
    // 1500 * 0.50 / 4 = 187.5, rounded to 188
    expect(result).toBe(188);
  });
});

describe('calculateFatTarget', () => {
  test('calculates fat for weight-loss goal', () => {
    const result = calculateFatTarget(2000, 'weight-loss');
    
    // 2000 * 0.30 / 9 = 66.67, rounded to 67g
    expect(result).toBe(67);
  });

  test('calculates fat for weight-maintenance goal', () => {
    const result = calculateFatTarget(1500, 'weight-maintenance');
    
    // 1500 * 0.30 / 9 = 50g
    expect(result).toBe(50);
  });

  test('calculates fat for muscle-gain goal', () => {
    const result = calculateFatTarget(2500, 'muscle-gain');
    
    // 2500 * 0.30 / 9 = 83.33, rounded to 83g
    expect(result).toBe(83);
  });

  test('calculates fat for different calorie amounts', () => {
    const result = calculateFatTarget(1800, 'weight-maintenance');
    
    // 1800 * 0.30 / 9 = 60g
    expect(result).toBe(60);
  });
});

describe('calculateSodiumTarget', () => {
  test('returns standard limit for no health conditions', () => {
    const result = calculateSodiumTarget([]);
    
    expect(result).toBe(2300);
  });

  test('returns lower limit for high blood pressure', () => {
    const result = calculateSodiumTarget(['High Blood Pressure']);
    
    expect(result).toBe(1500);
  });

  test('returns lower limit for heart disease', () => {
    const result = calculateSodiumTarget(['Heart Disease']);
    
    expect(result).toBe(1500);
  });

  test('returns lower limit for kidney disease', () => {
    const result = calculateSodiumTarget(['Kidney Disease']);
    
    expect(result).toBe(1500);
  });

  test('returns lower limit for hypertension (case insensitive)', () => {
    const result = calculateSodiumTarget(['hypertension']);
    
    expect(result).toBe(1500);
  });

  test('returns lower limit for cardiovascular condition', () => {
    const result = calculateSodiumTarget(['Cardiovascular Disease']);
    
    expect(result).toBe(1500);
  });

  test('returns lower limit when multiple conditions present', () => {
    const result = calculateSodiumTarget(['High Blood Pressure', 'Diabetes']);
    
    expect(result).toBe(1500);
  });

  test('returns standard limit for unrelated conditions', () => {
    const result = calculateSodiumTarget(['Diabetes', 'Asthma']);
    
    expect(result).toBe(2300);
  });

  test('handles null/undefined health conditions', () => {
    const result = calculateSodiumTarget(null);
    
    expect(result).toBe(2300);
  });
});

describe('calculateFiberTarget', () => {
  test('calculates fiber for male under 50', () => {
    const result = calculateFiberTarget('male', 30);
    
    expect(result).toBe(38);
  });

  test('calculates fiber for male 50 or older', () => {
    const result = calculateFiberTarget('male', 55);
    
    expect(result).toBe(30);
  });

  test('calculates fiber for female under 50', () => {
    const result = calculateFiberTarget('female', 25);
    
    expect(result).toBe(25);
  });

  test('calculates fiber for female 50 or older', () => {
    const result = calculateFiberTarget('female', 60);
    
    expect(result).toBe(21);
  });

  test('calculates fiber for non-binary under 50', () => {
    const result = calculateFiberTarget('non-binary', 40);
    
    expect(result).toBe(31);
  });

  test('calculates fiber for non-binary 50 or older', () => {
    const result = calculateFiberTarget('non-binary', 55);
    
    expect(result).toBe(25);
  });

  test('calculates fiber for exactly 50 years old (male)', () => {
    const result = calculateFiberTarget('male', 50);
    
    expect(result).toBe(30);
  });

  test('calculates fiber for exactly 50 years old (female)', () => {
    const result = calculateFiberTarget('female', 50);
    
    expect(result).toBe(21);
  });
});

