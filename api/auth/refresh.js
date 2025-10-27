// Vercel serverless function for /auth/refresh
const { mapFirebaseError, createErrorResponse } = require('../../backend/src/utils/errorMapper');
const { refreshIdToken } = require('../../backend/src/services/firebaseAuthService');

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
