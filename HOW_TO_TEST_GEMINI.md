# How to Test the Gemini Meal Analyzer 🎯

## Step 1: Make Sure Backend is Running

In your terminal where you have `npm run dev` running, type **`rs`** and press Enter to restart with the new changes.

You should see:
```
[backend] ✓ Server running on http://localhost:3000
[backend] ⚠️  Firebase not initialized (this is OK for testing Gemini!)
```

---

## Step 2: See What Gemini Receives 👀

Run this command to see the **exact menu text and nutrition data** that gets sent to Gemini:

```bash
curl http://localhost:3000/api/analyze-meal/menu-context | head -50
```

**Example output:**
```
Today's HUDS Dining Menu with Nutrition Information:

📍 Adams House
  🍽️ Breakfast
    • Main Entrees:
      - Scrambled Eggs (4 OZ)
        Nutrition: 182 cal, Protein: 12.2g, Carbs: 3g, Fat: 13.5g
      - Bacon Strips (2 OZ)
        Nutrition: 160 cal, Protein: 9g, Carbs: 1g, Fat: 13g
      - French Toast (2 slices)
        Nutrition: 280 cal, Protein: 8g, Carbs: 40g, Fat: 10g
    • Sides:
      - Hash Browns (3 OZ)
        Nutrition: 150 cal, Protein: 2g, Carbs: 20g, Fat: 7g
...
```

**This is what Gemini sees!** It gets every dish name, serving size, and full macros. 🎉

---

## Step 3: Get a Food Image 📸

### Option A: Download a Test Image
```bash
# Download a sample food image
curl -o /tmp/dining_hall_food.jpg \
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800"
```

### Option B: Use Your Own Photo
Take a photo of your meal and save it somewhere, like:
```
/Users/waseemahmad/Desktop/my_meal.jpg
```

---

## Step 4: Send Image to Gemini 🚀

```bash
# Replace the path with your image location
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@/tmp/dining_hall_food.jpg" \
  | jq
```

### Expected Response:

```json
{
  "success": true,
  "predictions": [
    {
      "dish": "Scrambled Eggs",
      "confidence": 0.92
    },
    {
      "dish": "Hash Browns",
      "confidence": 0.88
    },
    {
      "dish": "French Toast",
      "confidence": 0.85
    }
  ],
  "nutritionTotals": {
    "totalCalories": 612,
    "totalProtein": 22.2,
    "totalCarbs": 63,
    "totalFat": 30.5
  },
  "matchedItems": [
    {
      "predictedName": "Scrambled Eggs",
      "matchedName": "Scrambled Eggs",
      "confidence": 0.92,
      "calories": 182,
      "protein": 12.2,
      "carbs": 3,
      "fat": 13.5,
      "servingSize": "4 OZ"
    },
    {
      "predictedName": "Hash Browns",
      "matchedName": "Hash Browns",
      "confidence": 0.88,
      "calories": 150,
      "protein": 2,
      "carbs": 20,
      "fat": 7,
      "servingSize": "3 OZ"
    },
    {
      "predictedName": "French Toast",
      "matchedName": "French Toast",
      "confidence": 0.85,
      "calories": 280,
      "protein": 8,
      "carbs": 40,
      "fat": 10,
      "servingSize": "2 slices"
    }
  ],
  "unmatchedDishes": [],
  "menuAvailable": true,
  "timestamp": "2025-11-11T20:30:00.000Z"
}
```

---

## Understanding the Response

### `predictions`
What Gemini identified in your image with confidence scores (0-1)

### `nutritionTotals`
**Total macros** for all identified dishes combined:
- Total calories
- Total protein (grams)
- Total carbs (grams)
- Total fat (grams)

### `matchedItems`
Detailed breakdown of each matched dish with:
- Original prediction
- Matched menu item name
- Individual nutrition values
- Serving size

### `unmatchedDishes`
Any dishes Gemini predicted but we couldn't find in today's menu

---

## Step 5: Check Backend Logs 📋

In your backend terminal, you'll see:
```
📋 Sending to Gemini:
   - Menu items: 186 dishes
   - Image size: 245KB
   - API: gemini-2.0-flash-exp

✅ Gemini response: 3 dishes identified
📊 Matched: 3/3 dishes from menu
🧮 Total nutrition: 612 cal, 22.2g protein
```

---

## Troubleshooting 🔧

### "GEMINI_API_KEY is not configured"
Make sure your `backend/.env` has:
```bash
GEMINI_API_KEY=AIzaSyDQWkTN2yUKXr1cMsNn-wTx27Mn4dPGZOk
```

### "No menu data available"
Check that HUDS API credentials are in `backend/.env`:
```bash
HUDS_API_BASE_URL=https://go.prod.apis.huit.harvard.edu/ats/dining/v3
HUDS_API_KEY=WoW6nKpOIeXs5nwdGQ9ARbqMmSVpNF42WkdTkbA8zAoi6wZT
```

### "Request failed with status code 401"
Your HUDS API key might be expired or invalid.

### Empty predictions: `[]`
- The image might not match any menu items
- Try with a clearer image of dining hall food
- Check the menu context to see what dishes are available today

---

## Advanced Testing 🧪

### Test Different Meals

```bash
# Breakfast food
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@breakfast.jpg" | jq '.nutritionTotals'

# Lunch food  
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@lunch.jpg" | jq '.predictions'

# Dinner food
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@dinner.jpg" | jq '.matchedItems'
```

### Check How Many Dishes in Menu

```bash
curl -s http://localhost:3000/api/analyze-meal/menu-context | grep -c "Nutrition:"
```

### Save Menu to File

```bash
curl -s http://localhost:3000/api/analyze-meal/menu-context > todays_menu.txt
cat todays_menu.txt
```

---

## What Happens Behind the Scenes

1. **You upload** an image → Backend receives it
2. **Backend fetches** today's HUDS menu with all nutrition data
3. **Menu is formatted** as text with dish names + macros
4. **Image + Menu** are sent to Gemini 2.0 Flash
5. **Gemini analyzes** the image and returns dish predictions
6. **Backend matches** predictions to exact menu items
7. **Macros are calculated** by summing up matched dishes
8. **Response sent** to you with predictions + nutrition totals

---

## Frontend Testing (Bonus) 🎨

If you want to test in the React app:

1. Start frontend: `npm start` (from `frontend/` directory)
2. Navigate to the Meal Logger
3. Click "Upload Image" 
4. Select a food photo
5. Click "Analyze with AI"
6. See results with nutrition summary!

---

**Questions?** Check the logs in your backend terminal for detailed debugging info! 🔍
