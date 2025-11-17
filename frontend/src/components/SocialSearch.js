import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { searchUsers, searchLocations, sendFriendRequest, getFriends, followDiningHall, unfollowDiningHall, getFollowedDiningHalls } from '../services/socialService';
import { getPostsByLocationName } from '../services/socialService';
import PostCard from './PostCard';
import '../pages/Social.css';
import '../components/CreatePostModal.css';

const SocialSearch = () => {
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('users'); // 'users' or 'locations'
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationPosts, setLocationPosts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequestStatus, setFriendRequestStatus] = useState({});
  const [followingStatus, setFollowingStatus] = useState({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (accessToken) {
        try {
          const [friendsData, diningHallsData] = await Promise.all([
            getFriends(accessToken),
            getFollowedDiningHalls(accessToken),
          ]);
          setFriends(friendsData.friends || []);
          
          // Build following status map using composite key
          const statusMap = {};
          diningHallsData.diningHalls?.forEach(hall => {
            const key = `${hall.locationId}|${hall.locationName}`;
            statusMap[key] = 'following';
          });
          setFollowingStatus(statusMap);
        } catch (err) {
          console.error('Error fetching data:', err);
        }
      }
    };
    fetchData();
  }, [accessToken]);

  const handleSearch = async () => {
    if (!searchQuery.trim() || !accessToken) return;

    setLoading(true);
    try {
      if (searchType === 'users') {
        const data = await searchUsers(searchQuery, 20, accessToken);
        setUsers(data.users || []);
      } else {
        const data = await searchLocations(searchQuery, 20, accessToken);
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Search error:', err);
      alert('Search failed: ' + err.message);
    } finally {
      setLoading(false);
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

  const handleSendFriendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId, accessToken);
      setFriendRequestStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error sending friend request:', err);
      alert('Failed to send friend request: ' + err.message);
    }
  };

  const handleFollowDiningHall = async (locationId, locationName, e) => {
    e.stopPropagation(); // Prevent navigation to location page
    try {
      await followDiningHall(locationId, locationName, accessToken);
      // Use composite key: locationId|locationName to uniquely identify
      const key = `${locationId}|${locationName}`;
      setFollowingStatus((prev) => ({ ...prev, [key]: 'following' }));
    } catch (err) {
      console.error('Error following dining hall:', err);
      alert('Failed to follow dining hall: ' + err.message);
    }
  };

  const handleUnfollowDiningHall = async (locationId, locationName, e) => {
    e.stopPropagation(); // Prevent navigation to location page
    try {
      await unfollowDiningHall(locationId, locationName, accessToken);
      // Use composite key: locationId|locationName to uniquely identify
      const key = `${locationId}|${locationName}`;
      setFollowingStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[key];
        return newStatus;
      });
    } catch (err) {
      console.error('Error unfollowing dining hall:', err);
      alert('Failed to unfollow dining hall: ' + err.message);
    }
  };

  const isFollowingDiningHall = (locationId, locationName) => {
    // Use composite key: locationId|locationName to uniquely identify
    const key = `${locationId}|${locationName}`;
    return followingStatus[key] === 'following';
  };

  const isFriend = (userId) => {
    return friends.some((f) => f.id === userId);
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (selectedLocation) {
    return (
      <div className="full-width-detail-page">
        <button
          className="btn btn-secondary"
          onClick={() => {
            setSelectedLocation(null);
            setLocationPosts([]);
          }}
          style={{ marginBottom: '1rem' }}
        >
          ← Back to Search
        </button>
        <h2>{selectedLocation.locationName}</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          {selectedLocation.postCount} posts
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
    );
  }

  return (
    <div className="social-search">
       <div className="search-container">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <button
            className={`btn ${searchType === 'users' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSearchType('users');
              setUsers([]);
            }}
          >
            Users
          </button>
          <button
            className={`btn ${searchType === 'locations' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setSearchType('locations');
              setLocations([]);
            }}
          >
            Dining Halls 
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="search-input"
            placeholder={`Search for ${searchType}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {searchType === 'users' && users.length > 0 && (
        <div className="search-results">
          <h3 style={{ marginBottom: '1rem' }}>Users ({users.length})</h3>
          {users.map((user) => (
            <div key={user.id} className="search-result-card">
              <div className="search-result-header">
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div className="friend-avatar" style={{ marginRight: '1rem' }}>
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <div className="search-result-title">{user.name}</div>
                    <div className="search-result-meta">
                      {user.email} {user.residence && `• ${user.residence}`}
                    </div>
                  </div>
                </div>
                {isFriend(user.id) ? (
                  <span style={{ color: '#1a5f3f', fontWeight: 500 }}>Friend</span>
                ) : friendRequestStatus[user.id] === 'sent' ? (
                  <span style={{ color: '#666' }}>Request Sent</span>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSendFriendRequest(user.id)}
                  >
                    Add Friend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {searchType === 'locations' && locations.length > 0 && (
        <div className="search-results">
          <h3 style={{ marginBottom: '1.5rem' }}>Dining Halls ({locations.length})</h3>
          {locations.map((location) => (
            <div
              key={location.uniqueId || `${location.locationId}-${location.locationName}`}
              className="search-result-card"
              style={{ cursor: 'pointer' }}
              onClick={() => handleLocationClick(location)}
            >
              <div className="search-result-header">
                <div style={{ flex: 1 }}>
                  <div className="search-result-title">{location.locationName}</div>
                  <div className="search-result-meta">
                    {location.postCount} {location.postCount === 1 ? 'post' : 'posts'}
                  </div>
                </div>
                {isFollowingDiningHall(location.locationId, location.locationName) ? (
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollowDiningHall(location.locationId, location.locationName, e);
                    }}
                    style={{ marginLeft: '1rem' }}
                  >
                    Unfollow
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowDiningHall(location.locationId, location.locationName, e);
                    }}
                    style={{ marginLeft: '1rem' }}
                  >
                    Follow
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searchQuery && users.length === 0 && locations.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No results found</div>
          <div className="empty-state-message">
            Try a different search term
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="create-post-modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="create-post-modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-post-modal-header">
              <button className="create-post-modal-close" onClick={() => setShowSuccessModal(false)}>×</button>
            </div>

            <div className="create-post-modal-content">
              <div className="success-message">
                Friend request sent!
              </div>
            </div>

            <div className="create-post-modal-actions">
              <button
                className="create-post-modal-submit"
                onClick={() => setShowSuccessModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialSearch;

