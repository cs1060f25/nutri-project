# Nutri Auth Backend

A secure authentication service built with Express.js and Firebase Auth, following deterministic REST API contracts.

## Features

- Email/Password authentication via Firebase Auth
- Secure password hashing (scrypt)
- JWT-based access tokens (1-hour expiry)
- Refresh token rotation
- Token revocation support
- Role-based access control via custom claims
- Breach protection & email throttling
- Deterministic error codes
- Multi-client support

## Architecture

- **Backend**: Express.js on Node.js
- **Auth Provider**: Firebase Authentication
- **Token Management**: Firebase ID tokens (access) + Firebase refresh tokens
- **Roles**: Firebase custom claims
- **Security**: Firebase Admin SDK with scrypt password hashing

## Prerequisites

- Node.js (v16 or higher)
- Firebase project with Authentication enabled
- Firebase service account credentials

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create a `.env` file in the `backend` directory based on your local configuration.

### 3. Run the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "firebase-uid",
    "email": "user@example.com",
    "name": null,
    "roles": []
  }
}
```

**Errors:**
- `409 EMAIL_ALREADY_EXISTS` - Email already registered
- `400 WEAK_PASSWORD` - Password too weak (min 6 characters)
- `400 INVALID_EMAIL` - Invalid email format

---

### POST /auth/login

Authenticate and receive access/refresh tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AMf-vBwvLjPk...",
  "user": {
    "id": "firebase-uid",
    "email": "user@example.com",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` - Wrong email or password
- `423 ACCOUNT_LOCKED` - Account disabled
- `429 RATE_LIMITED` - Too many attempts

---

### POST /auth/refresh

Refresh the access token using a refresh token.

**Request:**
```json
{
  "refreshToken": "AMf-vBwvLjPk..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "NEW_REFRESH_TOKEN..."
}
```

**Notes:**
- Firebase issues a new refresh token on each refresh (rotation)
- Old refresh tokens are automatically invalidated

**Errors:**
- `401 INVALID_REFRESH` - Invalid or revoked refresh token

---

### POST /auth/logout

Revoke all refresh tokens for the authenticated user (global sign-out).

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Request:**
```json
{}
```

**Response (200):**
```json
{
  "status": "ok"
}
```

**Errors:**
- `401 INVALID_TOKEN` - Invalid or expired access token

---

### GET /auth/me

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response (200):**
```json
{
  "id": "firebase-uid",
  "email": "user@example.com",
  "name": "John Doe",
  "roles": ["user", "admin"]
}
```

**Errors:**
- `401 INVALID_TOKEN` - Invalid or expired access token

---

## Error Format

All errors follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `INVALID_EMAIL` | Invalid email format |
| 400 | `WEAK_PASSWORD` | Password too weak |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 401 | `INVALID_TOKEN` | Invalid/expired access token |
| 401 | `INVALID_REFRESH` | Invalid/revoked refresh token |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |
| 423 | `ACCOUNT_LOCKED` | Account disabled |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL` | Internal server error |

## Utility Scripts

The backend includes several utility scripts for database management and debugging.

### View Firestore Data

View all users and their nutrition plans stored in Firestore:

```bash
cd backend
node scripts/viewFirestoreData.js
```

**Output Example:**
```
🔍 Fetching Firestore Data...

👥 Found 2 user(s)

📄 User Document ID: abc123xyz

User Profile:
{
  "email": "user@college.harvard.edu",
  "firstName": "John",
  "lastName": "Doe",
  "residence": "Winthrop"
}

🍎 Nutrition Plans (1):

  Plan 1 (ID: plan_abc123):
  ├─ Preset: 🧘 Mind & Focus
  ├─ Active: ✓
  ├─ Metrics Tracked (5):
  ├─    • waterIntake: 8 cups (Alert: 6 cups)
  ├─    • caffeine: 200 mg (Alert: 400 mg)
  └─    • protein: 150 g (Alert: 120 g)
```

**Options:**
```bash
# View with raw JSON data
node scripts/viewFirestoreData.js --raw
# or
node scripts/viewFirestoreData.js -r
```

---

### List All Users

List all registered users:

```bash
cd backend
node scripts/listUsers.js
```

---

### Delete a User

Delete a user by their Firebase UID:

```bash
cd backend
node scripts/deleteUser.js <userId>
```

---

### Set User Role

Assign a role to a user:

```bash
cd backend
node scripts/setUserRole.js <userId> <role>
```

**Example:**
```bash
node scripts/setUserRole.js abc123xyz admin
```

---

## Deployment

### Deploy to Google Cloud Run

1. Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

2. Deploy:

```bash
gcloud run deploy nutri-auth-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id,...
```

### Deploy to Firebase Functions

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init functions`
3. Deploy: `firebase deploy --only functions`

## Testing

The backend includes comprehensive automated tests to verify authentication functionality.

### Available Test Commands

#### 1. Unit Tests
```bash
npm test
```

Runs unit tests for core authentication functions. This test suite:
- Validates Firebase configuration
- Tests email/password validation logic
- Verifies error mapping functions
- Checks utility functions

**Use this to**: Quickly verify core business logic without hitting the API.

---

#### 2. Full Authentication Flow Test
```bash
npm run test:auth
```

Tests the complete authentication lifecycle end-to-end. This test:
1. **Registers** a new user with a unique email
2. **Logs in** with the created credentials
3. **Fetches user info** using the access token (`GET /auth/me`)
4. **Refreshes** the access token using the refresh token
5. **Logs out** to revoke all sessions
6. **Verifies revocation** by attempting to use the revoked token (should fail)

**Use this to**: Verify the complete user authentication journey works correctly.

**Requirements**: Server must be running on `http://localhost:3000`

**Output**: Shows each step with JSON responses and success/failure indicators.

---

#### 3. API Endpoint Test Suite
```bash
npm run test:api
```

Comprehensive test of all authentication endpoints including edge cases. This test validates:

**Happy Path:**
- Health check endpoint
- User registration
- User login
- Get current user info
- Token refresh
- Token verification after refresh
- User logout
- Token revocation verification

**Error Cases:**
- Duplicate registration (409 conflict)
- Wrong password (401 unauthorized)

**Use this to**: Run a full test suite covering both success and failure scenarios.

**Requirements**: Server must be running on `http://localhost:3000`

**Output**: Color-coded results with detailed JSON responses for each test.

---

### Running Tests

**Step 1**: Ensure the server is running
```bash
# In one terminal
npm run dev
```

**Step 2**: Run tests in another terminal
```bash
# Run all tests
npm test                # Unit tests (no server needed)
npm run test:auth       # Full auth flow (server required)
npm run test:api        # Complete endpoint suite (server required)
```

### Test Prerequisites

- **jq** must be installed for shell script tests (formats JSON output)
  ```bash
  # macOS
  brew install jq
  
  # Ubuntu/Debian
  sudo apt-get install jq
  ```

- Server must be running on port 3000 for integration tests
- Valid Firebase configuration in `.env` file

### Manual Testing with cURL

You can also test endpoints manually:

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get current user
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Using Postman

Import `postman-collection.json` for a complete set of pre-configured API requests with automated token management.

## Support

For issues or questions, please refer to:
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

