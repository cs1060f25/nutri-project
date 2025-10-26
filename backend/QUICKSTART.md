# Quick Start Guide

Get the authentication service running on your machine in 5 minutes!

## Prerequisites

- Node.js v16+ installed
- Access to the Firebase project (ask project admin)
- Git

## Step 1: Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install
```

## Step 2: Get Firebase Access

### Get YOUR Service Account Credentials

**Important:** Each developer should generate their OWN service account key!

1. Go to https://console.firebase.google.com/project/huds-nutrition-analyzer/settings/serviceaccounts
2. Click **"Generate new private key"**
3. Click **"Generate key"** in the popup
4. Download the JSON file (keep it safe!)

**Note:** This creates a NEW key for you - it doesn't affect other developers' keys.

## Step 3: Configure Environment

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Open the JSON file you downloaded and copy the values:

```env
FIREBASE_PROJECT_ID=huds-nutrition-analyzer
FIREBASE_CLIENT_EMAIL=<from JSON: client_email>
FIREBASE_PRIVATE_KEY="<from JSON: private_key>"
FIREBASE_WEB_API_KEY=AIzaSyDEQ1HK5xfdkLq5ObrpIx2_gO4sNNQRtwM
```

**Important:** 
- Keep the quotes around `FIREBASE_PRIVATE_KEY` 
- Preserve the `\n` characters in the private key
- The Web API Key is already filled in (same for all developers)

## Step 4: Grant Permissions (First-Time Only)

**If this is your first time** setting up the service account, it needs permission:

1. Go to https://console.cloud.google.com/iam-admin/iam?project=huds-nutrition-analyzer
2. Find YOUR service account email (from the JSON file)
3. Click the pencil icon (edit)
4. Click **"Add Another Role"**
5. Select **"Service Usage Consumer"**
6. Click **"Save"**
7. Wait 30 seconds

**Note:** If another developer already set this up, you can skip this step!

## Step 5: Test & Run

```bash
# Verify setup
npm run check

# Run tests
npm test

# Start the server
npm run dev
```

Server will start at http://localhost:3000

## Step 6: Test Authentication

```bash
# Test the full authentication flow
npm run test:auth
```

You should see all tests passing! ✅

## Available Commands

```bash
npm start          # Start server (production)
npm run dev        # Start server (development)
npm run check      # Verify Firebase setup
npm test           # Run unit tests
npm run test:auth  # Test full auth flow
npm run list-users # List all users
npm run set-role   # Assign roles to users
```

## API Endpoints

Your authentication service is now running with:

- `POST /auth/register` - Create new user
- `POST /auth/login` - Login & get tokens
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Revoke all sessions
- `GET /auth/me` - Get current user

## Example Usage

```bash
# Register a user
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
```

## Troubleshooting

**"PERMISSION_DENIED" error?**
→ Make sure you granted "Service Usage Consumer" role to YOUR service account (Step 4)

**"Module not found" error?**
→ Run `npm install`

**"Cannot find .env" error?**
→ Copy `.env.example` to `.env` and fill in YOUR credentials

**"Need Firebase access" error?**
→ Ask the project admin to add you to the Firebase project

**Server won't start?**
→ Run `npm run check` to verify Firebase setup

## Working with the Team

### Database Access
All developers share the same Firebase project (`huds-nutrition-analyzer`). You'll see:
- All users created by the team
- Shared authentication data
- Same configuration

### Your Service Account
Each developer has their own service account key for:
- Security (can be revoked individually)
- Audit logs (track who did what)
- No conflicts between developers

### Best Practices
- ✅ Generate your OWN service account key
- ✅ Never commit your `.env` file
- ✅ Never share your private key
- ✅ Test locally before pushing
- ❌ Don't use production credentials for development

## Next Steps

- Import `postman-collection.json` into Postman for easy testing
- Check `README.md` for full API documentation
- See `tests/README.md` for testing details
- Ask the team about coding conventions

## Getting Help

- **Technical Issues**: Check README.md or Firebase documentation
- **Access Issues**: Contact the project admin
- **Team Questions**: Ask in your team chat

---

**Welcome to the team!** 🎉

