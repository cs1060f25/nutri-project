/**
 * Unit tests for accountController
 */

jest.mock('../services/accountService', () => ({
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock('../utils/errorMapper', () => ({
  createErrorResponse: (code, message) => ({ code, message }),
}));

const {
  changePassword,
  deleteAccount,
} = require('../services/accountService');

const {
  changePasswordController,
  deleteAccountController,
} = require('../controllers/accountController');

const createMockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('accountController.changePasswordController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 if user is not authenticated', async () => {
    const req = { user: null, body: {} };
    const res = createMockRes();

    await changePasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated.',
    });
  });

  test('returns 400 if required fields are missing', async () => {
    const req = { user: { uid: 'user123' }, body: { currentPassword: '' } };
    const res = createMockRes();

    await changePasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID_ARGUMENT',
      message: 'currentPassword and newPassword are required.',
    });
  });

  test('calls changePassword service and returns 200 on success', async () => {
    const req = {
      user: { uid: 'user123' },
      body: { currentPassword: 'old', newPassword: 'new' },
    };
    const res = createMockRes();

    changePassword.mockResolvedValue(undefined);

    await changePasswordController(req, res);

    expect(changePassword).toHaveBeenCalledWith(
      'user123',
      'old',
      'new'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Password changed successfully.',
    });
  });
});

describe('accountController.deleteAccountController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 if user is not authenticated', async () => {
    const req = { user: null, body: {} };
    const res = createMockRes();

    await deleteAccountController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      code: 'UNAUTHORIZED',
      message: 'User is not authenticated.',
    });
  });

  test('returns 400 if password is missing', async () => {
    const req = { user: { uid: 'user123' }, body: {} };
    const res = createMockRes();

    await deleteAccountController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID_ARGUMENT',
      message: 'Password is required to delete account.',
    });
  });

  test('calls deleteAccount service and returns 200 on success', async () => {
    const req = { user: { uid: 'user123' }, body: { password: 'secret' } };
    const res = createMockRes();

    deleteAccount.mockResolvedValue(undefined);

    await deleteAccountController(req, res);

    expect(deleteAccount).toHaveBeenCalledWith('user123', 'secret');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Account deleted successfully.',
    });
  });
});
