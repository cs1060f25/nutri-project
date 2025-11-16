/**
 * Service for managing friend relationships and friend requests in Firestore
 */

const { admin } = require('../config/firebase');

const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';
const FRIENDS_COLLECTION = 'friends';

const getDb = () => admin.firestore();

/**
 * Send a friend request from one user to another
 */
const sendFriendRequest = async (fromUserId, toUserId) => {
  if (fromUserId === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const db = getDb();

  // Check if users exist
  const fromUserRef = db.collection(USERS_COLLECTION).doc(fromUserId);
  const toUserRef = db.collection(USERS_COLLECTION).doc(toUserId);
  
  const [fromUser, toUser] = await Promise.all([
    fromUserRef.get(),
    toUserRef.get()
  ]);

  if (!fromUser.exists) {
    throw new Error('Sender user not found');
  }
  if (!toUser.exists) {
    throw new Error('Recipient user not found');
  }

  // Check if already friends
  const existingFriendship = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', fromUserId)
    .get();

  const isAlreadyFriend = existingFriendship.docs.some(doc => {
    const data = doc.data();
    return data.users.includes(toUserId);
  });

  if (isAlreadyFriend) {
    throw new Error('Users are already friends');
  }

  // Check if there's already a pending request
  const existingRequest = await db
    .collection(FRIEND_REQUESTS_COLLECTION)
    .where('fromUserId', '==', fromUserId)
    .where('toUserId', '==', toUserId)
    .where('status', '==', 'pending')
    .get();

  if (!existingRequest.empty) {
    throw new Error('Friend request already sent');
  }

  // Check if there's a reverse pending request
  const reverseRequest = await db
    .collection(FRIEND_REQUESTS_COLLECTION)
    .where('fromUserId', '==', toUserId)
    .where('toUserId', '==', fromUserId)
    .where('status', '==', 'pending')
    .get();

  if (!reverseRequest.empty) {
    throw new Error('There is already a pending friend request from this user');
  }

  // Get user info for the request
  const fromUserData = fromUser.data();
  const toUserData = toUser.data();

  // Create friend request
  const requestRef = await db.collection(FRIEND_REQUESTS_COLLECTION).add({
    fromUserId,
    toUserId,
    fromUserName: `${fromUserData.firstName} ${fromUserData.lastName}`,
    fromUserEmail: fromUserData.email,
    toUserName: `${toUserData.firstName} ${toUserData.lastName}`,
    toUserEmail: toUserData.email,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const requestDoc = await requestRef.get();
  const requestData = requestDoc.data();

  return {
    id: requestDoc.id,
    ...requestData,
    createdAt: requestData.createdAt?.toDate(),
    updatedAt: requestData.updatedAt?.toDate(),
  };
};

/**
 * Accept a friend request
 */
const acceptFriendRequest = async (requestId, userId) => {
  const db = getDb();
  const requestRef = db.collection(FRIEND_REQUESTS_COLLECTION).doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const requestData = requestDoc.data();

  // Verify the user is the recipient
  if (requestData.toUserId !== userId) {
    throw new Error('Unauthorized: You can only accept requests sent to you');
  }

  if (requestData.status !== 'pending') {
    throw new Error('Friend request is not pending');
  }

  // Update request status
  await requestRef.update({
    status: 'accepted',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Create friendship (bidirectional)
  const friendship = {
    users: [requestData.fromUserId, requestData.toUserId].sort(),
    user1Id: requestData.fromUserId,
    user2Id: requestData.toUserId,
    user1Name: requestData.fromUserName,
    user2Name: requestData.toUserName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection(FRIENDS_COLLECTION).add(friendship);

  // Get updated request
  const updatedRequestDoc = await requestRef.get();
  const updatedRequestData = updatedRequestDoc.data();

  return {
    id: updatedRequestDoc.id,
    ...updatedRequestData,
    createdAt: updatedRequestData.createdAt?.toDate(),
    updatedAt: updatedRequestData.updatedAt?.toDate(),
  };
};

/**
 * Reject a friend request
 */
const rejectFriendRequest = async (requestId, userId) => {
  const db = getDb();
  const requestRef = db.collection(FRIEND_REQUESTS_COLLECTION).doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const requestData = requestDoc.data();

  // Verify the user is the recipient
  if (requestData.toUserId !== userId) {
    throw new Error('Unauthorized: You can only reject requests sent to you');
  }

  if (requestData.status !== 'pending') {
    throw new Error('Friend request is not pending');
  }

  // Update request status
  await requestRef.update({
    status: 'rejected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updatedRequestDoc = await requestRef.get();
  const updatedRequestData = updatedRequestDoc.data();

  return {
    id: updatedRequestDoc.id,
    ...updatedRequestData,
    createdAt: updatedRequestData.createdAt?.toDate(),
    updatedAt: updatedRequestData.updatedAt?.toDate(),
  };
};

/**
 * Get friend requests for a user (sent and received)
 */
const getFriendRequests = async (userId, type = 'all') => {
  const db = getDb();
  let query;

  if (type === 'sent') {
    query = db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('fromUserId', '==', userId)
      .where('status', '==', 'pending');
  } else if (type === 'received') {
    query = db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending');
  } else {
    // Get all pending requests involving this user
    const sentQuery = db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('fromUserId', '==', userId)
      .where('status', '==', 'pending');
    
    const receivedQuery = db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending');

    const [sentSnapshot, receivedSnapshot] = await Promise.all([
      sentQuery.get(),
      receivedQuery.get()
    ]);

    const requests = [];
    sentSnapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        type: 'sent',
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });
    receivedSnapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data(),
        type: 'received',
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });

    return requests.sort((a, b) => b.createdAt - a.createdAt);
  }

  const snapshot = await query.get();
  const requests = [];

  snapshot.forEach(doc => {
    requests.push({
      id: doc.id,
      ...doc.data(),
      type: type,
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  return requests.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Get all friends for a user
 */
const getFriends = async (userId) => {
  const db = getDb();
  
  // Find all friendships where this user is involved
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', userId)
    .get();

  const friends = [];
  const userRef = db.collection(USERS_COLLECTION);

  for (const doc of friendships.docs) {
    const friendship = doc.data();
    const otherUserId = friendship.user1Id === userId 
      ? friendship.user2Id 
      : friendship.user1Id;
    
    const otherUserName = friendship.user1Id === userId
      ? friendship.user2Name
      : friendship.user1Name;

    // Get user profile
    const userDoc = await userRef.doc(otherUserId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    friends.push({
      id: otherUserId,
      name: otherUserName,
      email: userData?.email || null,
      firstName: userData?.firstName || null,
      lastName: userData?.lastName || null,
      residence: userData?.residence || null,
      friendshipId: doc.id,
      createdAt: friendship.createdAt?.toDate(),
    });
  }

  return friends.sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });
};

/**
 * Remove a friend (unfriend)
 */
const removeFriend = async (userId, friendId) => {
  const db = getDb();
  
  // Find the friendship
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', userId)
    .get();

  let friendshipDoc = null;
  for (const doc of friendships.docs) {
    const friendship = doc.data();
    if (friendship.users.includes(friendId)) {
      friendshipDoc = doc;
      break;
    }
  }

  if (!friendshipDoc) {
    throw new Error('Friendship not found');
  }

  await friendshipDoc.ref.delete();

  return { success: true, message: 'Friend removed successfully' };
};

/**
 * Check if two users are friends
 */
const areFriends = async (userId1, userId2) => {
  const db = getDb();
  
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', userId1)
    .get();

  for (const doc of friendships.docs) {
    const friendship = doc.data();
    if (friendship.users.includes(userId2)) {
      return true;
    }
  }

  return false;
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  areFriends,
};

