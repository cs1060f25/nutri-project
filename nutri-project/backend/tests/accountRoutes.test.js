const request = require('supertest');
const app = require('../../backend/src/app');

// Mock auth middleware
jest.mock('../../backend/src/middleware/authMiddleware', () => ({
  verifyToken: (req, res, next) => {
    req.user = { uid: 'test-user-id' };
    next();
  },
}));

// Mock accountService so we don't hit Firebase Auth
jest.mock('../../backend/src/services/accountService', () => ({
  changePassword: jest.fn(async (userId, current, next) => {
    if (current !== 'correct-password') {
      const err = new Error('Current password is incorrect.');
      err.code = 'INVALID_PASSWORD';
      throw err;
    }
    return;
  }),
  deleteAccount: jest.fn(),
}));

const { changePassword } = require('../../backend/src/services/accountService');

describe('POST /api/account/change-password', () => {
  test('returns 200 when current password is correct', async () => {
    const res = await request(app)
      .post('/api/account/change-password')
      .set('Authorization', 'Bearer TEST_TOKEN')
      .send({
        currentPassword: 'correct-password',
        newPassword: 'new-strong-password',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password changed successfully.');
    expect(changePassword).toHaveBeenCalledWith(
      'test-user-id',
      'correct-password',
      'new-strong-password'
    );
  });

  test('returns 400 when current password is incorrect', async () => {
    const res = await request(app)
      .post('/api/account/change-password')
      .set('Authorization', 'Bearer TEST_TOKEN')
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'new-strong-password',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
