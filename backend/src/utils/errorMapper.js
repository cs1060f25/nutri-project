/**
 * Maps Firebase error codes to deterministic REST API error codes
 * @param {string} firebaseErrorCode - Firebase error code (e.g., 'auth/email-already-exists')
 * @returns {Object} - { statusCode, errorCode, message }
 */
const mapFirebaseError = (firebaseErrorCode) => {
  const errorMap = {
    // 400 - Bad Request
    'auth/invalid-email': {
      statusCode: 400,
      errorCode: 'INVALID_EMAIL',
      message: 'The email address is not valid.',
    },
    'auth/weak-password': {
      statusCode: 400,
      errorCode: 'WEAK_PASSWORD',
      message: 'The password is too weak. It must be at least 6 characters.',
    },
    'auth/invalid-password': {
      statusCode: 400,
      errorCode: 'WEAK_PASSWORD',
      message: 'The password is too weak. It must be at least 6 characters.',
    },
    'auth/missing-email': {
      statusCode: 400,
      errorCode: 'INVALID_EMAIL',
      message: 'Email is required.',
    },
    'auth/missing-password': {
      statusCode: 400,
      errorCode: 'WEAK_PASSWORD',
      message: 'Password is required.',
    },

    // 401 - Unauthorized
    'auth/user-not-found': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },
    'auth/wrong-password': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },
    'INVALID_PASSWORD': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },
    'INVALID_LOGIN_CREDENTIALS': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },
    'EMAIL_NOT_FOUND': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },
    'auth/id-token-expired': {
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      message: 'The access token has expired.',
    },
    'auth/argument-error': {
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid or missing token.',
    },
    'auth/invalid-id-token': {
      statusCode: 401,
      errorCode: 'INVALID_TOKEN',
      message: 'The access token is invalid.',
    },
    'INVALID_REFRESH_TOKEN': {
      statusCode: 401,
      errorCode: 'INVALID_REFRESH',
      message: 'The refresh token is invalid or has been revoked.',
    },
    'TOKEN_EXPIRED': {
      statusCode: 401,
      errorCode: 'INVALID_REFRESH',
      message: 'The refresh token has expired.',
    },
    'USER_NOT_FOUND': {
      statusCode: 401,
      errorCode: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    },

    // 409 - Conflict
    'auth/email-already-exists': {
      statusCode: 409,
      errorCode: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists.',
    },
    'EMAIL_EXISTS': {
      statusCode: 409,
      errorCode: 'EMAIL_ALREADY_EXISTS',
      message: 'An account with this email already exists.',
    },

    // 423 - Locked
    'auth/user-disabled': {
      statusCode: 423,
      errorCode: 'ACCOUNT_LOCKED',
      message: 'This account has been disabled.',
    },

    // 429 - Too Many Requests
    'auth/too-many-requests': {
      statusCode: 429,
      errorCode: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
    },
    'TOO_MANY_ATTEMPTS_TRY_LATER': {
      statusCode: 429,
      errorCode: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
    },
  };

  // Return mapped error or default 500
  return errorMap[firebaseErrorCode] || {
    statusCode: 500,
    errorCode: 'INTERNAL',
    message: 'An internal error occurred.',
  };
};

/**
 * Creates a standardized error response
 * @param {string} errorCode - Custom error code
 * @param {string} message - Error message
 * @returns {Object} - Standardized error object
 */
const createErrorResponse = (errorCode, message) => {
  return {
    error: {
      code: errorCode,
      message: message,
    },
  };
};

module.exports = {
  mapFirebaseError,
  createErrorResponse,
};

