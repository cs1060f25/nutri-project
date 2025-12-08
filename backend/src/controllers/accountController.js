const { changePassword, deleteAccount } = require('../services/accountService');
const { createErrorResponse } = require('../utils/errorMapper');

/**
 * POST /api/account/change-password
 * Body: { currentPassword, newPassword }
 */
const changePasswordController = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { currentPassword, newPassword } = req.body || {};

    if (!userId) {
      return res
        .status(401)
        .json(createErrorResponse('UNAUTHORIZED', 'User is not authenticated.'));
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            'INVALID_ARGUMENT',
            'currentPassword and newPassword are required.'
          )
        );
    }

    await changePassword(userId, currentPassword, newPassword);

    return res.status(200).json({
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('Error changing password:', error);

    if (error.code === 'INVALID_PASSWORD') {
      return res
        .status(400)
        .json(createErrorResponse('INVALID_ARGUMENT', error.message));
    }

    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to change password.'));
  }
};

/**
 * POST /api/account/delete-account
 * Body: { password }
 */
const deleteAccountController = async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { password } = req.body || {};

    if (!userId) {
      return res
        .status(401)
        .json(createErrorResponse('UNAUTHORIZED', 'User is not authenticated.'));
    }

    if (!password) {
      return res
        .status(400)
        .json(
          createErrorResponse(
            'INVALID_ARGUMENT',
            'Password is required to delete account.'
          )
        );
    }

    await deleteAccount(userId, password);

    return res.status(200).json({
      message: 'Account deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting account:', error);

    if (error.code === 'INVALID_PASSWORD') {
      return res
        .status(400)
        .json(createErrorResponse('INVALID_ARGUMENT', error.message));
    }

    return res
      .status(500)
      .json(createErrorResponse('INTERNAL', 'Failed to delete account.'));
  }
};

module.exports = {
  changePasswordController,
  deleteAccountController,
};
