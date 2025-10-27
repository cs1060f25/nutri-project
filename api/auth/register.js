// Vercel serverless function for /auth/register
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// Error mapping function
const mapFirebaseError = (firebaseErrorCode) => {
  const errorMap = {
    'auth/invalid-email': { statusCode: 400, errorCode: 'INVALID_EMAIL', message: 'The email address is not valid.' },
    'auth/weak-password': { statusCode: 400, errorCode: 'WEAK_PASSWORD', message: 'The password is too weak.' },
    'auth/email-already-exists': { statusCode: 409, errorCode: 'EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists.' },
    'auth/user-not-found': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'auth/wrong-password': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'auth/invalid-credential': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'auth/too-many-requests': { statusCode: 429, errorCode: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' },
    'auth/operation-not-allowed': { statusCode: 403, errorCode: 'OPERATION_NOT_ALLOWED', message: 'This operation is not allowed.' },
  };
  return errorMap[firebaseErrorCode];
};

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

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

  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    
    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(err.code);
    const statusCode = mappedError ? mappedError.statusCode : 500;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Internal server error';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};
