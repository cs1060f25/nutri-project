const path = require('path');

describe('dietaryUtils.toList', () => {
  // Import via dynamic require so this works in a Node/Jest CJS setup
  const { toList } = require(
    path.join('..', '..', 'frontend', 'src', 'utils', 'dietaryUtils.js')
  );

  test('splits comma-separated values and trims whitespace', () => {
    const input = ' vegan, gluten-free , dairy-free ';
    expect(toList(input)).toEqual(['vegan', 'gluten-free', 'dairy-free']);
  });

  test('returns empty array for empty string', () => {
    expect(toList('')).toEqual([]);
  });

  test('ignores extra commas and blank entries', () => {
    const input = ',,,peanuts,, shellfish, ,';
    expect(toList(input)).toEqual(['peanuts', 'shellfish']);
  });

  test('returns empty array for non-string or falsy values', () => {
    expect(toList(null)).toEqual([]);
    expect(toList(undefined)).toEqual([]);
    expect(toList(123)).toEqual([]);
  });
});
