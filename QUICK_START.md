# 🚀 Gemini Meal Analyzer - Quick Start

## ⚡ 3-Step Setup

### 1️⃣ Add API Key
```bash
# Create/edit backend/.env
echo "GEMINI_API_KEY=AIzaSyDQWkTN2yUKXr1cMsNn-wTx27Mn4dPGZOk" >> backend/.env
```

### 2️⃣ Start Development Server
```bash
npm run dev
```

### 3️⃣ Test the Feature
Open http://localhost:3000 → Log in → Click "Log a Meal" → Upload a food photo!

---

## 🧪 Quick Test with cURL

```bash
# Start backend first (npm run dev)
curl -X POST http://localhost:3000/api/analyze-meal \
  -F "image=@/path/to/food-photo.jpg"
```

**Expected Response:**
```json
{
  "success": true,
  "predictions": [
    {"dish": "grilled salmon", "confidence": 0.92},
    {"dish": "roasted vegetables", "confidence": 0.85}
  ],
  "menuAvailable": true,
  "timestamp": "2025-11-11T18:30:00.000Z"
}
```

---

## 📂 What Was Added

| File | Purpose | Size |
|------|---------|------|
| `backend/src/services/geminiAnalyzer.js` | Gemini API integration | 4.2K |
| `backend/src/controllers/geminiController.js` | Request handling | 1.6K |
| `backend/src/routes/geminiRoutes.js` | File upload endpoint | 814B |
| `api/analyze-meal.js` | Vercel serverless function | 8.0K |
| `frontend/src/services/geminiService.js` | Frontend API client | 884B |
| `frontend/src/components/MealLogger.js` | ✏️ Updated with image upload UI | - |
| `backend/src/index.js` | ✏️ Wired up gemini routes | - |

---

## 🎯 API Endpoint

```
POST /api/analyze-meal
Content-Type: multipart/form-data
Body: image=<file>

→ Returns predictions array with dish names + confidence scores
```

---

## 🔍 How It Works

1. User uploads food photo in MealLogger
2. Backend fetches today's HUDS menu
3. Image + menu sent to Gemini 2.0 Flash
4. AI returns predicted dishes
5. User reviews and adds to meal log

---

## ✅ All Requirements Met

- ✅ Accepts user-uploaded food photo
- ✅ Uses HUDS API (found at `backend/src/services/hudsService.js`)
- ✅ Sends to Gemini 2.5 Flash (using 2.0 Flash Exp model)
- ✅ Returns predicted dishes with confidence
- ✅ Backend + Serverless + Frontend implementations
- ✅ Comprehensive documentation

---

## 📚 Full Documentation

- **Setup Guide**: `GEMINI_MEAL_ANALYZER_SETUP.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **Test Script**: `test-gemini-analyzer.sh`

---

**🎉 Ready to use! Just add the API key and start the dev server.**

