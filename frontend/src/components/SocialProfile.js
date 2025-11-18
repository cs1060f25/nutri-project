import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, sendFriendRequest, getFollowedDiningHalls, unfollowDiningHall, getPostsByLocationName } from '../services/socialService';
import { getPostsByUser } from '../services/socialService';
import PostCard from './PostCard';
import CustomSelect from './CustomSelect';
import '../pages/Social.css';

const SocialProfile = () => {
  const { userId: urlUserId } = useParams();
  const { user, accessToken } = useAuth();
  // Use userId from URL if provided, otherwise use current user
  const profileUserId = urlUserId || (user?.id || user?.uid);
  const isOwnProfile = !urlUserId || profileUserId === (user?.id || user?.uid);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'friends', or 'dining-halls'
  
  // Reset to posts tab if viewing another user's profile and on friends/dining-halls tab
  useEffect(() => {
    if (!isOwnProfile && (activeTab === 'friends' || activeTab === 'dining-halls')) {
      setActiveTab('posts');
    }
  }, [isOwnProfile, activeTab]);
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [followedDiningHalls, setFollowedDiningHalls] = useState([]);
  const [friendRequestStatus, setFriendRequestStatus] = useState({});
  const [isFriendStatus, setIsFriendStatus] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationPosts, setLocationPosts] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [friendPosts, setFriendPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterDiningHall, setFilterDiningHall] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterMealType, setFilterMealType] = useState('');

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
        
        // Check if viewing another user's profile and if they're a friend
        if (!isOwnProfile && profileUserId) {
          const isFriend = friendsData.friends?.some(f => f.id === profileUserId);
          setIsFriendStatus(isFriend || false);
          
          // Check for pending friend requests
          try {
            const sentRequests = await getFriendRequests('sent', accessToken);
            if (sentRequests.requests?.some(r => r.toUserId === profileUserId)) {
              setFriendRequestStatus({ [profileUserId]: 'sent' });
            }
          } catch (err) {
            console.error('Error checking friend requests:', err);
          }
        }
      } catch (err) {
        console.error('Error fetching counts:', err);
      }
    };

    fetchCounts();
  }, [accessToken, profileUserId, isOwnProfile]);

  // Filter posts based on filter criteria
  useEffect(() => {
    if (activeTab !== 'posts') return;

    let filtered = [...posts];

    // Filter by dining hall
    if (filterDiningHall) {
      filtered = filtered.filter(post => 
        post.locationName === filterDiningHall || post.locationId === filterDiningHall
      );
    }

    // Filter by visibility
    if (filterVisibility === 'public') {
      filtered = filtered.filter(post => post.isPublic !== false);
    } else if (filterVisibility === 'private') {
      filtered = filtered.filter(post => post.isPublic === false);
    }

    // Filter by rating
    if (filterRating) {
      const ratingNum = parseInt(filterRating, 10);
      filtered = filtered.filter(post => post.rating === ratingNum);
    }

    // Filter by meal type
    if (filterMealType) {
      filtered = filtered.filter(post => 
        post.mealType === filterMealType || post.mealName === filterMealType
      );
    }

    setFilteredPosts(filtered);
  }, [posts, filterDiningHall, filterVisibility, filterRating, filterMealType, activeTab]);

  // Reset filter visibility when switching tabs
  useEffect(() => {
    setShowFilters(false);
  }, [activeTab]);

  // Fetch tab-specific data when tab changes
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !profileUserId) return;

      try {
        setLoading(true);
        if (activeTab === 'posts') {
          if (!profileUserId) return;
          try {
            const postsData = await getPostsByUser(profileUserId, 50, accessToken);
            const postsList = postsData.posts || [];
            setPosts(postsList);
            setFilteredPosts(postsList);
            setError(null);
          } catch (err) {
            // For user's own profile, treat errors as no posts instead of showing error
            console.error('Error fetching user posts:', err);
            setPosts([]);
            setError(null);
          }
        } else if (activeTab === 'friends' && isOwnProfile) {
          // Only show friends tab for own profile
          const [friendsData, requestsData] = await Promise.all([
            getFriends(accessToken),
            getFriendRequests('received', accessToken),
          ]);
          setFriends(friendsData.friends || []);
          setFriendRequests(requestsData.requests || []);
          setError(null);
        } else if (activeTab === 'dining-halls' && isOwnProfile) {
          // Only show dining halls tab for own profile
          const diningHallsData = await getFollowedDiningHalls(accessToken);
          setFollowedDiningHalls(diningHallsData.diningHalls || []);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken, profileUserId, activeTab, isOwnProfile]);

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
      // Update friend status if viewing that user's profile
      if (profileUserId === friendId) {
        setIsFriendStatus(false);
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend: ' + err.message);
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId, accessToken);
      setFriendRequestStatus((prev) => ({ ...prev, [userId]: 'sent' }));
    } catch (err) {
      console.error('Error sending friend request:', err);
      if (err.message && err.message.includes('already sent')) {
        setFriendRequestStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      } else {
        alert('Failed to send friend request: ' + err.message);
      }
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

  const handlePostUpdated = async () => {
    // Refresh posts after update
    if (activeTab === 'posts' && user) {
      if (profileUserId) {
        try {
          const postsData = await getPostsByUser(profileUserId, 50, accessToken);
          const postsList = postsData.posts || [];
          setPosts(postsList);
          // Filters will be reapplied via useEffect
        } catch (err) {
          console.error('Error refreshing posts:', err);
        }
      }
    }
  };

  const handlePostDeleted = async () => {
    // Refresh posts after delete
    if (activeTab === 'posts' && user) {
      if (profileUserId) {
        try {
          const postsData = await getPostsByUser(profileUserId, 50, accessToken);
          const postsList = postsData.posts || [];
          setPosts(postsList);
          // Filters will be reapplied via useEffect
        } catch (err) {
          console.error('Error refreshing posts:', err);
        }
      }
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
        {!isOwnProfile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div></div>
            <div>
              {isFriendStatus ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => handleRemoveFriend(profileUserId)}
                >
                  Unfriend
                </button>
              ) : friendRequestStatus[profileUserId] === 'sent' ? (
                <span style={{ color: '#666', padding: '0.5rem 1rem' }}>Friend Request Sent</span>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSendFriendRequest(profileUserId)}
                >
                  Add Friend
                </button>
              )}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <button
            className={`btn ${activeTab === 'posts' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('posts')}
          >
            {isOwnProfile ? 'My Posts' : 'Posts'}
          </button>
          {isOwnProfile && (
            <>
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
            </>
          )}
          </div>
          {activeTab === 'posts' && posts.length > 0 && (
            <button
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowFilters(!showFilters)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                position: 'relative'
              }}
              title="Toggle filters"
            >
              <Filter size={18} />
              <span className="filter-button-text">Filter</span>
              {(filterDiningHall || filterVisibility || filterRating || filterMealType) && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold'
                }}>
                  {(filterDiningHall ? 1 : 0) + (filterVisibility ? 1 : 0) + (filterRating ? 1 : 0) + (filterMealType ? 1 : 0)}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'posts' && (
        <div className="profile-posts">
          {/* Filter Section */}
          {posts.length > 0 && showFilters && (
            <div className="profile-filters">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Filter Posts</h3>
              <div className="filters-grid">
                <div className="filter-group">
                  <label htmlFor="filter-dining-hall">Dining Hall</label>
                  <CustomSelect
                    value={filterDiningHall}
                    onChange={setFilterDiningHall}
                    options={[
                      { value: '', label: 'All Dining Halls' },
                      ...[...new Set(posts.map(p => p.locationName).filter(Boolean))].map(location => ({
                        value: location,
                        label: location
                      }))
                    ]}
                    placeholder="All Dining Halls"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-visibility">Visibility</label>
                  <CustomSelect
                    value={filterVisibility}
                    onChange={setFilterVisibility}
                    options={[
                      { value: '', label: 'All' },
                      { value: 'public', label: 'Public' },
                      { value: 'private', label: 'Private' }
                    ]}
                    placeholder="All"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-rating">Rating</label>
                  <CustomSelect
                    value={filterRating}
                    onChange={setFilterRating}
                    options={[
                      { value: '', label: 'All Ratings' },
                      { value: '5', label: '5 Stars' },
                      { value: '4', label: '4 Stars' },
                      { value: '3', label: '3 Stars' },
                      { value: '2', label: '2 Stars' },
                      { value: '1', label: '1 Star' }
                    ]}
                    placeholder="All Ratings"
                  />
                </div>

                <div className="filter-group">
                  <label htmlFor="filter-meal-type">Meal Type</label>
                  <CustomSelect
                    value={filterMealType}
                    onChange={setFilterMealType}
                    options={[
                      { value: '', label: 'All Meal Types' },
                      { value: 'Breakfast', label: 'Breakfast' },
                      { value: 'Lunch', label: 'Lunch' },
                      { value: 'Dinner', label: 'Dinner' }
                    ]}
                    placeholder="All Meal Types"
                  />
                </div>
              </div>

              {(filterDiningHall || filterVisibility || filterRating || filterMealType) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFilterDiningHall('');
                    setFilterVisibility('');
                    setFilterRating('');
                    setFilterMealType('');
                  }}
                  style={{ marginTop: '1rem' }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No posts yet</div>
              <div className="empty-state-message">
                Share your meals to create posts!
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No posts match your filters</div>
              <div className="empty-state-message">
                Try adjusting your filter criteria.
              </div>
            </div>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Showing {filteredPosts.length} of {posts.length} posts
              </p>
              {filteredPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  showDelete={true} 
                  showVisibility={true}
                  onPostUpdated={handlePostUpdated}
                  onPostDeleted={handlePostDeleted}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'friends' && isOwnProfile && (
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

      {activeTab === 'dining-halls' && isOwnProfile && (
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

