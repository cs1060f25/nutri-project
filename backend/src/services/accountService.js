const { admin } = require('../config/firebase');

const USERS_COLLECTION = 'users';
const getDb = () => admin.firestore();

const { FIREBASE_API_KEY } = process.env;

/**
 * Helper to call fetch; Node 18+ has global fetch.
 * If you're on Node < 18, install node-fetch and swap in that implementation.
 */
async function doFetch(url, options) {
  if (typeof fetch !== 'undefined') {
    return fetch(url, options);
  }

  // For Node < 18, uncomment after installing node-fetch:
  // const { default: nodeFetch } = await import('node-fetch');
  // return nodeFetch(url, options);

  throw new Error(
    'No fetch implementation available. Use Node 18+ or install node-fetch.'
  );
}

/**
 * Verify the user's current password using Firebase Auth REST API.
 * This is required before allowing password change or account deletion.
 */
async function verifyCurrentPassword(email, currentPassword) {
  if (!FIREBASE_API_KEY) {
    throw new Error(
      'FIREBASE_API_KEY is not set. Cannot verify password on the server.'
    );
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;

  const response = await doFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: currentPassword,
      returnSecureToken: false,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data.error?.message === 'INVALID_PASSWORD'
        ? 'Current password is incorrect.'
        : data.error?.message || 'Failed to verify current password.';
    const err = new Error(message);
    err.code = 'INVALID_PASSWORD';
    throw err;
  }

  // If we get here, the password is correct.
  return true;
}

/**
 * Change user password after verifying current password.
 */
async function changePassword(userId, currentPassword, newPassword) {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const userRecord = await admin.auth().getUser(userId);
  const email = userRecord.email;

  if (!email) {
    throw new Error('User does not have an email associated.');
  }

  // Verify the current password
  await verifyCurrentPassword(email, currentPassword);

  // Update password in Firebase Auth
  await admin.auth().updateUser(userId, {
    password: newPassword,
  });

  // Optional but recommended: revoke existing refresh tokens so old sessions are invalid
  await admin.auth().revokeRefreshTokens(userId);
}

/**
 * Delete the user account and related data after verifying password.
 */
async function deleteAccount(userId, password) {
  if (!userId) {
    throw new Error('User ID is required.');
  }

  const userRecord = await admin.auth().getUser(userId);
  const email = userRecord.email;

  if (!email) {
    throw new Error('User does not have an email associated.');
  }

  // Verify the password before deletion
  await verifyCurrentPassword(email, password);

  const db = getDb();

  // Delete the user profile document
  const userDocRef = db.collection(USERS_COLLECTION).doc(userId);
  await userDocRef.delete();

  // TODO: delete related user data here (meal logs, posts, plans, etc.)
  // Example structure if you had a "meals" collection:
  // const mealsSnapshot = await db.collection('meals').where('userId', '==', userId).get();
  // const batch = db.batch();
  // mealsSnapshot.forEach((doc) => batch.delete(doc.ref));
  // await batch.commit();

  // Finally, delete the auth user
  await admin.auth().deleteUser(userId);
}

module.exports = {
  changePassword,
  deleteAccount,
};
