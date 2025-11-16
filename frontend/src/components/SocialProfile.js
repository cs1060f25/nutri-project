import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, getFollowedDiningHalls, unfollowDiningHall, getPostsByLocationName } from '../services/socialService';
import { getPostsByUser } from '../services/socialService';
import PostCard from './PostCard';
import '../pages/Social.css';

const SocialProfile = () => {
  const { user, accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'friends', or 'dining-halls'
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [followedDiningHalls, setFollowedDiningHalls] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPosts, setLocationPosts] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendPosts, setFriendPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch friends and dining halls count on initial load (for button labels)
  useEffect(() => {
    const fetchCounts = async () => {
      if (!accessToken) return;

      try {
        const [friendsData, diningHallsData] = await Promise.all([
          getFriends(accessToken),
          getFollowedDiningHalls(accessToken),
        ]);
        setFriends(friendsData.friends || []);
        setFollowedDiningHalls(diningHallsData.diningHalls || []);
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };

    fetchCounts();
  }, [accessToken]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !user) return;

      try {
        setLoading(true);
        if (activeTab === 'posts') {
          const userId = user?.id || user?.uid;
          if (!userId) return;
          const postsData = await getPostsByUser(userId, 50, accessToken);
          setPosts(postsData.posts || []);
        } else if (activeTab === 'friends') {
          const [friendsData, requestsData] = await Promise.all([
            getFriends(accessToken),
            getFriendRequests('received', accessToken),
          ]);
          setFriends(friendsData.friends || []);
          setFriendRequests(requestsData.requests || []);
        } else if (activeTab === 'dining-halls') {
          const diningHallsData = await getFollowedDiningHalls(accessToken);
          setFollowedDiningHalls(diningHallsData.diningHalls || []);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, user, activeTab]);

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptFriendRequest(requestId, accessToken);
      // Refresh friend requests and friends
      const [friendsData, requestsData] = await Promise.all([
        getFriends(accessToken),
        getFriendRequests('received', accessToken),
      ]);
      setFriends(friendsData.friends || []);
      setFriendRequests(requestsData.requests || []);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Failed to accept friend request: ' + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectFriendRequest(requestId, accessToken);
      // Refresh friend requests
      const requestsData = await getFriendRequests('received', accessToken);
      setFriendRequests(requestsData.requests || []);
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      alert('Failed to reject friend request: ' + err.message);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      await removeFriend(friendId, accessToken);
      // Refresh friends
      const friendsData = await getFriends(accessToken);
      setFriends(friendsData.friends || []);
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend: ' + err.message);
    }
  };

  const handleUnfollowDiningHall = async (locationId, locationName) => {
    if (!window.confirm(`Are you sure you want to unfollow ${locationName}?`)) {
      return;
    }

    try {
      await unfollowDiningHall(locationId, locationName, accessToken);
      // Refresh followed dining halls
      const diningHallsData = await getFollowedDiningHalls(accessToken);
      setFollowedDiningHalls(diningHallsData.diningHalls || []);
    } catch (err) {
      console.error('Error unfollowing dining hall:', err);
      alert('Failed to unfollow dining hall: ' + err.message);
    }
  };

  const handleLocationClick = async (location) => {
    setSelectedLocation(location);
    try {
      const data = await getPostsByLocationName(location.locationName, 50, accessToken);
      setLocationPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching location posts:', err);
      alert('Failed to load posts: ' + err.message);
    }
  };

  const handleFriendClick = async (friend) => {
    setSelectedFriend(friend);
    try {
      const data = await getPostsByUser(friend.id, 50, accessToken);
      setFriendPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching friend posts:', err);
      alert('Failed to load friend posts: ' + err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="social-profile">
      <div className="profile-header">
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <button
            className={`btn ${activeTab === 'posts' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('posts')}
          >
            My Posts
          </button>
          <button
            className={`btn ${activeTab === 'friends' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends ({friends.length})
          </button>
          <button
            className={`btn ${activeTab === 'dining-halls' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('dining-halls')}
          >
            Dining Halls ({followedDiningHalls.length})
          </button>
        </div>
      </div>

      {activeTab === 'posts' && (
        <div className="profile-posts">
          {error && <div className="error-message">Error: {error}</div>}
          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No posts yet</div>
              <div className="empty-state-message">
                Share your meals to create posts!
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} showDelete={true} />
            ))
          )}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="profile-friends">
          {friendRequests.length > 0 && (
            <div className="friend-requests-section">
              <h3>Friend Requests ({friendRequests.length})</h3>
              {friendRequests.map((request) => (
                <div key={request.id} className="friend-request-card">
                  <div className="friend-request-info">
                    <div className="friend-request-avatar">
                      {getInitials(request.fromUserName)}
                    </div>
                    <div className="friend-request-details">
                      <h3>{request.fromUserName}</h3>
                      <p>{request.fromUserEmail}</p>
                    </div>
                  </div>
                  <div className="friend-request-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="friends-section">
            {selectedFriend ? (
              <div className="full-width-detail-page">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedFriend(null);
                    setFriendPosts([]);
                  }}
                  style={{ marginBottom: '1rem' }}
                >
                  ← Back to Friends
                </button>
                <h2>{selectedFriend.name}'s Posts</h2>
                <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                  {selectedFriend.residence || selectedFriend.email}
                </p>
                {friendPosts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <div className="empty-state-title">No posts yet</div>
                    <div className="empty-state-message">
                      {selectedFriend.name} hasn't shared any meals yet.
                    </div>
                  </div>
                ) : (
                  friendPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}
              </div>
            ) : (
              <>
                {friends.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">👥</div>
                    <div className="empty-state-title">No friends yet</div>
                    <div className="empty-state-message">
                      Search for users and send friend requests to connect!
                    </div>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div 
                      key={friend.id} 
                      className="friend-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleFriendClick(friend)}
                    >
                      <div className="friend-info">
                        <div className="friend-avatar">
                          {getInitials(friend.name)}
                        </div>
                        <div className="friend-details">
                          <h3>{friend.name}</h3>
                          <p>{friend.residence || friend.email}</p>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'dining-halls' && (
        <div className="profile-dining-halls">
          {selectedLocation ? (
            <div className="full-width-detail-page">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedLocation(null);
                  setLocationPosts([]);
                }}
                style={{ marginBottom: '1rem' }}
              >
                ← Back to Dining Halls
              </button>
              <h2>{selectedLocation.locationName}</h2>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                {locationPosts.length} {locationPosts.length === 1 ? 'post' : 'posts'}
              </p>
              {locationPosts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">📭</div>
                  <div className="empty-state-title">No posts yet</div>
                  <div className="empty-state-message">
                    Be the first to share a meal from this location!
                  </div>
                </div>
              ) : (
                locationPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </div>
          ) : (
            <>
              {error && <div className="error-message">Error: {error}</div>}
              {followedDiningHalls.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🏛️</div>
                  <div className="empty-state-title">No dining halls followed</div>
                  <div className="empty-state-message">
                    Search for dining halls and follow them to see posts in your feed!
                  </div>
                </div>
              ) : (
                <div className="dining-halls-section">
                  {followedDiningHalls.map((hall) => (
                    <div 
                      key={`${hall.locationId}|${hall.locationName}`} 
                      className="friend-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleLocationClick(hall)}
                    >
                      <div className="friend-info">
                        <div className="friend-avatar" style={{ background: '#1a5f3f' }}>
                          🏛️
                        </div>
                        <div className="friend-details">
                          <h3>{hall.locationName}</h3>
                          <p>Location ID: {hall.locationId}</p>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnfollowDiningHall(hall.locationId, hall.locationName);
                        }}
                      >
                        Unfollow
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SocialProfile;

