const { admin } = require('../config/firebase');
const { mapFirebaseError, createErrorResponse } = require('../utils/errorMapper');
const { signInWithPassword, refreshIdToken } = require('../services/firebaseAuthService');
const { createUserProfile } = require('../services/userProfileService');
const { sendPasswordResetEmail } = require('../services/emailService');

/**
 * POST /auth/register
 * Register a new user with email and password
 */
const register = async (req, res) => {
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

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
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
    const customClaims = {
      firstName,
      lastName,
      residence,
      roles: []
    };
    await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);

    // Build profile data with all fields
    const profileData = {
      email: userRecord.email,
      firstName,
      lastName,
      residence,
    };

    // Add optional fields if provided
    if (birthday) profileData.birthday = birthday;
    if (age) profileData.age = parseInt(age); // Store calculated age as well for convenience
    if (classYear) profileData.classYear = classYear;
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
    await createUserProfile(userRecord.uid, profileData);

    console.log('✅ User created successfully:', userRecord.uid);
    console.log('   Name:', displayName);
    console.log('   Residence:', residence);

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

/**
 * POST /auth/login
 * Login with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json(
        createErrorResponse('INVALID_EMAIL', 'Email and password are required.')
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

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
const refresh = async (req, res) => {
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

/**
 * POST /auth/logout
 * Revoke all refresh tokens for the user (global sign-out)
 */
const logout = async (req, res) => {
  try {
    // Get user ID from the verified token (set by authMiddleware)
    const uid = req.user.uid;

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

/**
 * GET /auth/me
 * Get current user info from token
 */
const getCurrentUser = async (req, res) => {
  try {
    // User info is already attached by authMiddleware
    const uid = req.user.uid;

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

    return res.status(500).json(
      createErrorResponse('INTERNAL', 'An error occurred while fetching user data.')
    );
  }
};

/**
 * POST /auth/reset-password
 * Request password reset - generates a temporary reset token
 */
const resetPassword = async (req, res) => {
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
        message: 'If an account exists with this email, a reset token has been generated.',
        resetToken: null, // Don't return token if user doesn't exist
      });
    }

    // Generate a secure random token
    const crypto = require('crypto');
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

    // Get frontend URL from request headers or environment variable
    const frontendUrl = process.env.FRONTEND_URL || 
                       req.headers.origin || 
                       req.headers.referer?.split('/').slice(0, 3).join('/') ||
                       'http://localhost:3001';

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
      // In development, optionally include the token for testing
      ...(process.env.NODE_ENV !== 'production' && { resetToken: resetToken }),
    });

  } catch (error) {
    console.error('Password reset error:', error.code, error.message);

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};

/**
 * POST /auth/confirm-reset-password
 * Confirm password reset with token and set new password
 */
const confirmResetPassword = async (req, res) => {
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
      // Delete expired token
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

    // Map Firebase error to our error format
    const mappedError = mapFirebaseError(error.code);
    return res.status(mappedError.statusCode).json(
      createErrorResponse(mappedError.errorCode, mappedError.message)
    );
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  resetPassword,
  confirmResetPassword,
};
