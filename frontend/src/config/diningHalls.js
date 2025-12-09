/**
 * Standard list of Harvard dining halls to display across the app.
 * This list is used for AI Meal Suggestion, Explore Menu, and Meal Planning.
 */
export const HARVARD_DINING_HALLS = [
  'Adams House',
  'Annenberg Hall',
  'Cabot House',
  'Currier House',
  'Dunster House',
  'Eliot House',
  'Kirkland House',
  'Leverett House',
  'Lowell House',
  'Mather House',
  'Pforzheimer House',
  'Quincy House',
  'Winthrop House',
];

/**
 * Filter and sort locations to only include standard Harvard dining halls.
 * @param {Array} locations - Array of location objects from the API
 * @returns {Array} Filtered and sorted locations matching HARVARD_DINING_HALLS
 */
export const filterStandardDiningHalls = (locations) => {
  if (!Array.isArray(locations)) return [];
  
  // Filter to only include locations that match our standard list
  const filtered = locations.filter(loc => {
    const name = loc.location_name || '';
    return HARVARD_DINING_HALLS.some(hall => 
      name.toLowerCase() === hall.toLowerCase() ||
      name.toLowerCase().includes(hall.toLowerCase())
    );
  });
  
  // Sort alphabetically by location_name
  return filtered.sort((a, b) => 
    (a.location_name || '').localeCompare(b.location_name || '')
  );
};

/**
 * Check if a location name is a standard Harvard dining hall
 * @param {string} locationName - The location name to check
 * @returns {boolean} True if it's a standard dining hall
 */
export const isStandardDiningHall = (locationName) => {
  if (!locationName) return false;
  return HARVARD_DINING_HALLS.some(hall => 
    locationName.toLowerCase() === hall.toLowerCase() ||
    locationName.toLowerCase().includes(hall.toLowerCase())
  );
};
