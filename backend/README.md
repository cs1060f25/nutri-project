# Nutri Auth Backend

A secure authentication service built with Express.js and Firebase Auth, following deterministic REST API contracts.

## Features

- ✅ Email/Password authentication via Firebase Auth
- ✅ Secure password hashing (scrypt)
- ✅ JWT-based access tokens (1-hour expiry)
- ✅ Refresh token rotation
- ✅ Token revocation support
- ✅ Role-based access control via custom claims
- ✅ Breach protection & email throttling
- ✅ Deterministic error codes
- ✅ Multi-client support

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

### 2. Firebase Configuration

#### Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Authentication** → **Email/Password** sign-in method

#### Get Service Account Credentials

1. In Firebase Console, go to **Project Settings** → **Service Accounts**
2. Click **Generate New Private Key**
3. Save the JSON file securely (do NOT commit to git)

#### Get Web API Key

1. In Firebase Console, go to **Project Settings** → **General**
2. Copy the **Web API Key** from your web app configuration

### 3. Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_WEB_API_KEY=your-web-api-key

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Important**: 
- Replace `your-project-id`, `your-service-account-email`, `FIREBASE_PRIVATE_KEY`, and `FIREBASE_WEB_API_KEY` with your actual Firebase credentials
- Keep the quotes around `FIREBASE_PRIVATE_KEY` and ensure `\n` characters are preserved
- Never commit the `.env` file to version control

### 4. Run the Server

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

## Managing User Roles

Roles are stored as Firebase custom claims. To assign roles to users:

```javascript
const admin = require('firebase-admin');

// Set custom claims for a user
await admin.auth().setCustomUserClaims(uid, {
  roles: ['user', 'admin']
});
```

Roles will automatically be included in:
- Login response
- `/auth/me` response
- JWT token claims

## Security Best Practices

1. **Environment Variables**: Never commit `.env` or service account keys
2. **HTTPS**: Use HTTPS in production (TLS termination via Cloud Run/Load Balancer)
3. **CORS**: Configure CORS to allow only trusted origins
4. **Rate Limiting**: Firebase automatically throttles failed login attempts
5. **Token Expiry**: Access tokens expire after 1 hour
6. **Revocation**: Use `/auth/logout` to revoke all user sessions

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

### Deploy to Firebase Functions (2nd Gen)

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Initialize: `firebase init functions`
3. Deploy: `firebase deploy --only functions`

## Testing

### Example: Register and Login

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

## Support

For issues or questions, please refer to:
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## License

ISC

