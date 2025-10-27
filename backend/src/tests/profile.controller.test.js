/**
 * Unit tests for profileController.
 */

jest.mock('../services/userProfileService', () => ({
  getUserProfile: jest.fn(),
  updateUserProfile: jest.fn(),
}));

const profileController = require('../controllers/profileController');
const profileService = require('../services/userProfileService');

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('profileController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns profile when found', async () => {
      const profile = { email: 'test@example.com' };
      profileService.getUserProfile.mockResolvedValueOnce(profile);

      const req = { user: { uid: 'user-1' } };
      const res = createMockResponse();

      await profileController.getProfile(req, res);

      expect(profileService.getUserProfile).toHaveBeenCalledWith('user-1');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ profile });
    });

    it('returns 404 when profile missing', async () => {
      profileService.getUserProfile.mockResolvedValueOnce(null);

      const req = { user: { uid: 'missing' } };
      const res = createMockResponse();

      await profileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'PROFILE_NOT_FOUND' }),
        })
      );
    });

    it('returns 500 when service throws', async () => {
      profileService.getUserProfile.mockRejectedValueOnce(new Error('boom'));

      const req = { user: { uid: 'user-error' } };
      const res = createMockResponse();

      await profileController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INTERNAL' }),
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('updates profile via service', async () => {
      const updated = { firstName: 'Updated' };
      profileService.updateUserProfile.mockResolvedValueOnce(updated);

      const req = { user: { uid: 'user-2' }, body: { firstName: 'Updated' } };
      const res = createMockResponse();

      await profileController.updateProfile(req, res);

      expect(profileService.updateUserProfile).toHaveBeenCalledWith('user-2', {
        firstName: 'Updated',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Profile updated successfully',
        profile: updated,
      });
    });

    it('returns 500 when update fails', async () => {
      profileService.updateUserProfile.mockRejectedValueOnce(new Error('nope'));

      const req = { user: { uid: 'user-err' }, body: { residence: 'Lowell' } };
      const res = createMockResponse();

      await profileController.updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'INTERNAL' }),
        })
      );
    });
  });
});
