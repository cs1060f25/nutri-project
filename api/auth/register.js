// Vercel serverless function for /auth/register
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
    const { email, password, firstName, lastName, residence } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
      );
    }

    if (!firstName || !lastName || !residence) {
      return res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'First name, last name, and residence are required.')
      );
    }

    // Create display name from first and last name
    const displayName = `${firstName} ${lastName}`;

    // Create user with Firebase Admin SDK
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    // Store additional user info in custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      firstName,
      lastName,
      residence,
      roles: []
    });

    console.log('✅ User created successfully:', userRecord.uid);

    // Return 201 with user info
    return res.status(201).json({
      user: {
        id: userRecord.uid,
        email: userRecord.email,
        name: displayName,
        firstName,
        lastName,
        residence,
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
