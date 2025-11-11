# Gemini Meal Analyzer - Setup & Testing Guide

## 🎯 Overview

This feature allows users to upload a food photo, which is analyzed by Google's Gemini 2.0 Flash AI to identify dishes from today's HUDS dining hall menu.

## 📦 What Was Added

### Backend (Express Server)
- **Service**: `backend/src/services/geminiAnalyzer.js` - Handles Gemini API communication
- **Controller**: `backend/src/controllers/geminiController.js` - Request handling and validation
- **Routes**: `backend/src/routes/geminiRoutes.js` - Multer-based file upload endpoint

### Serverless (Vercel)
- **Function**: `api/analyze-meal.js` - Serverless version with multipart form data parsing

### Frontend (React)
- **Service**: `frontend/src/services/geminiService.js` - API client for meal analysis
- **Component**: Updated `frontend/src/components/MealLogger.js` with image upload UI

## 🔧 Setup Instructions

### 1. Configure Environment Variables

#### Backend (Local Development)
Create or update `backend/.env`:

```bash
# Existing variables...
HUDS_API_KEY=your_huds_api_key
HUDS_API_BASE_URL=https://go.prod.apis.huit.harvard.edu/ats/dining/v3

# NEW: Add Gemini API Key
GEMINI_API_KEY=AIzaSyDQWkTN2yUKXr1cMsNn-wTx27Mn4dPGZOk
```

#### Vercel (Production)
Add to your Vercel project settings:
```bash
GEMINI_API_KEY=AIzaSyDQWkTN2yUKXr1cMsNn-wTx27Mn4dPGZOk
```

### 2. Install Dependencies

All required dependencies are already in place:
- Backend: `multer` (for file uploads), `axios` (for API calls)
- Frontend: Built-in `fetch` API

### 3. Start the Development Server

```bash
# From project root
npm run dev

# Or separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

## 🧪 Testing

### Method 1: Using the Frontend UI

1. Start the dev server (`npm run dev` from root)
2. Log in to the application
3. Click "Log a Meal"
4. In step 1, scroll down to see "📸 AI Meal Recognition (Optional)"
5. Click "Choose Image" and select a food photo
6. Click "🔍 Analyze Image"
7. View the detected dishes with confidence scores
8. Click "Next" to continue logging the meal

### Method 2: Using cURL (Backend API)

```bash
# Make the test script executable
chmod +x test-gemini-analyzer.sh

# Run the test with a food image
./test-gemini-analyzer.sh path/to/your/food-photo.jpg
```

Or manually:

```bash
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@/path/to/food-photo.jpg"
```

### Method 3: Using Postman

1. Create new POST request to `http://localhost:3000/api/analyze-meal`
2. Go to Body → form-data
3. Add key `image` with type `File`
4. Select a food image file
5. Send request

### Expected Response

```json
{
  "success": true,
  "predictions": [
    {
      "dish": "grilled salmon",
      "confidence": 0.92
    },
    {
      "dish": "roasted vegetables",
      "confidence": 0.85
    }
  ],
  "menuAvailable": true,
  "timestamp": "2025-11-11T18:30:00.000Z"
}
```

## 📁 File Structure

```
backend/
  src/
    services/
      geminiAnalyzer.js          ← NEW: Gemini API integration
    controllers/
      geminiController.js        ← NEW: Request handling
    routes/
      geminiRoutes.js           ← NEW: File upload endpoint
    index.js                    ← UPDATED: Added gemini routes

api/
  analyze-meal.js               ← NEW: Serverless version

frontend/
  src/
    services/
      geminiService.js          ← NEW: Frontend API client
    components/
      MealLogger.js             ← UPDATED: Added image upload UI
```

## 🔍 How It Works

1. **User uploads image** in the MealLogger component
2. **Frontend sends** multipart/form-data POST to `/api/analyze-meal`
3. **Backend fetches** today's HUDS menu using existing `hudsService`
4. **Menu is formatted** into readable text with locations, meals, and dishes
5. **Image + menu context sent** to Gemini 2.0 Flash API
6. **Gemini analyzes** the image and matches dishes to the menu
7. **Predictions returned** with confidence scores (0-1)
8. **User reviews** detected dishes and can add them to their meal log

## 🚨 Troubleshooting

### "GEMINI_API_KEY is not configured"
- Ensure `GEMINI_API_KEY` is set in `backend/.env`
- Restart the backend server after adding the key

### "No menu data available for today"
- HUDS API may not have published today's menu yet
- Check if `HUDS_API_KEY` is configured correctly
- Try again later when the menu is available

### "Failed to analyze image"
- Check image file format (JPEG/PNG only)
- Ensure image file size is under 10MB
- Verify Gemini API key is valid

### Network/CORS Issues
- Ensure backend is running on port 3000
- Check that frontend is configured to connect to correct API URL
- Look for CORS errors in browser console

## 🔐 Security Notes

- ⚠️ **Never commit** `.env` files to git
- 🔑 The Gemini API key in this doc is for development only
- 🔒 In production, rotate keys regularly
- 🛡️ Multer limits uploads to 10MB max

## 📊 API Specification

### Endpoint: `POST /api/analyze-meal`

**Request:**
- Content-Type: `multipart/form-data`
- Body field: `image` (file, JPEG/PNG, max 10MB)

**Success Response (200):**
```json
{
  "success": true,
  "predictions": [
    {"dish": "string", "confidence": 0.0-1.0}
  ],
  "menuAvailable": true,
  "timestamp": "ISO 8601 string"
}
```

**Error Responses:**

400 Bad Request:
```json
{
  "error": "No image file provided. Please upload an image.",
  "success": false
}
```

404 Not Found:
```json
{
  "error": "No menu data available for today. Please try again later.",
  "success": false
}
```

500 Internal Server Error:
```json
{
  "error": "GEMINI_API_KEY is not configured",
  "success": false
}
```

## ✅ Feature Checklist

- [x] Gemini service created in backend
- [x] Express route with multer file upload
- [x] Serverless function for Vercel deployment
- [x] Frontend service for API calls
- [x] UI integration in MealLogger component
- [x] HUDS menu integration
- [x] Error handling and validation
- [x] Test script created
- [x] Documentation complete

## 🎓 Next Steps

1. **Test with real food photos** from Harvard dining halls
2. **Fine-tune prompts** if prediction accuracy needs improvement
3. **Add caching** for menu data to reduce API calls
4. **Implement user feedback** mechanism to improve predictions
5. **Add analytics** to track feature usage

## 🐛 Known Limitations

- Only works with today's menu (HUDS API limitation)
- Requires clear, well-lit photos for best results
- Confidence scores depend on how similar dishes look
- Cannot identify dishes not on today's menu

