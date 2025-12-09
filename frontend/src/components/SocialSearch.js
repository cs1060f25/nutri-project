import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchUsers, searchLocations, sendFriendRequest, getFriends, followDiningHall, unfollowDiningHall, getFollowedDiningHalls, getFriendRequests, acceptFriendRequest } from '../services/socialService';
import { getPostsByLocationName } from '../services/socialService';
import PostCard from './PostCard';
import PostDetail from './PostDetail';
import '../pages/Social.css';
import '../components/CreatePostModal.css';

const SocialSearch = () => {
  const { accessToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('users'); // 'users' or 'locations'
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationPosts, setLocationPosts] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequestStatus, setFriendRequestStatus] = useState({});
  const [incomingRequests, setIncomingRequests] = useState({}); // userId -> requestId map
  const [followingStatus, setFollowingStatus] = useState({});
  const [followedDiningHalls, setFollowedDiningHalls] = useState([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Friend request sent!');
  const [showPostModal, setShowPostModal] = useState(false);
  const [modalPostId, setModalPostId] = useState(null);

  // Check if we should open a post modal (from "Back to Post" navigation)
  useEffect(() => {
    if (location.state?.openPostModal && location.state?.postId) {
      setModalPostId(location.state.postId);
      setShowPostModal(true);
      // Clear the state to prevent reopening on re-render
      window.history.replaceState({ ...location.state, openPostModal: false }, '');
    }
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      if (accessToken) {
        try {
          const [friendsData, diningHallsData, sentRequestsData, receivedRequestsData] = await Promise.all([
            getFriends(accessToken),
            getFollowedDiningHalls(accessToken),
            getFriendRequests('sent', accessToken),
            getFriendRequests('received', accessToken),
          ]);
          setFriends(friendsData.friends || []);
          setFollowedDiningHalls(diningHallsData.diningHalls || []);
          
          // Build friend request status map from sent requests
          const requestStatusMap = {};
          if (sentRequestsData.requests) {
            sentRequestsData.requests.forEach(request => {
              if (request.toUserId) {
                requestStatusMap[request.toUserId] = 'sent';
              }
            });
          }
          setFriendRequestStatus(requestStatusMap);
          
          // Build incoming requests map (userId -> requestId)
          const incomingMap = {};
          if (receivedRequestsData.requests) {
            receivedRequestsData.requests.forEach(request => {
              if (request.fromUserId) {
                incomingMap[request.fromUserId] = request.id;
              }
            });
          }
          setIncomingRequests(incomingMap);
          
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
        
        // Check for existing friend requests for the searched users
        if (data.users && data.users.length > 0) {
          try {
            const [sentRequestsData, receivedRequestsData] = await Promise.all([
              getFriendRequests('sent', accessToken),
              getFriendRequests('received', accessToken),
            ]);
            const requestStatusMap = { ...friendRequestStatus };
            if (sentRequestsData.requests) {
              sentRequestsData.requests.forEach(request => {
                if (request.toUserId && data.users.some(u => u.id === request.toUserId)) {
                  requestStatusMap[request.toUserId] = 'sent';
                }
              });
            }
            setFriendRequestStatus(requestStatusMap);
            
            // Update incoming requests map
            const incomingMap = { ...incomingRequests };
            if (receivedRequestsData.requests) {
              receivedRequestsData.requests.forEach(request => {
                if (request.fromUserId && data.users.some(u => u.id === request.fromUserId)) {
                  incomingMap[request.fromUserId] = request.id;
                }
              });
            }
            setIncomingRequests(incomingMap);
          } catch (err) {
            console.error('Error fetching friend requests:', err);
            // Don't fail the search if this fails
          }
        }
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

  const handleUserClick = async (user) => {
    // Navigate to the profile route instead of showing inline
    navigate(`/home/social/user/${user.id}`);
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await sendFriendRequest(userId, accessToken);
      setFriendRequestStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      setSuccessMessage('Friend request sent!');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error sending friend request:', err);
      // If request already sent, update status instead of showing error
      if (err.message && err.message.includes('already sent')) {
        setFriendRequestStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      } else {
      alert('Failed to send friend request: ' + err.message);
      }
    }
  };

  const handleAcceptFriendRequest = async (userId) => {
    try {
      const requestId = incomingRequests[userId];
      if (!requestId) {
        console.error('No request ID found for user:', userId);
        return;
      }
      
      await acceptFriendRequest(requestId, accessToken);
      
      // Update state: remove from incoming requests, add to friends
      setIncomingRequests((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      
      // Refresh friends list
      const friendsData = await getFriends(accessToken);
      setFriends(friendsData.friends || []);
      
      setSuccessMessage('Friend request accepted!');
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error accepting friend request:', err);
      alert('Failed to accept friend request: ' + err.message);
    }
  };


  const handleFollowDiningHall = async (locationId, locationName, e) => {
    if (e) e.stopPropagation(); // Prevent navigation to location page if event exists
    try {
      await followDiningHall(locationId, locationName, accessToken);
      // Use composite key: locationId|locationName to uniquely identify
      const key = `${locationId}|${locationName}`;
      setFollowingStatus((prev) => ({ ...prev, [key]: 'following' }));
      // Refresh followed dining halls
      const diningHallsData = await getFollowedDiningHalls(accessToken);
      setFollowedDiningHalls(diningHallsData.diningHalls || []);
    } catch (err) {
      console.error('Error following dining hall:', err);
      alert('Failed to follow dining hall: ' + err.message);
    }
  };

  const handleUnfollowDiningHall = async (locationId, locationName, e) => {
    if (e) e.stopPropagation(); // Prevent navigation to location page if event exists
    try {
      await unfollowDiningHall(locationId, locationName, accessToken);
      // Use composite key: locationId|locationName to uniquely identify
      const key = `${locationId}|${locationName}`;
      setFollowingStatus((prev) => {
        const newStatus = { ...prev };
        delete newStatus[key];
        return newStatus;
      });
      // Refresh followed dining halls
      const diningHallsData = await getFollowedDiningHalls(accessToken);
      setFollowedDiningHalls(diningHallsData.diningHalls || []);
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
          className="profile-back-button"
          onClick={() => {
            setSelectedLocation(null);
            setLocationPosts([]);
          }}
          style={{ marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={20} />
          Back to Search
        </button>
        <div className="profile-detail-header-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{selectedLocation.locationName}</h2>
              <p style={{ color: '#666', marginTop: '0.5rem', marginBottom: 0 }}>
                {selectedLocation.postCount} {selectedLocation.postCount === 1 ? 'creation' : 'creations'}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {(() => {
                const key = `${selectedLocation.locationId}|${selectedLocation.locationName}`;
                const isFollowing = followingStatus[key] === 'following' || 
                                  followedDiningHalls.some(
                                    hall => hall.locationId === selectedLocation.locationId && 
                                            hall.locationName === selectedLocation.locationName
                                  );
                return isFollowing ? (
                  <button
                    className="btn btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnfollowDiningHall(selectedLocation.locationId, selectedLocation.locationName, e);
                    }}
                  >
                    Unfollow
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollowDiningHall(selectedLocation.locationId, selectedLocation.locationName, e);
                    }}
                  >
                    Follow
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
        {locationPosts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No creations yet</div>
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
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
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
          <button className="btn btn-primary search-button" onClick={handleSearch} disabled={loading}>
            <SearchIcon size={18} className="search-icon" />
            <span className="search-button-text">{loading ? 'Searching...' : 'Search'}</span>
          </button>
        </div>
      </div>

      {searchType === 'users' && users.length > 0 && (
        <div className="search-results">
          <h3 style={{ marginBottom: '1rem' }}>Users ({users.length})</h3>
          {users.map((user) => (
            <div 
              key={user.id} 
              className="search-result-card"
              style={{ cursor: 'pointer' }}
              onClick={(e) => {
                // Don't navigate if clicking on the button
                if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                  return;
                }
                handleUserClick(user);
              }}
            >
              <div className="search-result-header">
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
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
                <div onClick={(e) => e.stopPropagation()}>
                  {isFriend(user.id) ? (
                    <button
                      className="btn btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserClick(user);
                      }}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#1a5f3f', 
                        fontWeight: 500,
                        padding: '0.5rem 1rem',
                        cursor: 'pointer'
                      }}
                    >
                      Already Friended
                    </button>
                  ) : incomingRequests[user.id] !== undefined ? (
                    <button
                      className="btn btn-primary"
                      onClick={() => handleAcceptFriendRequest(user.id)}
                    >
                      Accept Request
                    </button>
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
                    {location.postCount} {location.postCount === 1 ? 'creation' : 'creations'}
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
                {successMessage}
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

      {showPostModal && modalPostId && (
        <PostDetail
          postId={modalPostId}
          onClose={() => {
            setShowPostModal(false);
            setModalPostId(null);
          }}
        />
      )}
    </div>
  );
};

export default SocialSearch;

