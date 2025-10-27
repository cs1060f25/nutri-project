/**
 * Comprehensive Unit Tests for Authentication Service
 * Tests: firebaseAuthService, authController, authMiddleware, errorMapper
 */

const axios = require('axios');
const { signInWithPassword, refreshIdToken } = require('../services/firebaseAuthService');
const { mapFirebaseError, createErrorResponse } = require('../utils/errorMapper');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  register,
  login,
  refresh,
  logout,
  getCurrentUser,
  resetPassword,
} = require('../controllers/authController');

// Mock dependencies
jest.mock('axios');

// Create persistent mock functions
const mockCreateUser = jest.fn();
const mockSetCustomUserClaims = jest.fn();
const mockGetUser = jest.fn();
const mockVerifyIdToken = jest.fn();
const mockRevokeRefreshTokens = jest.fn();
const mockGeneratePasswordResetLink = jest.fn();

jest.mock('../config/firebase', () => ({
  admin: {
    auth: () => ({
      createUser: mockCreateUser,
      setCustomUserClaims: mockSetCustomUserClaims,
      getUser: mockGetUser,
      verifyIdToken: mockVerifyIdToken,
      revokeRefreshTokens: mockRevokeRefreshTokens,
      generatePasswordResetLink: mockGeneratePasswordResetLink,
    }),
  },
  FIREBASE_WEB_API_KEY: 'test-api-key',
}));

const { admin } = require('../config/firebase');

describe('Firebase Auth Service', () => {
  describe('signInWithPassword', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully sign in with valid credentials', async () => {
      const mockResponse = {
        data: {
          idToken: 'test-id-token',
          refreshToken: 'test-refresh-token',
          localId: 'test-user-id',
          email: 'test@example.com',
          expiresIn: '3600',
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await signInWithPassword('test@example.com', 'password123');

      expect(result).toEqual({
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        localId: 'test-user-id',
        email: 'test@example.com',
        expiresIn: '3600',
      });
    });

    it('should throw INVALID_PASSWORD error for wrong password', async () => {
      axios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'INVALID_PASSWORD',
            },
          },
        },
      });

      await expect(signInWithPassword('test@example.com', 'wrongpassword')).rejects.toThrow('INVALID_PASSWORD');
    });

    it('should throw EMAIL_NOT_FOUND error for non-existent user', async () => {
      axios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'EMAIL_NOT_FOUND',
            },
          },
        },
      });

      await expect(signInWithPassword('nonexistent@example.com', 'password123')).rejects.toThrow('EMAIL_NOT_FOUND');
    });
  });

  describe('refreshIdToken', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should successfully refresh token', async () => {
      const mockResponse = {
        data: {
          id_token: 'new-id-token',
          refresh_token: 'new-refresh-token',
          expires_in: '3600',
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const result = await refreshIdToken('old-refresh-token');

      expect(result).toEqual({
        idToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '3600',
      });
    });

    it('should throw INVALID_REFRESH_TOKEN for invalid token', async () => {
      axios.post.mockRejectedValue({
        response: {
          data: {
            error: {
              message: 'INVALID_REFRESH_TOKEN',
            },
          },
        },
      });

      await expect(refreshIdToken('invalid-token')).rejects.toThrow('INVALID_REFRESH_TOKEN');
    });
  });
});

describe('Error Mapper', () => {
  describe('mapFirebaseError', () => {
    it('should map auth/invalid-email to 400 INVALID_EMAIL', () => {
      const result = mapFirebaseError('auth/invalid-email');
      expect(result.statusCode).toBe(400);
      expect(result.errorCode).toBe('INVALID_EMAIL');
      expect(result.message).toContain('email');
    });

    it('should map INVALID_PASSWORD to 401 INVALID_CREDENTIALS', () => {
      const result = mapFirebaseError('INVALID_PASSWORD');
      expect(result.statusCode).toBe(401);
      expect(result.errorCode).toBe('INVALID_CREDENTIALS');
    });

    it('should map auth/email-already-exists to 409 EMAIL_ALREADY_EXISTS', () => {
      const result = mapFirebaseError('auth/email-already-exists');
      expect(result.statusCode).toBe(409);
      expect(result.errorCode).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should return default 500 INTERNAL for unmapped errors', () => {
      const result = mapFirebaseError('UNKNOWN_ERROR');
      expect(result.statusCode).toBe(500);
      expect(result.errorCode).toBe('INTERNAL');
    });
  });

  describe('createErrorResponse', () => {
    it('should create standardized error response', () => {
      const result = createErrorResponse('TEST_ERROR', 'Test error message');
      expect(result).toEqual({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      });
    });
  });
});

describe('Auth Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {
      body: {},
      headers: {},
      user: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        residence: 'New York',
      };

      const mockUserRecord = {
        uid: 'test-uid',
        email: 'newuser@example.com',
        displayName: 'John Doe',
      };

      mockCreateUser.mockResolvedValue(mockUserRecord);
      mockSetCustomUserClaims.mockResolvedValue();

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        user: expect.objectContaining({
          id: 'test-uid',
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
        }),
      });
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = {
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        residence: 'New York',
      };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_EMAIL',
          message: 'Email and password are required.',
        },
      });
    });

    it('should return 409 when email already exists', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        residence: 'New York',
      };

      const error = new Error('Email already exists');
      error.code = 'auth/email-already-exists';
      mockCreateUser.mockRejectedValue(error);

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists.',
        },
      });
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResult = {
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        localId: 'test-uid',
      };

      const mockUserRecord = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        customClaims: {
          firstName: 'Test',
          lastName: 'User',
          residence: 'Test City',
          roles: ['user'],
        },
      };

      axios.post.mockResolvedValue({ data: mockAuthResult });
      mockGetUser.mockResolvedValue(mockUserRecord);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        user: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
        }),
      });
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const error = {
        response: {
          data: {
            error: {
              message: 'INVALID_PASSWORD',
            },
          },
        },
      };
      axios.post.mockRejectedValue(error);

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email or password is incorrect.',
        },
      });
    });
  });

  describe('refresh', () => {
    it('should successfully refresh token', async () => {
      mockReq.body = {
        refreshToken: 'old-refresh-token',
      };

      const mockResult = {
        data: {
          id_token: 'new-id-token',
          refresh_token: 'new-refresh-token',
          expires_in: '3600',
        },
      };

      axios.post.mockResolvedValue(mockResult);

      await refresh(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: 'new-id-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should return 401 when refresh token is missing', async () => {
      mockReq.body = {};

      await refresh(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockReq.user = { uid: 'test-uid' };

      mockRevokeRefreshTokens.mockResolvedValue();

      await logout(mockReq, mockRes);

      expect(mockRevokeRefreshTokens).toHaveBeenCalledWith('test-uid');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCurrentUser', () => {
    it('should successfully get current user info', async () => {
      mockReq.user = { uid: 'test-uid' };

      const mockUserRecord = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        customClaims: {
          firstName: 'Test',
          lastName: 'User',
          residence: 'Test City',
          roles: ['user'],
        },
      };

      mockGetUser.mockResolvedValue(mockUserRecord);

      await getCurrentUser(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully generate password reset link', async () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      const mockResetLink = 'https://example.com/reset?token=abc123';
      mockGeneratePasswordResetLink.mockResolvedValue(mockResetLink);

      await resetPassword(mockReq, mockRes);

      expect(mockGeneratePasswordResetLink).toHaveBeenCalledWith('test@example.com');
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when email is missing', async () => {
      mockReq.body = {};

      await resetPassword(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should successfully verify valid token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';

      const mockDecodedToken = {
        uid: 'test-uid',
        email: 'test@example.com',
      };

      mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockDecodedToken);
    });

    it('should return 401 when Authorization header is missing', async () => {
      mockReq.headers = {};

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for expired token', async () => {
      mockReq.headers.authorization = 'Bearer expired-token';

      const error = new Error('Token expired');
      error.code = 'auth/id-token-expired';
      mockVerifyIdToken.mockRejectedValue(error);

      await verifyToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

