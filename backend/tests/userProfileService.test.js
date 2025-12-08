const path = require('path');

// Mock config/firebase so userProfileService can import it
jest.mock(
  path.join('..', '..', 'backend', 'src', 'config', 'firebase.js'),
  () => ({
    admin: {
      firestore: jest.fn(),
    },
  })
);

const { admin } = require(
  path.join('..', '..', 'backend', 'src', 'config', 'firebase.js')
);

const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} = require(
  path.join('..', '..', 'backend', 'src', 'services', 'userProfileService.js')
);

describe('userProfileService', () => {
  let collectionMock;
  let docMock;
  let setMock;
  let getMock;

  beforeEach(() => {
    collectionMock = jest.fn();
    docMock = jest.fn();
    setMock = jest.fn();
    getMock = jest.fn();

    const dbMock = {
      collection: collectionMock,
    };

    collectionMock.mockReturnValue({ doc: docMock });
    docMock.mockReturnValue({ set: setMock, get: getMock });

    admin.firestore.mockReturnValue(dbMock);

    // Mock FieldValue.serverTimestamp
    admin.firestore.FieldValue = {
      serverTimestamp: jest.fn(() => 'TS'),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createUserProfile throws if userId is missing', async () => {
    await expect(createUserProfile(null, {})).rejects.toThrow(
      'User id is required to create a profile'
    );
  });

  test('createUserProfile writes profile with timestamps', async () => {
    const userId = 'user123';
    const profileData = {
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      residence: 'House A',
    };

    await createUserProfile(userId, profileData);

    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(docMock).toHaveBeenCalledWith(userId);
    expect(setMock).toHaveBeenCalledTimes(1);

    const [payload, options] = setMock.mock.calls[0];
    expect(payload).toMatchObject({
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      residence: 'House A',
      createdAt: 'TS',
      updatedAt: 'TS',
    });
    expect(options).toEqual({ merge: false });
  });

  test('getUserProfile returns null if document does not exist', async () => {
    const userId = 'user123';

    getMock.mockResolvedValue({
      exists: false,
      data: () => ({ email: 'test@example.com' }),
    });

    const profile = await getUserProfile(userId);
    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(docMock).toHaveBeenCalledWith(userId);
    expect(profile).toBeNull();
  });

  test('getUserProfile returns data when document exists', async () => {
    const userId = 'user123';

    const data = { email: 'test@example.com', firstName: 'Test' };
    getMock.mockResolvedValue({
      exists: true,
      data: () => data,
    });

    const profile = await getUserProfile(userId);
    expect(profile).toEqual(data);
  });

  test('updateUserProfile merges updates and returns updated data', async () => {
    const userId = 'user123';
    const updates = {
      firstName: 'Updated',
      weight: 70,
    };

    const updatedData = {
      email: 'test@example.com',
      firstName: 'Updated',
      weight: 70,
    };

    setMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({
      data: () => updatedData,
    });

    const result = await updateUserProfile(userId, updates);

    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(docMock).toHaveBeenCalledWith(userId);
    expect(setMock).toHaveBeenCalledTimes(1);

    const [payload, options] = setMock.mock.calls[0];

    expect(payload).toMatchObject({
      firstName: 'Updated',
      weight: 70,
      updatedAt: 'TS',
    });
    expect(options).toEqual({ merge: true });
    expect(result).toEqual(updatedData);
  });
});
