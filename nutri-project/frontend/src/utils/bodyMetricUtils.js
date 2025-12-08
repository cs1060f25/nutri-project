/**
 * Parse a string as a number; return null for empty/whitespace, NaN for bad values.
 */
export function parseNumberOrNull(input) {
  if (input === null || input === undefined) return null;
  const trimmed = String(input).trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  return Number.isNaN(num) ? NaN : num;
}
