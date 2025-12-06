const { admin } = require('../config/firebase');
const { FIREBASE_API_KEY } = process.env;

/**
 * Helper to get a fetch implementation.
 * If you're on Node 18+, global fetch exists.
 * If not, install node-fetch and swap implementation.
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
 * This prevents changing/deleting an account without the correct password.
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

  // If we get here, password is correct.
  return true;
}

/**
 * Change user password (after verifying current password).
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

  await verifyCurrentPassword(email, currentPassword);

  await admin.auth().updateUser(userId, {
    password: newPassword,
  });

  // Optional: revoke refresh tokens so old sessions are logged out
  await admin.auth().revokeRefreshTokens(userId);
}

/**
 * Delete the user account and related data after verifying password.
 * NOTE: the Firestore deletion below only removes the main user document.
 * You should extend this to delete posts, meal logs, etc.
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

  await verifyCurrentPassword(email, password);

  const db = admin.firestore();

  // Delete the user profile document
  const userDocRef = db.collection('users').doc(userId);
  await userDocRef.delete();

  // TODO: delete related user data here (posts, meal logs, etc.)
  // Example (if you have mealLogs collection keyed by userId):
  // const logsSnapshot = await db.collection('mealLogs').where('userId', '==', userId).get();
  // const batch = db.batch();
  // logsSnapshot.forEach((doc) => batch.delete(doc.ref));
  // await batch.commit();

  // Finally, delete the auth user
  await admin.auth().deleteUser(userId);
}

module.exports = {
  changePassword,
  deleteAccount,
};
