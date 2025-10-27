// Vercel serverless function for /auth/logout
const { admin } = require('../../backend/src/config/firebase');
const { mapFirebaseError, createErrorResponse } = require('../../backend/src/utils/errorMapper');

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
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Authorization token required.')
      );
    }

    const token = authHeader.split(' ')[1];

    // Verify the token to get user ID
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

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
