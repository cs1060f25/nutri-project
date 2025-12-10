# Harvard Eats

A comprehensive dining analytics platform for Harvard students to track meals, view HUDS menus, scan food with AI, get personalized nutrition insights, and connect with the Harvard dining community.

## 🚀 Quick Start - Development

### Single Command (Recommended)

From the **root directory**, run:

```bash
npm run dev
```

This starts:
- **Backend Express server** on `http://localhost:3000`
- **Frontend React app** on `http://localhost:3001`

Then open your browser to `http://localhost:3001`

### Individual Commands (Alternative)

If you prefer separate terminals:

```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend  
npm run dev:frontend
```

## 📦 First Time Setup

```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all

# Set up environment variables
# 1. Create backend/.env (copy from backend/.env.example)
# 2. Create frontend/.env (if needed)

# Run development servers
npm run dev
```

## 🔐 Environment Variables

### Backend (`backend/.env`)

```bash
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your-web-api-key

# HUDS API
HUDS_API_KEY=your-huds-api-key
HUDS_API_BASE_URL=https://go.prod.apis.huit.harvard.edu/ats/dining/v3

# Gemini AI (for food scanning)
GEMINI_API_KEY=your-gemini-api-key

# Server
PORT=3000
```

## 🏗️ Architecture: Serverless vs Local Dev

### Understanding the Two Environments

This project uses **different architectures** for development and production:

#### 🖥️ Local Development (What you're running now)
- **Backend**: Express.js server (`backend/src/`)
- **Frontend**: React dev server with proxy
- **How it works**: Frontend proxies API calls to Express backend
- **Why**: Fast refresh, easy debugging, full Node.js features
- **Start with**: `npm run dev`

#### ☁️ Production/Vercel (Deployed version)
- **Backend**: Vercel Serverless Functions (`api/`)
- **Frontend**: Static React build
- **How it works**: API routes are serverless functions
- **Why**: Auto-scaling, no server management, cost-effective
- **Deploy with**: `git push` (if connected to Vercel)

### The Code Duplication Explained

You'll notice we have TWO sets of backend code:

```
backend/src/          ← Express server (LOCAL DEV ONLY)
api/                  ← Serverless functions (PRODUCTION ONLY)
```

**Why?** 
- Local dev with Express is faster and easier to debug
- Production with serverless is more scalable and cost-effective
- Both implement the same logic, just different wrappers

**Important**: When you make changes to backend logic:
1. Update `backend/src/` files (for local dev)
2. Update corresponding `api/` files (for production)
3. We've kept them in sync for you!

### Testing Serverless Locally (Optional)

If you want to test the actual serverless functions locally:

```bash
# Install Vercel CLI
npm i -g vercel

# Run serverless functions locally
vercel dev
```

This will simulate the Vercel environment on `http://localhost:3000`

## 📁 Project Structure

```
nutri-project/
├── api/                          # Serverless functions (PRODUCTION)
│   ├── auth/                     # Auth endpoints
│   ├── huds/                     # HUDS API endpoints
│   │   ├── events.js            # GET meal types for date
│   │   ├── locations.js         # GET dining locations
│   │   ├── menu-date.js         # GET menu for specific date
│   │   └── menu-today.js        # GET today's menu
│   ├── meals/                    # Meal logging endpoints
│   │   ├── index.js             # POST/GET meals
│   │   ├── [id].js              # GET/PUT/DELETE meal by ID
│   │   └── summary/[date].js    # GET daily summary
│   └── nutrition-plan/          # Nutrition plan endpoints
│
├── backend/                      # Express server (LOCAL DEV)
│   ├── src/
│   │   ├── controllers/         # Request handlers
│   │   ├── services/            # Business logic
│   │   ├── routes/              # Route definitions
│   │   ├── middleware/          # Auth middleware
│   │   └── config/              # Firebase config
│   ├── scripts/                 # Utility scripts
│   └── tests/                   # Backend tests
│
├── frontend/                     # React application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API services
│   │   ├── context/             # React context
│   │   └── config/              # Frontend config
│   └── public/                  # Static assets
│
├── docs/                        # Documentation
│   ├── ats-dining.yaml         # HUDS API spec
│   └── firestore-schema.md     # Database schema
│
├── package.json                # Root scripts
└── vercel.json                 # Vercel deployment config
```

## 🎯 Features

### Core Features
- ✅ **User Authentication** - Firebase Auth with email/password and password reset
- ✅ **HUDS Menu Browser** - View real-time menus from all Harvard dining halls with full nutritional info
- ✅ **AI Food Scanner** - Snap a photo of your plate and get automatic nutrition estimates using Gemini AI
- ✅ **Manual Meal Logging** - Quick-add meals from today's HUDS menu with quantity adjustments
- ✅ **Nutrition Plans** - Create personalized daily macro/calorie goals and track progress
- ✅ **Daily Progress Rings** - Visual dashboard showing progress toward nutrition targets
- ✅ **Insights & Analytics** - AI-powered summaries, charts, and trends over custom date ranges
- ✅ **Meal History** - View, edit, rate, and review all logged meals
- ✅ **Meal Planning** - Plan future meals and get AI suggestions based on your goals
- ✅ **Social Feed** - Share meals with the Harvard community, see what others are eating
- ✅ **Settings** - Manage profile, dietary preferences, and account settings

### Quick Add Meal Flow
1. Click the "+" floating button on the Home page
2. Select time, dining hall, and meal type
3. Click "Next" to load today's menu
4. Search/browse and select food items
5. Adjust serving quantities
6. Save to your meal history

### AI Food Scanner Flow
1. Navigate to Food Scanner page
2. Upload or take a photo of your meal
3. AI identifies dishes and estimates portions from HUDS menu
4. Review matched items and nutrition totals
5. Save the scan as a meal log

**Note**: The HUDS API only provides current menu data. You can only log meals from **today's menu**.

## 🧪 Testing

### Run All Tests

```bash
# Backend tests (unit + integration)
cd backend && npm test

# Frontend tests
cd frontend && npm test -- --watchAll=false

# Specific backend test suites
cd backend
npm run test:huds      # HUDS API tests
npm run test:auth      # Auth tests
npm run test:api       # API integration tests
npm run test:syntax    # Quick syntax check
```

### Manual API Testing

```bash
# Get dining locations
curl http://localhost:3000/api/huds/locations

# Get today's menu for a location
curl "http://localhost:3000/api/huds/menu/today?locationId=05"

# Get menu for a specific date
curl "http://localhost:3000/api/huds/menu/date?date=2025-12-09"
```

## 🐛 Debugging

### Common Issues

**Frontend Not Loading**
```bash
lsof -i :3001              # Check if port is in use
cd frontend && npm start   # Restart frontend
```

**Backend Not Responding**
```bash
lsof -i :3000              # Check if port is in use
cd backend && npm run dev  # Restart with logs
```

**API Calls Failing**
1. Open Browser DevTools → Network tab
2. Check API response status and body
3. Check backend terminal for error logs
4. Verify `.env` variables are set correctly

**Food Scanner Not Working**
1. Ensure `GEMINI_API_KEY` is set in backend `.env`
2. Check backend logs for Gemini API errors
3. Try a clearer photo with better lighting

## 🚢 Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables on Vercel

Add these in your Vercel project settings:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY`
- `HUDS_API_KEY`
- `HUDS_API_BASE_URL`
- `GEMINI_API_KEY`

## 📚 Documentation

- [Firestore Schema](docs/firestore-schema.md)
- [HUDS API Spec](docs/ats-dining.yaml)
- [Backend README](backend/README.md)

## 🤝 Contributing

1. Make changes to both `backend/src/` and `api/` if modifying backend logic
2. Test locally with `npm run dev`
3. Test serverless with `vercel dev` (optional)
4. Commit and push to trigger Vercel deployment

## 📝 Available Scripts

From root directory:

```bash
npm run install-all    # Install all dependencies
npm run dev            # Run both frontend + backend
npm run dev:backend    # Run backend only
npm run dev:frontend   # Run frontend only
npm start              # Production mode (both)
```

## 🔒 Security Notes

- **Never commit** `.env` files
- **API keys** are server-side only (both Express and Serverless)
- **Firebase credentials** never exposed to browser
- **CORS** properly configured for all endpoints

## 💡 Tips

- Use `npm run dev` from root - it runs everything
- Backend logs show all API requests in the terminal
- Frontend proxy handles CORS automatically in development
- The AI food scanner works best with clear, well-lit photos
- Nutrition progress updates automatically after logging meals
- All 12 Harvard houses share the same menu (except Quincy)

---

**Harvard Eats** - Built for CS1060 Fall 2025
