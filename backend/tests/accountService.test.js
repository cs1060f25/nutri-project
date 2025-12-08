const path = require('path');

// Mock config/firebase
jest.mock(
  path.join('..', '..', 'backend', 'src', 'config', 'firebase.js'),
  () => ({
    admin: {
      auth: jest.fn(),
      firestore: jest.fn(),
    },
  })
);

const { admin } = require(
  path.join('..', '..', 'backend', 'src', 'config', 'firebase.js')
);

const {
  changePassword,
  deleteAccount,
} = require(
  path.join('..', '..', 'backend', 'src', 'services', 'accountService.js')
);

describe('accountService', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
    process.env.FIREBASE_API_KEY = 'FAKE_API_KEY';
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  const setupAuthMock = (overrides = {}) => {
    const authInstance = {
      getUser: jest.fn().mockResolvedValue({ email: 'user@example.com' }),
      updateUser: jest.fn().mockResolvedValue({}),
      revokeRefreshTokens: jest.fn().mockResolvedValue({}),
      deleteUser: jest.fn().mockResolvedValue({}),
      ...overrides,
    };
    admin.auth.mockReturnValue(authInstance);
    return authInstance;
  };

  const setupFirestoreMockForDelete = () => {
    const deleteMock = jest.fn().mockResolvedValue({});
    const docMock = jest.fn(() => ({ delete: deleteMock }));
    const collectionMock = jest.fn(() => ({ doc: docMock }));
    const dbMock = { collection: collectionMock };
    admin.firestore.mockReturnValue(dbMock);
    return { collectionMock, docMock, deleteMock };
  };

  const setupSuccessfulPasswordVerification = () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  };

  test('changePassword throws if userId is missing', async () => {
    await expect(
      changePassword(null, 'current', 'new')
    ).rejects.toThrow('User ID is required.');
  });

  test('changePassword verifies current password and updates user', async () => {
    const authInstance = setupAuthMock();
    setupSuccessfulPasswordVerification();

    await changePassword('user123', 'oldPass', 'newPass');

    expect(admin.auth).toHaveBeenCalledTimes(2); // getUser, updateUser/revoke
    expect(authInstance.getUser).toHaveBeenCalledWith('user123');

    // Password verification via REST API
    expect(global.fetch).toHaveBeenCalledWith(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=FAKE_API_KEY',
      expect.objectContaining({
        method: 'POST',
      })
    );

    expect(authInstance.updateUser).toHaveBeenCalledWith('user123', {
      password: 'newPass',
    });
    expect(authInstance.revokeRefreshTokens).toHaveBeenCalledWith('user123');
  });

  test('changePassword propagates INVALID_PASSWORD error with code', async () => {
    setupAuthMock();

    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: { message: 'INVALID_PASSWORD' },
      }),
    });

    await expect(
      changePassword('user123', 'wrongPass', 'newPass')
    ).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
      message: 'Current password is incorrect.',
    });
  });

  test('deleteAccount deletes profile doc and auth user', async () => {
    const authInstance = setupAuthMock();
    const { collectionMock, docMock, deleteMock } =
      setupFirestoreMockForDelete();
    setupSuccessfulPasswordVerification();

    await deleteAccount('user123', 'currentPass');

    expect(authInstance.getUser).toHaveBeenCalledWith('user123');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(docMock).toHaveBeenCalledWith('user123');
    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(authInstance.deleteUser).toHaveBeenCalledWith('user123');
  });

  test('deleteAccount throws if userId is missing', async () => {
    await expect(
      deleteAccount(null, 'password')
    ).rejects.toThrow('User ID is required.');
  });
});
