const request = require('supertest');
const app = require('../../backend/src/app');

// Mock auth middleware to always inject a user
jest.mock('../../backend/src/middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { uid: 'test-user-id' };
    next();
  },
}));

// Mock userProfileService to avoid hitting Firestore
jest.mock('../../backend/src/services/userProfileService', () => {
  return {
    getUserProfile: jest.fn(async (userId) => {
      if (userId === 'missing-user') return null;
      return {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };
    }),
    updateUserProfile: jest.fn(),
    buildProfilePayload: jest.requireActual(
      '../../backend/src/services/userProfileService'
    ).buildProfilePayload,
  };
});

const { getUserProfile } = require('../../backend/src/services/userProfileService');

describe('GET /api/profile', () => {
  test('returns 200 and profile for authenticated user', async () => {
    // ensure mock is used
    getUserProfile.mockResolvedValueOnce({
      email: 'settings@example.com',
      firstName: 'Settings',
      lastName: 'User',
    });

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer TEST_TOKEN');

    expect(res.status).toBe(200);
    expect(res.body.profile).toEqual({
      email: 'settings@example.com',
      firstName: 'Settings',
      lastName: 'User',
    });
  });

  test('returns 404 when profile does not exist', async () => {
    getUserProfile.mockResolvedValueOnce(null);

    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer TEST_TOKEN');

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
