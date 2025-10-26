# Authentication Tests

This folder contains all tests for the authentication service.

## Test Files

### Unit Tests

- **`test-syntax.js`** - Validates file structure and syntax
- **`test-functions.js`** - Tests core functions and module structure

### Integration Tests

- **`test-full-auth.sh`** - Complete authentication flow test
  - Registration
  - Login
  - Get current user
  - Token refresh
  - Logout
  - Token revocation

- **`test-endpoints.sh`** - Full API endpoint testing with error scenarios

## Running Tests

```bash
# All tests (structure + functions)
npm test

# Syntax validation
npm run test:syntax

# Full authentication flow
npm run test:auth

# API endpoint tests
npm run test:api
```

## Test Results

All tests should pass with ✅ marks:

```
📊 Test Results:
  ✅ Passed: 14
  ❌ Failed: 0
```

## Prerequisites

- Server must be running (`npm start` or `npm run dev`)
- Firebase credentials configured in `.env`
- Identity Toolkit API enabled
- Service account has necessary permissions

## Troubleshooting

If tests fail:

1. **Check server is running**: `curl http://localhost:3000/health`
2. **Verify credentials**: `npm run check`
3. **Check Firebase console**: https://console.firebase.google.com/
4. **View server logs**: Check terminal where `npm start` is running

