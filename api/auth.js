// Vercel serverless function for /auth/*
// Handles all auth operations in a single function
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

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
  try {
    // Handle both absolute and relative URLs
    const urlString = url.startsWith('http') ? url : `http://localhost${url}`;
    const urlObj = new URL(urlString);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    // Get last segment (login, register, reset-password, confirm-reset-password, etc.)
    const operation = pathParts[pathParts.length - 1];
    console.log('Parsed path:', url, '->', operation);
    return operation;
  } catch (error) {
    console.error('Error parsing path:', url, error);
    // Fallback: try to extract from pathname directly
    const match = url.match(/\/([^/?]+)(?:\?|$)/);
    return match ? match[1] : null;
  }
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
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      residence,
      // Additional profile fields
      birthday,
      age,
      classYear,
      gender,
      height,
      weight,
      activityLevel,
      dietaryPattern,
      isKosher,
      isHalal,
      allergies,
      healthConditions,
      primaryGoal
    } = req.body;

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

    // Build profile data with all fields
    const profileData = {
      email: userRecord.email,
      firstName,
      lastName,
      residence,
    };

    // Add optional fields if provided
    if (birthday) profileData.birthday = birthday;
    if (age) profileData.age = parseInt(age);
    // Save classYear even if it's an empty string (to distinguish from undefined)
    if (classYear !== undefined && classYear !== null && classYear !== '') {
      profileData.classYear = String(classYear).trim();
    }
    if (gender) profileData.gender = gender;
    if (height) profileData.height = height;
    if (weight) profileData.weight = parseFloat(weight);
    if (activityLevel) profileData.activityLevel = activityLevel;
    if (dietaryPattern) profileData.dietaryPattern = dietaryPattern;
    if (isKosher !== undefined) profileData.isKosher = Boolean(isKosher);
    if (isHalal !== undefined) profileData.isHalal = Boolean(isHalal);
    if (allergies && Array.isArray(allergies)) profileData.allergies = allergies;
    if (healthConditions && Array.isArray(healthConditions)) profileData.healthConditions = healthConditions;
    if (primaryGoal) profileData.primaryGoal = primaryGoal;

    // Persist profile document in Firestore
    const db = admin.firestore();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const profileRef = db.collection('users').doc(userRecord.uid);
    
    await profileRef.set({
      ...profileData,
      createdAt: timestamp,
      updatedAt: timestamp,
    }, { merge: false });

    console.log('✅ User created successfully:', userRecord.uid);
    console.log('✅ Profile saved to Firestore with fields:', Object.keys(profileData));

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

// Email service for password reset
const sendPasswordResetEmail = async (to, resetToken, frontendUrl) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;
      console.log('\n📧 Email not configured. Password reset link:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(resetLink);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return { success: true, sent: false };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to,
      subject: 'Reset Your Password - HUDS Nutrition Analyzer',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #1a5f3f; margin-bottom: 10px; }
            .button { display: inline-block; padding: 14px 28px; background-color: #1a5f3f; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background-color: #2d6a4f; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #718096; text-align: center; }
            .link { color: #1a5f3f; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">HUDS Nutrition Analyzer</div>
            </div>
            <h2>Reset Your Password</h2>
            <p>You requested to reset your password for your HUDS Nutrition Analyzer account.</p>
            <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button" style="color: #ffffff !important; text-decoration: none;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="${resetLink}" class="link">${resetLink}</a></p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <div class="footer">
              <p>This email was sent by HUDS Nutrition Analyzer</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Reset Your Password - HUDS Nutrition Analyzer\n\nYou requested to reset your password. Click this link (expires in 15 minutes):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, sent: false, error: error.message };
  }
};

// Handler for /auth/reset-password
const handleResetPassword = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email is required.')
      );
    }

    // Check if user exists
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      // If user not found, still return success (security: don't reveal if email exists)
      return res.status(200).json({
        message: 'If an account exists with this email, a password reset link has been sent.',
        emailSent: false,
      });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Store token in Firestore with 15-minute expiry
    const db = admin.firestore();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    await db.collection('passwordResets').doc(resetToken).set({
      email: email,
      uid: userRecord.uid,
      expiresAt: expiresAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      used: false,
    });

    // Get frontend URL from environment variable
    const frontendUrl = process.env.FRONTEND_URL || 
                       req.headers.origin || 
                       req.headers.referer?.split('/').slice(0, 3).join('/') ||
                       'https://your-app.vercel.app';

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(email, resetToken, frontendUrl);

    console.log('✅ Password reset token generated for:', email);
    if (emailResult.sent) {
      console.log('✅ Password reset email sent successfully');
    } else {
      console.log('⚠️ Password reset email not sent (SMTP not configured or error occurred)');
    }

    return res.status(200).json({
      message: 'If an account exists with this email, a password reset link has been sent.',
      emailSent: emailResult.sent,
    });

  } catch (error) {
    console.error('Password reset error:', error.code, error.message);
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError?.statusCode || 500).json(
      createErrorResponse(mappedError?.errorCode || 'INTERNAL', mappedError?.message || 'An error occurred.')
    );
  }
};

// Handler for /auth/confirm-reset-password
const handleConfirmResetPassword = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'Email, reset token, and new password are required.')
      );
    }

    if (newPassword.length < 6) {
      return res.status(400).json(
        createErrorResponse('WEAK_PASSWORD', 'Password must be at least 6 characters.')
      );
    }

    // Validate token from Firestore
    const db = admin.firestore();
    const tokenDoc = await db.collection('passwordResets').doc(resetToken).get();

    if (!tokenDoc.exists) {
      return res.status(400).json(
        createErrorResponse('INVALID_TOKEN', 'Invalid or expired reset token.')
      );
    }

    const tokenData = tokenDoc.data();

    // Check if token is expired
    if (tokenData.expiresAt.toDate() < new Date()) {
      await db.collection('passwordResets').doc(resetToken).delete();
      return res.status(400).json(
        createErrorResponse('EXPIRED_TOKEN', 'Reset token has expired. Please request a new one.')
      );
    }

    // Check if token has been used
    if (tokenData.used) {
      return res.status(400).json(
        createErrorResponse('USED_TOKEN', 'This reset token has already been used.')
      );
    }

    // Verify email matches
    if (tokenData.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email does not match the reset token.')
      );
    }

    // Update password using Firebase Admin SDK
    await admin.auth().updateUser(tokenData.uid, {
      password: newPassword,
    });

    // Mark token as used
    await db.collection('passwordResets').doc(resetToken).update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Password reset successful for:', email);

    return res.status(200).json({
      message: 'Password has been reset successfully.',
    });

  } catch (error) {
    console.error('Confirm password reset error:', error.code, error.message);
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError?.statusCode || 500).json(
      createErrorResponse(mappedError?.errorCode || 'INTERNAL', mappedError?.message || 'An error occurred.')
    );
  }
};

// Handler for /auth/check-email
const handleCheckEmail = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email is required.')
      );
    }

    const allowedDomain = '@college.harvard.edu';
    if (!email.toLowerCase().endsWith(allowedDomain)) {
      return res.status(400).json(
        createErrorResponse(
          'INVALID_EMAIL',
          `Email must end with ${allowedDomain}`
        )
      );
    }

    try {
      await admin.auth().getUserByEmail(email);
      // If we get here, the user exists
      return res.status(200).json({ exists: true });
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // User doesn't exist, which is what we want for registration
        return res.status(200).json({ exists: false });
      }
      throw error;
    }
  } catch (error) {
    console.error('Check email error:', error.code, error.message);
    const mappedError = mapFirebaseError(error.code);
    const statusCode = mappedError ? mappedError.statusCode : 500;
    const errorCode = mappedError ? mappedError.errorCode : 'INTERNAL';
    const message = mappedError ? mappedError.message : 'Internal server error';
    
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
      case 'check-email':
        return await handleCheckEmail(req, res);
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
      case 'reset-password':
        return await handleResetPassword(req, res);
      case 'confirm-reset-password':
        return await handleConfirmResetPassword(req, res);
      default:
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json(createErrorResponse('INTERNAL', 'Internal server error'));
  }
};

