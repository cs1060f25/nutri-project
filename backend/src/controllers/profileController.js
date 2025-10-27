const { createErrorResponse } = require('../utils/errorMapper');
const { getUserProfile, updateUserProfile } = require('../services/userProfileService');

/**
 * GET /api/profile
 * Fetch the authenticated user's profile.
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const profile = await getUserProfile(userId);

    if (!profile) {
      return res
        .status(404)
        .json(createErrorResponse('PROFILE_NOT_FOUND', 'Profile not found.'));
    }

    return res.status(200).json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to load profile.'));
  }
};

/**
 * PUT /api/profile
 * Update fields on the authenticated user's profile.
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const profile = await updateUserProfile(userId, req.body || {});

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to update profile.'));
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
