/**
 * Convert a comma-separated string into a trimmed, non-empty string array.
 * Example: " vegan, gluten-free , " -> ["vegan", "gluten-free"]
 */
export function toList(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}
