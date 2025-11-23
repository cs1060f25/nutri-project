/**
 * Service for managing dining hall follows in Firestore
 */

const { admin } = require('../config/firebase');

const DINING_HALL_FOLLOWS_COLLECTION = 'diningHallFollows';

const getDb = () => admin.firestore();

/**
 * Follow a dining hall
 */
const followDiningHall = async (userId, locationId, locationName) => {
  if (!userId || !locationId || !locationName) {
    throw new Error('userId, locationId, and locationName are required');
  }

  const db = getDb();

  // Check if already following (use both locationId and locationName to uniquely identify)
  const existingFollow = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .where('locationId', '==', locationId)
    .where('locationName', '==', locationName)
    .get();

  if (!existingFollow.empty) {
    throw new Error('Already following this dining hall');
  }

  // Create follow relationship
  const followRef = await db.collection(DINING_HALL_FOLLOWS_COLLECTION).add({
    userId,
    locationId,
    locationName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const followDoc = await followRef.get();
  const followData = followDoc.data();

  return {
    id: followDoc.id,
    ...followData,
    createdAt: followData.createdAt?.toDate(),
  };
};

/**
 * Unfollow a dining hall
 */
const unfollowDiningHall = async (userId, locationId, locationName) => {
  const db = getDb();

  // Find the follow relationship (use both locationId and locationName to uniquely identify)
  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .where('locationId', '==', locationId)
    .where('locationName', '==', locationName)
    .get();

  if (follows.empty) {
    throw new Error('Not following this dining hall');
  }

  // Delete all follow relationships (should only be one)
  const deletePromises = follows.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);

  return { success: true, message: 'Unfollowed dining hall successfully' };
};

/**
 * Get all dining halls a user is following
 */
const getFollowedDiningHalls = async (userId) => {
  const db = getDb();

  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .get();

  const diningHalls = [];
  follows.forEach(doc => {
    const data = doc.data();
    diningHalls.push({
      id: doc.id,
      locationId: data.locationId,
      locationName: data.locationName,
      createdAt: data.createdAt?.toDate(),
    });
  });

  return diningHalls.sort((a, b) => a.locationName.localeCompare(b.locationName));
};

/**
 * Check if user is following a dining hall
 */
const isFollowingDiningHall = async (userId, locationId, locationName) => {
  const db = getDb();

  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .where('locationId', '==', locationId)
    .where('locationName', '==', locationName)
    .limit(1)
    .get();

  return !follows.empty;
};

/**
 * Get all users following a specific dining hall
 */
const getDiningHallFollowers = async (locationId) => {
  const db = getDb();

  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('locationId', '==', locationId)
    .get();

  return follows.size;
};

module.exports = {
  followDiningHall,
  unfollowDiningHall,
  getFollowedDiningHalls,
  isFollowingDiningHall,
  getDiningHallFollowers,
};

