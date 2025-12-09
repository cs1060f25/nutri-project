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

// Notifications
router.get('/notifications', socialController.getNotifications);

// Post routes
router.post('/posts', socialController.createPost);
router.post('/posts/scan', socialController.createPostFromScan);
router.get('/posts/feed', socialController.getFeedPosts);
router.get('/posts/feed/dining-halls', socialController.getDiningHallFeedPosts);
router.get('/posts/popular', socialController.getPopularPosts);
router.get('/posts/user/:userId', socialController.getPostsByUser);
router.get('/posts/location/:locationId', socialController.getPostsByLocation);
router.get('/posts/location-name/:locationName', socialController.getPostsByLocationName);
router.get('/posts/:postId', socialController.getPostById);
router.put('/posts/:postId', socialController.updatePost);
router.delete('/posts/:postId', socialController.deletePost);

// Post interaction routes (must come after specific routes above)
router.post('/posts/:postId/upvote', socialController.upvotePost);
router.post('/posts/:postId/downvote', socialController.downvotePost);
router.get('/posts/:postId/comments', socialController.getComments);
router.post('/posts/:postId/comments', socialController.addComment);

// Dining hall follow routes
router.post('/dining-halls/follow', socialController.followDiningHall);
router.post('/dining-halls/unfollow', socialController.unfollowDiningHall);
router.get('/dining-halls/following', socialController.getFollowedDiningHalls);

// Search routes
router.get('/search/users', socialController.searchUsers);
router.get('/search/locations', socialController.searchLocations);

module.exports = router;
