import React, { useState, useEffect } from 'react';
import { Filter, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, sendFriendRequest, getFollowedDiningHalls, followDiningHall, unfollowDiningHall, getPostsByLocationName } from '../services/socialService';
import { getPostsByUser } from '../services/socialService';
import PostCard from './PostCard';
import CustomSelect from './CustomSelect';
import ConfirmModal from './ConfirmModal';
import PostDetail from './PostDetail';
import '../pages/Social.css';

const SocialProfile = () => {
  const { userId: urlUserId } = useParams();
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showUnfriendModal, setShowUnfriendModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [locationToUnfollow, setLocationToUnfollow] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [modalPostId, setModalPostId] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState({});
  
  // Check if we came from a modal
  const fromModal = location.state?.fromModal;
  const modalPostIdFromState = location.state?.postId;
  const returnPath = location.state?.returnPath || '/home/social/feed';
  
  // Set up modal postId if we came from PostDetail
  useEffect(() => {
    if (fromModal && modalPostIdFromState) {
      setModalPostId(modalPostIdFromState);
      // Don't open modal immediately - wait for back button click
    }
  }, [fromModal, modalPostIdFromState]);

  // Check if we should open a post modal (from "Back to Post" navigation)
  useEffect(() => {
    if (location.state?.openPostModal && location.state?.postId) {
      setModalPostId(location.state.postId);
      setShowPostModal(true);
      // Clear the state to prevent reopening on re-render
      window.history.replaceState({ ...location.state, openPostModal: false }, '');
    }
  }, [location.state]);

  // Fetch incoming requests when viewing another user's profile from modal
  useEffect(() => {
    const fetchIncomingRequests = async () => {
      if (!isOwnProfile && fromModal && accessToken && profileUserId) {
        try {
          const receivedRequestsData = await getFriendRequests('received', accessToken);
          const incomingMap = {};
          if (receivedRequestsData.requests) {
            receivedRequestsData.requests.forEach(request => {
              if (request.fromUserId) {
                incomingMap[request.fromUserId] = request.id;
              }
            });
          }
          setIncomingRequests(incomingMap);
        } catch (err) {
          console.error('Error fetching incoming requests:', err);
        }
      }
    };
    fetchIncomingRequests();
  }, [isOwnProfile, fromModal, accessToken, profileUserId]);
  
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

    // Filter by dining hall - only show posts that have location visible
    if (filterDiningHall) {
      filtered = filtered.filter(post => {
        // Check if the post has location enabled in display options
        const options = post.displayOptions || {};
        const locationVisible = options.location !== undefined ? options.location : (options.showLocation !== undefined ? options.showLocation : true);
        
        // Only include post if location is visible AND matches the filter
        return locationVisible && (post.locationName === filterDiningHall || post.locationId === filterDiningHall);
      });
    }

    // Filter by visibility
    if (filterVisibility === 'public') {
      filtered = filtered.filter(post => post.isPublic !== false);
    } else if (filterVisibility === 'private') {
      filtered = filtered.filter(post => post.isPublic === false);
    }

    // Filter by rating - only show posts that have rating visible
    if (filterRating) {
      const ratingNum = parseInt(filterRating, 10);
      filtered = filtered.filter(post => {
        // Check if the post has rating enabled in display options
        const options = post.displayOptions || {};
        const ratingVisible = options.rating !== undefined ? options.rating : true;
        
        // Only include post if rating is visible AND matches the filter
        return ratingVisible && post.rating === ratingNum;
      });
    }

    // Filter by meal type - only show posts that have meal type visible
    if (filterMealType) {
      filtered = filtered.filter(post => {
        // Check if the post has meal type enabled in display options
        const options = post.displayOptions || {};
        const mealTypeVisible = options.mealType !== undefined ? options.mealType : true;
        
        // Only include post if meal type is visible AND matches the filter
        return mealTypeVisible && (post.mealType === filterMealType || post.mealName === filterMealType);
      });
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

  const handleRemoveFriend = (friendId, friendName = null) => {
    setFriendToRemove({ id: friendId, name: friendName });
    setShowUnfriendModal(true);
  };

  const handleConfirmUnfriend = async () => {
    if (!friendToRemove) return;

    try {
      await removeFriend(friendToRemove.id, accessToken);
      // Refresh friends
      const friendsData = await getFriends(accessToken);
      setFriends(friendsData.friends || []);
      // Update friend status if viewing that user's profile
      if (profileUserId === friendToRemove.id) {
        setIsFriendStatus(false);
      }
      // If viewing the friend's detail page, go back to friends list
      if (selectedFriend && selectedFriend.id === friendToRemove.id) {
        setSelectedFriend(null);
        setFriendPosts([]);
      }
    } catch (err) {
      console.error('Error removing friend:', err);
      alert('Failed to remove friend: ' + err.message);
    } finally {
      setShowUnfriendModal(false);
      setFriendToRemove(null);
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

  const handleFollowDiningHall = async (locationId, locationName) => {
    try {
      await followDiningHall(locationId, locationName, accessToken);
      // Refresh followed dining halls
      const diningHallsData = await getFollowedDiningHalls(accessToken);
      setFollowedDiningHalls(diningHallsData.diningHalls || []);
    } catch (err) {
      console.error('Error following dining hall:', err);
      alert('Failed to follow dining hall: ' + err.message);
    }
  };

  const handleUnfollowDiningHall = (locationId, locationName) => {
    setLocationToUnfollow({ locationId, locationName });
    setShowUnfollowModal(true);
  };

  const handleConfirmUnfollow = async () => {
    if (!locationToUnfollow) return;

    try {
      await unfollowDiningHall(locationToUnfollow.locationId, locationToUnfollow.locationName, accessToken);
      // Refresh followed dining halls
      const diningHallsData = await getFollowedDiningHalls(accessToken);
      setFollowedDiningHalls(diningHallsData.diningHalls || []);
      // If viewing the location's detail page, go back to dining halls list
      if (selectedLocation && 
          (selectedLocation.locationId === locationToUnfollow.locationId || 
           selectedLocation.locationName === locationToUnfollow.locationName)) {
        setSelectedLocation(null);
        setLocationPosts([]);
      }
    } catch (err) {
      console.error('Error unfollowing dining hall:', err);
      alert('Failed to unfollow dining hall: ' + err.message);
    } finally {
      setShowUnfollowModal(false);
      setLocationToUnfollow(null);
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

  // If viewing another user's profile from a modal, show full-width detail page
  if (!isOwnProfile && fromModal && modalPostId) {
    const userPost = posts[0];
    const userName = userPost?.userName || 'User';
    const userEmail = userPost?.userEmail || '';
    const userResidence = userPost?.userResidence || '';
    const isFriend = friends.some((f) => f.id === profileUserId);
    const hasSentRequest = friendRequestStatus[profileUserId] === 'sent';
    const hasIncomingRequest = incomingRequests[profileUserId] !== undefined;
    const incomingRequestId = incomingRequests[profileUserId];

    return (
      <div className="full-width-detail-page">
        <button
          className="profile-back-button"
          onClick={() => {
            navigate(returnPath, {
              state: { openPostModal: true, postId: modalPostId }
            });
          }}
          style={{ marginBottom: '1.5rem' }}
        >
          <ArrowLeft size={20} />
          Back to Post
        </button>
        <div className="profile-detail-header-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{userName}</h2>
              <p style={{ color: '#666', marginTop: '0.5rem' }}>
                {userEmail} {userResidence && `• ${userResidence}`}
              </p>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              {isFriend ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFriendToRemove({ id: profileUserId, name: userName });
                    setShowUnfriendModal(true);
                  }}
                >
                  Unfriend
                </button>
              ) : hasIncomingRequest ? (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await handleAcceptRequest(incomingRequestId);
                      // Refresh incoming requests
                      const receivedRequestsData = await getFriendRequests('received', accessToken);
                      const incomingMap = {};
                      if (receivedRequestsData.requests) {
                        receivedRequestsData.requests.forEach(request => {
                          if (request.fromUserId) {
                            incomingMap[request.fromUserId] = request.id;
                          }
                        });
                      }
                      setIncomingRequests(incomingMap);
                      // Refresh friends
                      const friendsData = await getFriends(accessToken);
                      setFriends(friendsData.friends || []);
                    } catch (err) {
                      console.error('Error accepting friend request:', err);
                    }
                  }}
                >
                  Accept Request
                </button>
              ) : hasSentRequest ? (
                <span style={{ color: '#666', padding: '0.5rem 1rem' }}>Friend Request Sent</span>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      await handleSendFriendRequest(profileUserId);
                    } catch (err) {
                      console.error('Error sending friend request:', err);
                    }
                  }}
                >
                  Add Friend
                </button>
              )}
            </div>
          </div>
        </div>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          {posts.length} {posts.length === 1 ? 'creation' : 'creations'}
        </p>
        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No creations yet</div>
            <div className="empty-state-message">
              This user hasn't shared any meals yet.
            </div>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))
        )}

        <ConfirmModal
          isOpen={showUnfriendModal}
          onClose={() => {
            setShowUnfriendModal(false);
            setFriendToRemove(null);
          }}
          onConfirm={handleConfirmUnfriend}
          title="Remove Friend"
          message={`Are you sure you want to remove ${friendToRemove?.name || 'this user'} as a friend?`}
          confirmText="Remove Friend"
          cancelText="Cancel"
          isDangerous={true}
        />

        {showPostModal && modalPostId && (
          <PostDetail
            postId={modalPostId}
            onClose={() => {
              setShowPostModal(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="social-profile">
      {!isOwnProfile && (
        <div className="profile-back-button-container">
          <button 
            className="profile-back-button" 
            onClick={() => {
              if (fromModal && modalPostId) {
                setShowPostModal(true);
              } else {
                navigate(-1);
              }
            }}
          >
            <ArrowLeft size={20} />
            {fromModal && modalPostId ? 'Back to Post' : 'Back'}
          </button>
        </div>
      )}
      <div className="profile-header">
        {!isOwnProfile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div></div>
            <div>
              {isFriendStatus ? (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    const userName = posts[0]?.userName || null;
                    handleRemoveFriend(profileUserId, userName);
                  }}
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
          {posts.length > 0 && showFilters && (() => {
            // Get visible dining halls (only from posts with location visible)
            const visibleDiningHalls = [...new Set(
              posts
                .filter(post => {
                  const options = post.displayOptions || {};
                  const locationVisible = options.location !== undefined ? options.location : (options.showLocation !== undefined ? options.showLocation : true);
                  return locationVisible && post.locationName;
                })
                .map(p => p.locationName)
            )];

            // Get visible ratings (only from posts with rating visible)
            const visibleRatings = [...new Set(
              posts
                .filter(post => {
                  const options = post.displayOptions || {};
                  const ratingVisible = options.rating !== undefined ? options.rating : true;
                  return ratingVisible && post.rating;
                })
                .map(p => p.rating)
            )].sort((a, b) => b - a);

            // Get visible meal types (only from posts with meal type visible)
            const visibleMealTypes = [...new Set(
              posts
                .filter(post => {
                  const options = post.displayOptions || {};
                  const mealTypeVisible = options.mealType !== undefined ? options.mealType : true;
                  return mealTypeVisible && (post.mealType || post.mealName);
                })
                .map(p => p.mealType || p.mealName)
            )];

            return (
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
                      ...visibleDiningHalls.map(location => ({
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
                      ...visibleRatings.map(rating => ({
                        value: String(rating),
                        label: `${rating} Star${rating !== 1 ? 's' : ''}`
                      }))
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
                      ...visibleMealTypes.map(mealType => ({
                        value: mealType,
                        label: mealType
                      }))
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
            );
          })()}

          {posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">No creations yet</div>
              <div className="empty-state-message">
                Share your meals to create posts!
              </div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No creations match your filters</div>
              <div className="empty-state-message">
                Try adjusting your filter criteria.
              </div>
            </div>
          ) : (
            <>
              <p style={{ marginBottom: '1rem', color: '#666' }}>
                Showing {filteredPosts.length} of {posts.length} {posts.length === 1 ? 'creation' : 'creations'}
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
                  className="profile-back-button"
                  onClick={() => {
                    setSelectedFriend(null);
                    setFriendPosts([]);
                  }}
                  style={{ marginBottom: '1.5rem' }}
                >
                  <ArrowLeft size={20} />
                  Back to Friends
                </button>
                <div className="profile-detail-header-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2>{selectedFriend.name}</h2>
                      <p style={{ color: '#666', marginTop: '0.5rem' }}>
                        {selectedFriend.email} {selectedFriend.residence && `• ${selectedFriend.residence}`}
                      </p>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setFriendToRemove(selectedFriend);
                          setShowUnfriendModal(true);
                        }}
                      >
                        Unfriend
                      </button>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                  {friendPosts.length} {friendPosts.length === 1 ? 'creation' : 'creations'}
                </p>
                {friendPosts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <div className="empty-state-title">No creations yet</div>
                    <div className="empty-state-message">
                      This user hasn't shared any meals yet.
                    </div>
                  </div>
                ) : (
                  friendPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))
                )}

                <ConfirmModal
                  isOpen={showUnfriendModal}
                  onClose={() => {
                    setShowUnfriendModal(false);
                    setFriendToRemove(null);
                  }}
                  onConfirm={handleConfirmUnfriend}
                  title="Remove Friend"
                  message={`Are you sure you want to remove ${friendToRemove?.name || 'this user'} as a friend?`}
                  confirmText="Remove Friend"
                  cancelText="Cancel"
                  isDangerous={true}
                />
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
                          handleRemoveFriend(friend.id, friend.name);
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
                className="profile-back-button"
                onClick={() => {
                  setSelectedLocation(null);
                  setLocationPosts([]);
                }}
                style={{ marginBottom: '1.5rem' }}
              >
                <ArrowLeft size={20} />
                Back to Dining Halls
              </button>
              <div className="profile-detail-header-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h2>{selectedLocation.locationName}</h2>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const isFollowing = followedDiningHalls.some(
                        hall => hall.locationId === selectedLocation.locationId && 
                                hall.locationName === selectedLocation.locationName
                      );
                      return isFollowing ? (
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setLocationToUnfollow({
                              locationId: selectedLocation.locationId,
                              locationName: selectedLocation.locationName
                            });
                            setShowUnfollowModal(true);
                          }}
                        >
                          Unfollow
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={() => handleFollowDiningHall(selectedLocation.locationId, selectedLocation.locationName)}
                        >
                          Follow
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                {locationPosts.length} {locationPosts.length === 1 ? 'creation' : 'creations'}
              </p>
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

      <ConfirmModal
        isOpen={showUnfriendModal}
        onClose={() => {
          setShowUnfriendModal(false);
          setFriendToRemove(null);
        }}
        onConfirm={handleConfirmUnfriend}
        title="Remove Friend"
        message={`Are you sure you want to remove ${friendToRemove?.name || 'this user'} as a friend?`}
        confirmText="Remove Friend"
        cancelText="Cancel"
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={showUnfollowModal}
        onClose={() => {
          setShowUnfollowModal(false);
          setLocationToUnfollow(null);
        }}
        onConfirm={handleConfirmUnfollow}
        title="Unfollow Dining Hall"
        message={`Are you sure you want to unfollow ${locationToUnfollow?.locationName || 'this dining hall'}?`}
        confirmText="Unfollow"
        cancelText="Cancel"
        isDangerous={false}
      />

      {showPostModal && modalPostId && (
        <PostDetail
          postId={modalPostId}
          onClose={() => {
            setShowPostModal(false);
          }}
        />
      )}
    </div>
  );
};

export default SocialProfile;

