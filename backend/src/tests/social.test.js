/**
 * Unit tests for social/post utility functions
 */

const {
  normalizeHouseName,
  calculateUpvoteCount,
  sortPostsByPopularity,
  filterPostsByMealType
} = require('../services/postService');

const { parseNutrient } = require('../services/nutritionCalculator');

describe('normalizeHouseName', () => {
  test('adds "House" suffix to house name without it', () => {
    expect(normalizeHouseName('Dunster')).toBe('Dunster House');
  });

  test('keeps "House" suffix if already present', () => {
    expect(normalizeHouseName('Dunster House')).toBe('Dunster House');
  });

  test('handles case-insensitive matching', () => {
    expect(normalizeHouseName('dunster')).toBe('dunster House');
    expect(normalizeHouseName('DUNSTER')).toBe('DUNSTER House');
  });

  test('handles non-house locations', () => {
    expect(normalizeHouseName('Annenberg')).toBe('Annenberg');
    expect(normalizeHouseName('Science Center')).toBe('Science Center');
  });

  test('handles empty string', () => {
    expect(normalizeHouseName('')).toBe('');
  });

  test('handles null/undefined', () => {
    expect(normalizeHouseName(null)).toBe(null);
    expect(normalizeHouseName(undefined)).toBe(undefined);
  });

  test('handles house name with extra spaces', () => {
    expect(normalizeHouseName('Dunster  ')).toBe('Dunster House');
  });
});

describe('parseNutrient', () => {
  test('parses nutrient with g suffix', () => {
    expect(parseNutrient('12g')).toBe(12);
  });

  test('parses nutrient with mg suffix', () => {
    expect(parseNutrient('450mg')).toBe(450);
  });

  test('parses plain number', () => {
    expect(parseNutrient('200')).toBe(200);
  });

  test('parses decimal value', () => {
    expect(parseNutrient('12.5g')).toBe(12.5);
  });

  test('returns 0 for null', () => {
    expect(parseNutrient(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(parseNutrient(undefined)).toBe(0);
  });

  test('returns 0 for non-numeric string', () => {
    expect(parseNutrient('abc')).toBe(0);
  });

  test('handles number type input', () => {
    expect(parseNutrient(200)).toBe(200);
  });
});

describe('calculateUpvoteCount', () => {
  test('returns count for array of upvotes', () => {
    expect(calculateUpvoteCount(['user1', 'user2', 'user3'])).toBe(3);
  });

  test('returns 0 for empty array', () => {
    expect(calculateUpvoteCount([])).toBe(0);
  });

  test('returns 0 for null', () => {
    expect(calculateUpvoteCount(null)).toBe(0);
  });

  test('returns 0 for undefined', () => {
    expect(calculateUpvoteCount(undefined)).toBe(0);
  });

  test('returns 0 for non-array value', () => {
    expect(calculateUpvoteCount('not an array')).toBe(0);
  });
});

describe('sortPostsByPopularity', () => {
  test('sorts posts by upvote count descending', () => {
    const posts = [
      { id: '1', upvotes: ['a', 'b'], createdAt: new Date('2024-01-01') },
      { id: '2', upvotes: ['a', 'b', 'c', 'd'], createdAt: new Date('2024-01-02') },
      { id: '3', upvotes: ['a'], createdAt: new Date('2024-01-03') },
    ];

    const sorted = sortPostsByPopularity(posts);

    expect(sorted[0].id).toBe('2'); // Most upvotes
    expect(sorted[1].id).toBe('1');
    expect(sorted[2].id).toBe('3');
  });

  test('uses date as tiebreaker when upvotes are equal', () => {
    const posts = [
      { id: '1', upvotes: ['a'], createdAt: new Date('2024-01-01') },
      { id: '2', upvotes: ['a'], createdAt: new Date('2024-01-03') },
      { id: '3', upvotes: ['a'], createdAt: new Date('2024-01-02') },
    ];

    const sorted = sortPostsByPopularity(posts);

    expect(sorted[0].id).toBe('2'); // Most recent
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  test('handles posts without upvotes', () => {
    const posts = [
      { id: '1', createdAt: new Date('2024-01-01') },
      { id: '2', upvotes: ['a'], createdAt: new Date('2024-01-02') },
    ];

    const sorted = sortPostsByPopularity(posts);

    expect(sorted[0].id).toBe('2'); // Has upvotes
    expect(sorted[1].id).toBe('1');
  });
});

describe('filterPostsByMealType', () => {
  test('filters posts by meal type (case-insensitive)', () => {
    const posts = [
      { id: '1', mealType: 'breakfast' },
      { id: '2', mealType: 'lunch' },
      { id: '3', mealType: 'Breakfast' },
      { id: '4', mealType: 'dinner' },
    ];

    const filtered = filterPostsByMealType(posts, 'breakfast');

    expect(filtered.length).toBe(2);
    expect(filtered.every(p => p.mealType.toLowerCase() === 'breakfast')).toBe(true);
  });

  test('returns all posts when mealType is not provided', () => {
    const posts = [
      { id: '1', mealType: 'breakfast' },
      { id: '2', mealType: 'lunch' },
    ];

    const filtered = filterPostsByMealType(posts, null);

    expect(filtered.length).toBe(2);
  });

  test('excludes posts without mealType', () => {
    const posts = [
      { id: '1', mealType: 'breakfast' },
      { id: '2' }, // No mealType
      { id: '3', mealType: 'lunch' },
    ];

    const filtered = filterPostsByMealType(posts, 'breakfast');

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });
});

