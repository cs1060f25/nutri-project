const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(verifyToken);

// Friend routes
router.post('/friends/request', socialController.sendFriendRequest);
router.post('/friends/accept/:requestId', socialController.acceptFriendRequest);
router.post('/friends/reject/:requestId', socialController.rejectFriendRequest);
router.get('/friends/requests', socialController.getFriendRequests);
router.get('/friends', socialController.getFriends);
router.delete('/friends/:friendId', socialController.removeFriend);

// Post routes
router.post('/posts', socialController.createPost);
router.post('/posts/scan', socialController.createPostFromScan);
router.get('/posts/feed', socialController.getFeedPosts);
router.get('/posts/feed/dining-halls', socialController.getDiningHallFeedPosts);
router.get('/posts/user/:userId', socialController.getPostsByUser);
router.get('/posts/location/:locationId', socialController.getPostsByLocation);
router.get('/posts/location-name/:locationName', socialController.getPostsByLocationName);
router.put('/posts/:postId', socialController.updatePost);
router.delete('/posts/:postId', socialController.deletePost);

// Dining hall follow routes
router.post('/dining-halls/follow', socialController.followDiningHall);
router.post('/dining-halls/unfollow', socialController.unfollowDiningHall);
router.get('/dining-halls/following', socialController.getFollowedDiningHalls);

// Search routes
router.get('/search/users', socialController.searchUsers);
router.get('/search/locations', socialController.searchLocations);

module.exports = router;

