const { parseNumberOrNull } = require('../../frontend/src/utils/bodyMetricsUtils.js');

describe('parseNumberOrNull', () => {
  test('parses valid numeric strings', () => {
    expect(parseNumberOrNull('170')).toBe(170);
    expect(parseNumberOrNull(' 65.5 ')).toBe(65.5);
  });

  test('returns null for empty or whitespace-only strings', () => {
    expect(parseNumberOrNull('')).toBeNull();
    expect(parseNumberOrNull('   ')).toBeNull();
  });

  test('returns NaN for non-numeric strings', () => {
    const result = parseNumberOrNull('abc');
    expect(Number.isNaN(result)).toBe(true);
  });

  test('returns null for null/undefined input', () => {
    expect(parseNumberOrNull(null)).toBeNull();
    expect(parseNumberOrNull(undefined)).toBeNull();
  });
});
