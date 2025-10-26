const { admin } = require('../config/firebase');
const { createErrorResponse } = require('../utils/errorMapper');

/**
 * Middleware to verify Firebase ID token
 * Attaches decoded user to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.')
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.')
      );
    }

    // Verify the ID token with Firebase Admin SDK
    // checkRevoked: true ensures tokens revoked via revokeRefreshTokens are rejected
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    // Attach user info to request
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error.code, error.message);

    // Map Firebase error to our error format
    let errorCode = 'INVALID_TOKEN';
    let message = 'The access token is invalid.';

    if (error.code === 'auth/id-token-expired') {
      message = 'The access token has expired.';
    } else if (error.code === 'auth/id-token-revoked') {
      message = 'The access token has been revoked.';
    }

    return res.status(401).json(createErrorResponse(errorCode, message));
  }
};

module.exports = {
  verifyToken,
};

