/**
 * Unit tests for userProfileService.
 */

jest.mock('../config/firebase', () => {
  const mockDocRef = {
    set: jest.fn(),
    get: jest.fn(),
  };

  const mockCollection = {
    doc: jest.fn(() => mockDocRef),
  };

  const mockFirestore = {
    collection: jest.fn(() => mockCollection),
  };

  const firestore = jest.fn(() => mockFirestore);
  firestore.FieldValue = {
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  };

  return {
    admin: {
      firestore,
    },
    __mockDocRef: mockDocRef,
    __mockCollection: mockCollection,
    __mockFirestore: mockFirestore,
  };
});

const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} = require('../services/userProfileService');
const {
  admin,
  __mockDocRef: mockDocRef,
  __mockCollection: mockCollection,
  __mockFirestore: mockFirestore,
} = require('../config/firebase');

describe('userProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserProfile', () => {
    it('stores the expected payload in Firestore', async () => {
      mockDocRef.set.mockResolvedValueOnce();

      await createUserProfile('user-1', {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        residence: 'Adams House',
      });

      expect(mockFirestore.collection).toHaveBeenCalledWith('users');
      expect(mockCollection.doc).toHaveBeenCalledWith('user-1');
      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          residence: 'Adams House',
          createdAt: 'SERVER_TIMESTAMP',
          updatedAt: 'SERVER_TIMESTAMP',
        }),
        { merge: false }
      );
    });

    it('throws if userId is missing', async () => {
      await expect(createUserProfile('', {})).rejects.toThrow(
        'User id is required to create a profile'
      );
      expect(mockCollection.doc).not.toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('returns null when no document exists', async () => {
      mockDocRef.get.mockResolvedValueOnce({ exists: false });

      const result = await getUserProfile('missing-user');
      expect(result).toBeNull();
    });

    it('returns document data when found', async () => {
      const data = { email: 'test@example.com' };
      mockDocRef.get.mockResolvedValueOnce({
        exists: true,
        data: () => data,
      });

      const result = await getUserProfile('user-2');
      expect(result).toEqual(data);
    });
  });

  describe('updateUserProfile', () => {
    it('merges updates and returns the latest doc', async () => {
      mockDocRef.set.mockResolvedValueOnce();
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          email: 'test@example.com',
          firstName: 'Updated',
          updatedAt: 'SERVER_TIMESTAMP',
        }),
      });

      const result = await updateUserProfile('user-3', {
        firstName: 'Updated',
      });

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Updated',
          updatedAt: 'SERVER_TIMESTAMP',
        }),
        { merge: true }
      );
      expect(result).toEqual({
        email: 'test@example.com',
        firstName: 'Updated',
        updatedAt: 'SERVER_TIMESTAMP',
      });
    });

    it('preserves existing fields when not supplied in updates', async () => {
      mockDocRef.set.mockResolvedValueOnce();
      mockDocRef.get.mockResolvedValueOnce({
        data: () => ({
          email: 'test@example.com',
          firstName: 'Existing',
          lastName: 'User',
          residence: 'Lowell House',
          updatedAt: 'SERVER_TIMESTAMP',
        }),
      });

      const result = await updateUserProfile('user-4', {
        residence: 'Lowell House',
      });

      expect(mockDocRef.set).toHaveBeenCalledWith(
        expect.objectContaining({
          residence: 'Lowell House',
          updatedAt: 'SERVER_TIMESTAMP',
        }),
        { merge: true }
      );
      expect(result).toEqual({
        email: 'test@example.com',
        firstName: 'Existing',
        lastName: 'User',
        residence: 'Lowell House',
        updatedAt: 'SERVER_TIMESTAMP',
      });
    });
  });
});
