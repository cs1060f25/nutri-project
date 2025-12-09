const path = require('path');

describe('profileService', () => {
  let originalFetch;
  let originalWindow;
  let originalLocalStorage;
  let originalSessionStorage;

  beforeAll(() => {
    originalFetch = global.fetch;
    originalWindow = global.window;
    originalLocalStorage = global.localStorage;
    originalSessionStorage = global.sessionStorage;

    // Simple in-memory storage mocks
    const storageFactory = () => {
      const store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, val) => {
          store[key] = String(val);
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach((k) => delete store[k]);
        }),
      };
    };

    global.localStorage = storageFactory();
    global.sessionStorage = storageFactory();
    global.window = { location: { href: '' } };
  });

  afterAll(() => {
    global.fetch = originalFetch;
    global.window = originalWindow;
    global.localStorage = originalLocalStorage;
    global.sessionStorage = originalSessionStorage;
  });

  beforeEach(() => {
    jest.resetModules(); // ensure a fresh copy of profileService each test
    global.fetch = jest.fn();
    global.localStorage.clear();
    global.sessionStorage.clear();
  });

  const importService = () =>
    require(
      path.join('..', '..', 'frontend', 'src', 'services', 'profileService.js')
    );

  test('getUserProfile returns profile on 200 OK', async () => {
    const fakeProfile = { firstName: 'Ada' };

    // Pretend we have an access token in localStorage
    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    global.fetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ profile: fakeProfile }),
    });

    const { getUserProfile } = importService();
    const profile = await getUserProfile();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    // Default API_BASE in tests -> http://localhost:3000
    expect(url).toBe('http://localhost:3000/api/profile');
    expect(options.headers.Authorization).toBe('Bearer ACCESS_TOKEN');
    expect(profile).toEqual(fakeProfile);
  });

  test('getUserProfile returns null on 404', async () => {
    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    global.fetch.mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: { message: 'Profile not found' } }),
    });

    const { getUserProfile } = importService();
    const profile = await getUserProfile();

    expect(profile).toBeNull();
  });

  test('getUserProfile throws on non-OK non-404', async () => {
    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    global.fetch.mockResolvedValue({
      status: 500,
      ok: false,
      json: async () => ({ error: { message: 'Server exploded' } }),
    });

    const { getUserProfile } = importService();
    await expect(getUserProfile()).rejects.toThrow('Server exploded');
  });

  test('updateUserProfile sends PUT with JSON body and returns updated profile', async () => {
    const profileUpdates = { firstName: 'Grace', lastName: 'Hopper' };
    const updatedProfile = { ...profileUpdates, email: 'grace@example.com' };

    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ profile: updatedProfile }),
    });

    const { updateUserProfile } = importService();
    const result = await updateUserProfile(profileUpdates);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/profile');
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers.Authorization).toBe('Bearer ACCESS_TOKEN');
    expect(JSON.parse(options.body)).toEqual(profileUpdates);
    expect(result).toEqual(updatedProfile);
  });

  test('changePassword calls correct endpoint and returns data', async () => {
    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    const responsePayload = { message: 'Password changed successfully.' };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => responsePayload,
    });

    const { changePassword } = importService();
    const result = await changePassword({
      currentPassword: 'oldPass',
      newPassword: 'newPass',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toBe('http://localhost:3000/api/account/change-password');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({
      currentPassword: 'oldPass',
      newPassword: 'newPass',
    });
    expect(result).toEqual(responsePayload);
  });

  test('deleteAccount calls correct endpoint and returns data', async () => {
    global.localStorage.getItem.mockImplementation((key) =>
      key === 'accessToken' ? 'ACCESS_TOKEN' : null
    );

    const responsePayload = { message: 'Account deleted successfully.' };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => responsePayload,
    });

    const { deleteAccount } = importService();
    const result = await deleteAccount({ password: 'secret' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];

    expect(url).toBe('http://localhost:3000/api/account/delete-account');
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ password: 'secret' });
    expect(result).toEqual(responsePayload);
  });
});
