const { admin } = require('../config/firebase');
const { mapFirebaseError, createErrorResponse } = require('../utils/errorMapper');
const { signInWithPassword, refreshIdToken } = require('../services/firebaseAuthService');

/**
 * POST /auth/register
 * Register a new user with email and password
 */
const register = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
      );
    }

    // Create user with Firebase Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });

    console.log('✅ User created successfully:', userRecord.uid);

    // Return 201 with no body (as per spec)
    // Or optionally return user info
    return res.status(201).json({
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || null,
        roles: [],
      },
    });

  } catch (error) {
    console.error('Registration error:', error.code, error.message);

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};

/**
 * POST /auth/login
 * Login with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
      );
    }

    // Sign in using Firebase REST API
    const authResult = await signInWithPassword(email, password);

    // Get user details and custom claims from Firebase Admin
    const userRecord = await admin.auth().getUser(authResult.localId);
    const customClaims = userRecord.customClaims || {};
    const roles = customClaims.roles || [];

    // Return tokens and user info
    return res.status(200).json({
      accessToken: authResult.idToken,
      refreshToken: authResult.refreshToken,
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName || null,
        roles: roles,
      },
    });

  } catch (error) {
    console.error('Login error:', error.message);

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.message);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json(
        createErrorResponse('INVALID_REFRESH', 'Refresh token is required.')
      );
    }

    // Refresh the ID token using Firebase REST API
    const result = await refreshIdToken(refreshToken);

    // Return new access token and optionally new refresh token (rotation)
    return res.status(200).json({
      accessToken: result.idToken,
      refreshToken: result.refreshToken, // New refresh token for rotation
    });

  } catch (error) {
    console.error('Refresh token error:', error.message);

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.message);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};

/**
 * POST /auth/logout
 * Revoke all refresh tokens for the user (global sign-out)
 */
const logout = async (req, res) => {
  try {
    // Get user ID from the verified token (set by authMiddleware)
    const uid = req.user.uid;

    // Revoke all refresh tokens for this user
    await admin.auth().revokeRefreshTokens(uid);

    console.log('✅ Refresh tokens revoked for user:', uid);

    return res.status(200).json({
      status: 'ok',
    });

  } catch (error) {
    console.error('Logout error:', error.code, error.message);

    return res.status(500).json(
      createErrorResponse('INTERNAL', 'An error occurred during logout.')
    );
  }
};

/**
 * GET /auth/me
 * Get current user info from token
 */
const getCurrentUser = async (req, res) => {
  try {
    // User info is already attached by authMiddleware
    const uid = req.user.uid;

    // Get fresh user data from Firebase
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};
    const roles = customClaims.roles || [];

    return res.status(200).json({
      id: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || null,
      roles: roles,
    });

  } catch (error) {
    console.error('Get current user error:', error.code, error.message);

    return res.status(500).json(
      createErrorResponse('INTERNAL', 'An error occurred while fetching user data.')
    );
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
};

