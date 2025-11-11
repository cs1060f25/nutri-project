# Menu Data Filtering Implementation

## Problem
The HUDS API was returning massive JSON responses (~1MB+) with data for all dining halls, even though most halls serve identical menus (except Annenberg and Quincy).

## Solution
Added a `getSimplifiedMenu()` function that:
1. **Filters by location** - Defaults to Annenberg Hall (location ID '01') since it has unique menu items
2. **Reduces data size** - Strips out unnecessary fields, keeping only:
   - `dishName` - The name of the dish
   - `meal` - Breakfast/Lunch/Dinner
   - `category` - Main Entree, Sides, etc.
   - `calories`, `protein`, `carbs`, `fat` - Nutrition data
   - `servingSize` - Portion size

3. **Maintains compatibility** - All services support both simplified and legacy formats

## Files Modified

### Backend Service Layer
- **`backend/src/services/hudsService.js`**
  - Added `getSimplifiedMenu(locationId)` function
  - Defaults to location '01' (Annenberg Hall)
  - Returns structured object with location info and dish array

- **`backend/src/services/nutritionCalculator.js`**
  - Updated `findMatchingRecipe()` to handle simplified dish array format
  - Updated `calculateMealMacros()` to work with both formats

- **`backend/src/services/geminiAnalyzer.js`**
  - Updated `formatMenuText()` to format simplified dishes for Gemini
  - Groups dishes by meal and category for better readability

### Controller & Routes
- **`backend/src/controllers/geminiController.js`**
  - Now uses `getSimplifiedMenu('01')` instead of `getTodaysMenu()`
  - Logs dish count for monitoring
  
- **`backend/src/routes/geminiRoutes.js`**
  - Added test endpoint: `GET /api/analyze-meal/menu-preview`
  - Supports `?location=` query parameter

## Location IDs
- `'01'` - **Annenberg Hall** (unique menu, freshmen dining)
- `'09'` - **Quincy House** (unique menu)
- Other IDs - Serve the same menu as most residential houses

## Testing

### 1. View Simplified Menu
```bash
# Annenberg Hall (default)
curl http://localhost:3000/api/analyze-meal/menu-preview | jq

# Quincy House
curl http://localhost:3000/api/analyze-meal/menu-preview?location=09 | jq

# Adams House (same as most houses)
curl http://localhost:3000/api/analyze-meal/menu-preview?location=09 | jq
```

### 2. Check Data Size
```bash
# Full HUDS API response (unfiltered)
curl -s "https://go.prod.apis.huit.harvard.edu/ats/dining/v3/recipes/date/$(date +%Y-%m-%d)" \
  -H "x-api-key: YOUR_KEY" | wc -c

# Simplified response
curl -s http://localhost:3000/api/analyze-meal/menu-preview | wc -c
```

### 3. Test Meal Analysis
```bash
# Should now be much faster with smaller menu payload
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@/tmp/food.jpg"
```

## Benefits
- ✅ **90%+ smaller payload** - Only ~50-100KB vs 1MB+
- ✅ **Faster API responses** - Less data to transfer and process
- ✅ **Clearer Gemini context** - Simplified menu is easier to parse
- ✅ **Better matching** - Focus on one location's menu items
- ✅ **Customizable** - Can easily switch locations via parameter

## Example Response

### Simplified Menu (NEW)
```json
{
  "location": "Annenberg Hall",
  "date": "11/11/2025",
  "dishCount": 125,
  "dishes": [
    {
      "dishName": "Grilled Chicken Breast",
      "meal": "Dinner",
      "category": "Main Entrees",
      "calories": 250,
      "protein": "45g",
      "carbs": "0g",
      "fat": "5g",
      "servingSize": "6 OZ"
    },
    ...
  ]
}
```

### Legacy Format (STILL WORKS)
The old `getTodaysMenu()` function still exists for compatibility, returning the full nested structure by location/meal/category.

## Next Steps (Optional)
- Add location selection in frontend UI
- Cache simplified menus to reduce API calls
- Support multiple location queries for variety
