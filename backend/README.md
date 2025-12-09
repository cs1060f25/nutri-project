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

## Testing

The backend includes comprehensive automated tests to verify authentication functionality.

### Available Test Commands

#### 1. Run all tests in the suite
```bash
npm test
```

Includes tests for core authentication functions. This test suite:
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

#### 4. Unit Tests (Core Functionality)
```bash
npm run test:unit:functionality
```

Runs unit tests for core functionality functions. This test suite includes:

**Unit Test Files:**
- `scanner.test.js` - Scanner and nutrition calculation functions
- `insights.test.js` - Insight and analytics functions
- `nutritionPlanner.test.js` - Nutrition planner calculation functions
- `social.test.js` - Social/post utility functions
- `mealPlanning.test.js` - Meal planning utility functions

**Use this to**: Verify core business logic functions work correctly in isolation.

---

#### 5. Integration Tests
```bash
npm run test:integration
```

Runs end-to-end integration tests that verify complete workflows. This test suite includes:

**Integration Test Files:**
- `integration.mealLogging.test.js` - End-to-end meal logging and progress tracking flow
- `integration.scannerToPost.test.js` - Scanner image analysis to social post creation flow

**Use this to**: Verify that different components work together correctly in realistic scenarios.

---

#### 6. Run All Tests (Unit + Integration)
```bash
npm run test:all
```

Runs both unit tests and integration tests in a single command.

**Use this to**: Run the complete test suite for core functionality and integration workflows.

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

You can also test endpoints manually using cURL commands. **Prerequisites**: The server must be running (`npm run dev`).

#### Step-by-Step Example

**1. Start the server** (if not already running):
```bash
cd backend
npm run dev
```

The server should start on `http://localhost:3000`. Verify it's running:
```bash
curl http://localhost:3000/health
```

**2. Register a new user**:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test_user@college.harvard.edu",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "residence": "Winthrop"
  }'
```

**Required Fields**:
- `email` - Must end with `@college.harvard.edu`
- `password` - Minimum 6 characters
- `firstName` - User's first name
- `lastName` - User's last name
- `residence` - User's residence hall

**Optional Fields** (can be added to the JSON):
- `birthday`, `age`, `classYear`, `gender`, `height`, `weight`
- `activityLevel`, `dietaryPattern`, `isKosher`, `isHalal`
- `allergies` (array), `healthConditions` (array), `primaryGoal`

**Expected Response** (201):
```json
{
  "user": {
    "id": "firebase-uid",
    "email": "test@college.harvard.edu",
    "name": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "residence": "Winthrop",
    "roles": []
  }
}
```

**Common Errors**:
- `400 INVALID_INPUT` - Missing required fields (firstName, lastName, residence)
- `400 INVALID_EMAIL` - Email doesn't end with `@college.harvard.edu`
- `409 EMAIL_ALREADY_EXISTS` - Email already registered (use a different email or proceed to login)

**3. Login to get access token**:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test_user@college.harvard.edu","password":"password123"}'
```

**Expected Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "refreshToken": "AMf-vBwvLjPk...",
  "user": {
    "id": "firebase-uid",
    "email": "test_user@college.harvard.edu",
    "name": "John Doe",
    "roles": ["user"]
  }
}
```

Copy the `accessToken` value from the response.

**4. Use the access token to get current user info**:
```bash
# Replace YOUR_ACCESS_TOKEN with the actual token from step 3
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response** (200):
```json
{
  "id": "firebase-uid",
  "email": "test_user@college.harvard.edu",
  "name": "John Doe",
  "roles": ["user"]
}
```

#### Troubleshooting

- **Connection refused**: Make sure the server is running (`npm run dev`)
- **404 Not Found**: Check that you're using the correct endpoint path (`/auth/register`, `/auth/login`, `/auth/me`)
- **401 Unauthorized**: Verify the access token is correct and hasn't expired (tokens expire after 1 hour)
- **409 Conflict**: The email is already registered - use a different email or login instead
- **Invalid JSON**: Make sure quotes are properly escaped in your shell

## Support

For issues or questions, please refer to:
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

