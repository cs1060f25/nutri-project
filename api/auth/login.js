// Vercel serverless function for /auth/login
const { admin } = require('../../backend/src/config/firebase');
const { mapFirebaseError, createErrorResponse } = require('../../backend/src/utils/errorMapper');
const { signInWithPassword } = require('../../backend/src/services/firebaseAuthService');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        firstName: customClaims.firstName || null,
        lastName: customClaims.lastName || null,
        residence: customClaims.residence || null,
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
