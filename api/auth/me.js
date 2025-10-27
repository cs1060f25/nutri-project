// Vercel serverless function for /auth/me
const { admin } = require('../../backend/src/config/firebase');
const { mapFirebaseError, createErrorResponse } = require('../../backend/src/utils/errorMapper');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
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

    // Verify the token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get fresh user data from Firebase
    const userRecord = await admin.auth().getUser(uid);
    const customClaims = userRecord.customClaims || {};
    const roles = customClaims.roles || [];

    return res.status(200).json({
      id: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName || null,
      firstName: customClaims.firstName || null,
      lastName: customClaims.lastName || null,
      residence: customClaims.residence || null,
      roles: roles,
    });

  } catch (error) {
    console.error('Get current user error:', error.code, error.message);

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};
