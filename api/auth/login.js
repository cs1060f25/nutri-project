// Vercel serverless function for /auth/login
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
    'INVALID_PASSWORD': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'EMAIL_NOT_FOUND': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'auth/too-many-requests': { statusCode: 429, errorCode: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' },
    'auth/operation-not-allowed': { statusCode: 403, errorCode: 'OPERATION_NOT_ALLOWED', message: 'This operation is not allowed.' },
  };
  return errorMap[firebaseErrorCode];
};

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

// Firebase REST API function
const signInWithPassword = async (email, password) => {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Authentication failed');
  }
  
  return data;
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
    // Debug environment variables
    console.log('Environment check:');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET');
    console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET');
    console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? 'SET' : 'NOT SET');
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

  } catch (err) {
    console.error('Login error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    
    // Map Firebase error to our error format
    // Firebase REST API errors come in err.message (e.g., "INVALID_PASSWORD", "EMAIL_NOT_FOUND")
    // Firebase Admin SDK errors come in err.code (e.g., "auth/user-not-found")
    const errorKey = err.code || err.message;
    const mappedError = mapFirebaseError(errorKey);
    
    const statusCode = mappedError ? mappedError.statusCode : 500;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Internal server error';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};
