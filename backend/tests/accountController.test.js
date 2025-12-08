const path = require('path');

jest.mock(
  path.join('..', '..', 'backend', 'src', 'services', 'accountService.js'),
  () => ({
    changePassword: jest.fn(),
    deleteAccount: jest.fn(),
  })
);

jest.mock(
  path.join('..', '..', 'backend', 'src', 'utils', 'errorMapper.js'),
  () => ({
    createErrorResponse: (code, message) => ({ code, message }),
  })
);

const {
  changePassword,
  deleteAccount,
} = require(
  path.join('..', '..', 'backend', 'src', 'services', 'accountService.js')
);

const {
  changePasswordController,
  deleteAccountController,
} = require(
  path.join('..', '..', 'backend', 'src', 'controllers', 'accountController.js')
);

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

  test('returns 400 when service throws INVALID_PASSWORD error', async () => {
    const req = {
      user: { uid: 'user123' },
      body: { currentPassword: 'wrong', newPassword: 'new' },
    };
    const res = createMockRes();

    const error = new Error('Current password is incorrect.');
    error.code = 'INVALID_PASSWORD';
    changePassword.mockRejectedValue(error);

    await changePasswordController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID_ARGUMENT',
      message: 'Current password is incorrect.',
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

  test('returns 400 when service throws INVALID_PASSWORD error', async () => {
    const req = { user: { uid: 'user123' }, body: { password: 'wrong' } };
    const res = createMockRes();

    const error = new Error('Current password is incorrect.');
    error.code = 'INVALID_PASSWORD';
    deleteAccount.mockRejectedValue(error);

    await deleteAccountController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      code: 'INVALID_ARGUMENT',
      message: 'Current password is incorrect.',
    });
  });
});
