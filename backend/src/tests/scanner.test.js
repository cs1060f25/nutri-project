/**
 * Unit tests for scanner and nutrition calculation functions
 */

// Mock environment variables to avoid ApiKeyManager initialization error
process.env.GEMINI_API_KEY_1 = 'test-key-1';

const { formatMenuText } = require('../services/geminiAnalyzer');
const {
  parseNutrient,
  normalizeDishName,
  calculateSimilarity
} = require('../services/nutritionCalculator');

describe('formatMenuText', () => {
  test('returns default message for empty array', () => {
    const result = formatMenuText([]);
    expect(result).toBe("No menu data available for today.");
  });

  test('formats single recipe with full data', () => {
    const menuData = [{
      locationName: "Annenberg",
      meals: {
        breakfast: {
          mealName: "Breakfast",
          categories: {
            main: {
              categoryName: "Main",
              recipes: [{
                Recipe_Print_As_Name: "Scrambled Eggs",
                Recipe_Name: "Scrambled Eggs",
                Calories: "200",
                Protein: "15g",
                Total_Carb: "2g",
                Total_Fat: "14g",
                Serving_Size: "2 eggs"
              }]
            }
          }
        }
      }
    }];

    const result = formatMenuText(menuData);

    // Check that key elements are present
    expect(result).toContain("Annenberg");
    expect(result).toContain("Breakfast");
    expect(result).toContain("Main");
    expect(result).toContain("Scrambled Eggs");
    expect(result).toContain("200"); // Calories
    expect(result).toContain("15g"); // Protein
  });

  test('formats multiple locations', () => {
    const menuData = [
      {
        locationName: "Annenberg",
        meals: {}
      },
      {
        locationName: "Dunster",
        meals: {}
      }
    ];

    const result = formatMenuText(menuData);

    expect(result).toContain("Annenberg");
    expect(result).toContain("Dunster");
  });

  test('handles missing optional fields gracefully', () => {
    const menuData = [{
      locationName: "Test Location",
      meals: {
        lunch: {
          mealName: "Lunch",
          categories: {
            main: {
              categoryName: "Main",
              recipes: [{
                Recipe_Print_As_Name: "Test Dish"
                // Missing nutrition fields
              }]
            }
          }
        }
      }
    }];

    const result = formatMenuText(menuData);

    // Should not crash and should include the dish name
    expect(result).toContain("Test Dish");
    expect(result).toContain("N/A"); // Missing fields should show as N/A
  });
});

describe('parseNutrient', () => {
  test('parses nutrient with g suffix', () => {
    expect(parseNutrient("12g")).toBe(12);
  });

  test('parses plain number', () => {
    expect(parseNutrient("450")).toBe(450);
  });

  test('parses decimal with g suffix', () => {
    expect(parseNutrient("12.5g")).toBe(12.5);
  });

  test('returns 0 for null input', () => {
    expect(parseNutrient(null)).toBe(0);
  });

  test('returns 0 for undefined input', () => {
    expect(parseNutrient(undefined)).toBe(0);
  });

  test('returns 0 for non-numeric string', () => {
    expect(parseNutrient("abc")).toBe(0);
  });

  test('parses nutrient with mg suffix', () => {
    expect(parseNutrient("12mg")).toBe(12);
  });
});

describe('normalizeDishName', () => {
  test('normalizes simple name', () => {
    const result = normalizeDishName("Grilled Chicken Breast");
    expect(result).toBe("grilled chicken breast");
  });

  test('removes special characters', () => {
    const result = normalizeDishName("  Pizza (Pepperoni)  ");
    expect(result).toBe("pizza pepperoni");
  });

  test('removes ampersand', () => {
    const result = normalizeDishName("Mac & Cheese");
    expect(result).toBe("mac cheese");
  });

  test('collapses multiple spaces', () => {
    const result = normalizeDishName("Salad   Bowl");
    expect(result).toBe("salad bowl");
  });

  test('trims leading and trailing whitespace', () => {
    const result = normalizeDishName("  Chicken  ");
    expect(result).toBe("chicken");
  });
});

describe('calculateSimilarity', () => {
  test('returns 1.0 for exact match', () => {
    const result = calculateSimilarity("Grilled Chicken", "Grilled Chicken");
    expect(result).toBe(1.0);
  });

  test('returns high similarity for same words different order', () => {
    const result = calculateSimilarity("Grilled Chicken Breast", "Chicken Breast Grilled");
    // Should have high similarity since words match
    expect(result).toBeGreaterThan(0.5);
  });

  test('returns 0 for no match', () => {
    const result = calculateSimilarity("Pizza", "Salad");
    expect(result).toBe(0);
  });

  test('returns positive similarity for partial match', () => {
    const result = calculateSimilarity("Chicken", "Chicken Breast");
    // Should have some similarity
    expect(result).toBeGreaterThan(0);
  });

  test('returns high similarity for normalized match', () => {
    const result = calculateSimilarity("Mac and Cheese", "Mac & Cheese");
    // After normalization, should match well
    expect(result).toBeGreaterThan(0.5);
  });

  test('returns 0 for empty strings', () => {
    const result = calculateSimilarity("", "");
    expect(result).toBe(0);
  });
});

