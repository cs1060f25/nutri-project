// Vercel serverless function for /auth/*
// Handles all auth operations in a single function
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
    'INVALID_LOGIN_CREDENTIALS': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'EMAIL_NOT_FOUND': { statusCode: 401, errorCode: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' },
    'auth/too-many-requests': { statusCode: 429, errorCode: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' },
    'TOO_MANY_ATTEMPTS_TRY_LATER': { statusCode: 429, errorCode: 'TOO_MANY_REQUESTS', message: 'Too many requests. Please try again later.' },
    'auth/operation-not-allowed': { statusCode: 403, errorCode: 'OPERATION_NOT_ALLOWED', message: 'This operation is not allowed.' },
    'TOKEN_EXPIRED': { statusCode: 401, errorCode: 'INVALID_REFRESH', message: 'Refresh token has expired.' },
    'INVALID_REFRESH_TOKEN': { statusCode: 401, errorCode: 'INVALID_REFRESH', message: 'Invalid refresh token.' },
    'USER_NOT_FOUND': { statusCode: 401, errorCode: 'INVALID_REFRESH', message: 'User not found.' },
    'auth/id-token-expired': { statusCode: 401, errorCode: 'INVALID_TOKEN', message: 'Token has expired.' },
    'auth/argument-error': { statusCode: 401, errorCode: 'INVALID_TOKEN', message: 'Invalid token format.' },
  };
  return errorMap[firebaseErrorCode];
};

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

// Firebase REST API function for sign in
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

// Firebase REST API function for token refresh
const refreshIdToken = async (refreshToken) => {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${process.env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Token refresh failed');
  }
  
  return {
    idToken: data.id_token,
    refreshToken: data.refresh_token
  };
};

// Parse URL to extract path
const parsePath = (url) => {
  const urlObj = new URL(url, 'http://localhost');
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  // Remove 'auth' to get the operation
  return pathParts[pathParts.length - 1]; // Get last segment (login, register, etc.)
};

// Handler for /auth/login
const handleLogin = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Environment check:');
    console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET');
    console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET');
    console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET');
    console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? 'SET' : 'NOT SET');
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
      );
    }

    const authResult = await signInWithPassword(email, password);
    const userRecord = await admin.auth().getUser(authResult.localId);
    const customClaims = userRecord.customClaims || {};
    const roles = customClaims.roles || [];

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
    
    const errorKey = err.code || err.message;
    console.error('Error key being mapped:', errorKey);
    
    const mappedError = mapFirebaseError(errorKey);
    console.error('Mapped error result:', mappedError);
    
    const statusCode = mappedError ? mappedError.statusCode : 500;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Internal server error';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};

// Handler for /auth/register
const handleRegister = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, residence } = req.body;

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

    const displayName = `${firstName} ${lastName}`;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: false,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, {
      firstName,
      lastName,
      residence,
      roles: []
    });

    console.log('✅ User created successfully:', userRecord.uid);

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
    
    const mappedError = mapFirebaseError(err.code);
    const statusCode = mappedError ? mappedError.statusCode : 500;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Internal server error';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};

// Handler for /auth/logout
const handleLogout = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Authorization token required.')
      );
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

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

// Handler for /auth/me
const handleMe = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Authorization token required.')
      );
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;

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

    const mappedError = mapFirebaseError(error.code);
    const statusCode = mappedError ? mappedError.statusCode : 401;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Authentication error';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};

// Handler for /auth/refresh
const handleRefresh = async (req, res) => {
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

    const result = await refreshIdToken(refreshToken);

    return res.status(200).json({
      accessToken: result.idToken,
      refreshToken: result.refreshToken,
    });

  } catch (error) {
    console.error('Refresh token error:', error.message);

    const mappedError = mapFirebaseError(error.message);
    const statusCode = mappedError ? mappedError.statusCode : 401;
    const errorCode = mappedError ? mappedError.errorCode : 'INVALID_REFRESH';
    const message = mappedError ? mappedError.message : 'Token refresh failed';
    
    return res.status(statusCode).json(
      createErrorResponse(errorCode, message)
    );
  }
};

// Main handler
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parse the URL to determine the operation
    const operation = parsePath(req.url);
    
    // Route to appropriate handler
    switch (operation) {
      case 'login':
        return await handleLogin(req, res);
      case 'register':
        return await handleRegister(req, res);
      case 'logout':
        return await handleLogout(req, res);
      case 'me':
        return await handleMe(req, res);
      case 'refresh':
        return await handleRefresh(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json(createErrorResponse('INTERNAL', 'Internal server error'));
  }
};

