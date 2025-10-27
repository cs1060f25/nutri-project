/**
 * Service for managing user profile documents in Firestore.
 */

const { admin } = require('../config/firebase');

const USERS_COLLECTION = 'users';
const getDb = () => admin.firestore();

/**
 * Build the canonical profile payload we store for each user.
 */
const buildProfilePayload = ({ email, firstName, lastName, residence }) => ({
  email: email || null,
  firstName: firstName || null,
  lastName: lastName || null,
  residence: residence || null,
});

/**
 * Create or overwrite the profile document for a user when they register.
 */
const createUserProfile = async (userId, profileData) => {
  if (!userId) {
    throw new Error('User id is required to create a profile');
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const docRef = getDb().collection(USERS_COLLECTION).doc(userId);
  const payload = {
    ...buildProfilePayload(profileData || {}),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await docRef.set(payload, { merge: false });
  return payload;
};

/**
 * Fetch the profile document for a user.
 */
const getUserProfile = async (userId) => {
  if (!userId) {
    throw new Error('User id is required to fetch a profile');
  }

  const doc = await getDb().collection(USERS_COLLECTION).doc(userId).get();
  if (!doc.exists) {
    return null;
  }

  return doc.data();
};

/**
 * Update the profile document by merging provided fields.
 */
const updateUserProfile = async (userId, updates = {}) => {
  if (!userId) {
    throw new Error('User id is required to update a profile');
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const docRef = getDb().collection(USERS_COLLECTION).doc(userId);
  const payload = {
    ...buildProfilePayload(updates),
    updatedAt: timestamp,
  };

  await docRef.set(payload, { merge: true });
  const updatedDoc = await docRef.get();
  return updatedDoc.data();
};

module.exports = {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
};
