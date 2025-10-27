/**
 * Unit tests for authController domain validation
 */

jest.mock('../services/firebaseAuthService', () => ({
  signInWithPassword: jest.fn(),
  refreshIdToken: jest.fn(),
}));

jest.mock('../services/userProfileService', () => ({
  createUserProfile: jest.fn(),
}));

const authController = require('../controllers/authController');
const { signInWithPassword } = require('../services/firebaseAuthService');
const { createUserProfile } = require('../services/userProfileService');

// Mock Firebase admin
jest.mock('../config/firebase', () => {
  const auth = {
    createUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    getUser: jest.fn(),
    revokeRefreshTokens: jest.fn(),
  };
  return {
    admin: {
      auth: () => auth,
    },
    __mockAuth: auth,
  };
});

const { __mockAuth } = require('../config/firebase');

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('authController email domain validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects registration with non-harvard email', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User',
        residence: 'Adams House',
      },
    };
    const res = createMockResponse();

    await authController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_EMAIL',
        }),
      })
    );
    expect(__mockAuth.createUser).not.toHaveBeenCalled();
  });

  it('rejects login with non-harvard email', async () => {
    const req = {
      body: {
        email: 'user@example.com',
        password: 'Password123!',
      },
    };
    const res = createMockResponse();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_EMAIL',
        }),
      })
    );
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
