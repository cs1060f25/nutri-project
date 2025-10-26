const axios = require('axios');
const { FIREBASE_WEB_API_KEY } = require('../config/firebase');

/**
 * Sign in with email and password using Firebase REST API
 * Returns idToken, refreshToken, and user info
 */
const signInWithPassword = async (email, password) => {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;

  try {
    const response = await axios.post(url, {
      email,
      password,
      returnSecureToken: true,
    });

    return {
      idToken: response.data.idToken,
      refreshToken: response.data.refreshToken,
      localId: response.data.localId,
      email: response.data.email,
      expiresIn: response.data.expiresIn,
    };
  } catch (error) {
    // Extract Firebase error code from response
    const errorCode = error.response?.data?.error?.message || 'INTERNAL';
    throw new Error(errorCode);
  }
};

/**
 * Refresh ID token using refresh token via Firebase REST API
 */
const refreshIdToken = async (refreshToken) => {
  const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_WEB_API_KEY}`;

  try {
    const response = await axios.post(url, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    return {
      idToken: response.data.id_token,
      refreshToken: response.data.refresh_token, // New refresh token (rotation)
      expiresIn: response.data.expires_in,
    };
  } catch (error) {
    // Extract error code
    const errorCode = error.response?.data?.error?.message || 'INVALID_REFRESH_TOKEN';
    throw new Error(errorCode);
  }
};

module.exports = {
  signInWithPassword,
  refreshIdToken,
};

