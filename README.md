# HUDS Nutrition Analyzer

Track your dining hall consumption and diet goals with Harvard University Dining Services (HUDS) data.

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
# 1. Create backend/.env (see below)
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

### Current Features
- ✅ User authentication (Firebase Auth)
- ✅ View HUDS menus with nutritional information
- ✅ Quick add meals from any date
- ✅ Dynamic meal types based on availability
- ✅ Track meals in user-scoped Firestore subcollection
- ✅ Create and manage nutrition plans
- ✅ Automatic nutritional calculations

### Quick Add Meal Flow
1. Click the "+" floating button
2. Select time, dining hall, and meal type
3. Click "Next" to load today's menu
4. Browse and select food items
5. Adjust quantities
6. Save to Firestore (`users/{userId}/meals`)

**Important**: The HUDS API only provides current/future menu data, not historical data. You can only log meals from **today's menu**. Use the time picker to backlog meals from earlier today.

## 🧪 Testing

### Check if Meals are Saved

```bash
cd backend
node scripts/viewFirestoreData.js
```

This shows all users and their data, including the `meals` subcollection.

### Run Backend Tests

```bash
cd backend
npm test
```

### Manual API Testing

```bash
# Get locations
curl http://localhost:3000/api/huds/locations

# Get events for a date
curl "http://localhost:3000/api/huds/events?date=2025-11-03&locationId=05"

# Get menu for a date
curl "http://localhost:3000/api/huds/menu/date?date=2025-11-03"
```

## 🐛 Debugging

### Frontend Not Loading
```bash
# Check if frontend is running
lsof -i :3001

# Restart if needed
cd frontend && npm start
```

### Backend Not Responding
```bash
# Check if backend is running
lsof -i :3000

# Check logs
cd backend && npm run dev
```

### API Calls Failing
1. Open Browser DevTools → Network tab
2. Check API responses
3. Check backend terminal for error logs
4. Verify environment variables are set

### Meal Types Stuck Loading
1. Open Browser Console
2. Look for console.log messages about fetching meal types
3. Check if HUDS API key is valid
4. Verify date format is YYYY-MM-DD

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
- Backend logs show all API requests
- Frontend proxy handles CORS automatically
- Both architectures work identically for the user
- Serverless functions auto-scale in production
- Express server is easier to debug locally

---

Need help? Check the [Backend README](backend/README.md) or open an issue!
