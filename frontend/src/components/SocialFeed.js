import React, { useState, useEffect } from 'react';
import { Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { getFeedPosts, getDiningHallFeedPosts } from '../services/socialService';
import PostCard from './PostCard';
import PostDetail from './PostDetail';
import CustomSelect from './CustomSelect';
import '../pages/Social.css';

const SocialFeed = () => {
  const { accessToken } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'dining-halls'
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [modalPostId, setModalPostId] = useState(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterDiningHall, setFilterDiningHall] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterMealType, setFilterMealType] = useState('');

  // Check if we should open a post modal (from "Back to Post" navigation)
  useEffect(() => {
    if (location.state?.openPostModal && location.state?.postId) {
      setModalPostId(location.state.postId);
      setShowPostModal(true);
      // Clear the state to prevent reopening on re-render
      window.history.replaceState({ ...location.state, openPostModal: false }, '');
    }
  }, [location.state]);

  // Filter posts based on filter criteria
  useEffect(() => {
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
  }, [posts, filterDiningHall, filterRating, filterMealType]);

  // Reset filter visibility when switching tabs
  useEffect(() => {
    setShowFilters(false);
  }, [activeTab]);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!accessToken) return;

      try {
        setLoading(true);
        let data;
        if (activeTab === 'friends') {
          data = await getFeedPosts(50, accessToken);
        } else {
          data = await getDiningHallFeedPosts(50, accessToken);
        }
        const postsList = data.posts || [];
        setPosts(postsList);
        setFilteredPosts(postsList);
      } catch (err) {
        // Treat errors as no posts instead of showing error message
        console.error('Error fetching feed:', err);
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [accessToken, activeTab]);

  if (loading) {
    return (
      <div className="loading">
        <p>Loading feed...</p>
      </div>
    );
  }

  const emptyMessage = activeTab === 'friends' 
    ? 'Start following friends to see their posts in your feed!'
    : 'Follow dining halls to see posts from those locations!';

  return (
    <div className="social-feed">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
        <button
          className={`btn ${activeTab === 'friends' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends
        </button>
        <button
          className={`btn ${activeTab === 'dining-halls' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dining-halls')}
        >
          Dining Halls
        </button>
      </div>
        {posts.length > 0 && (
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
            {(filterDiningHall || filterRating || filterMealType) && (
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
                {(filterDiningHall ? 1 : 0) + (filterRating ? 1 : 0) + (filterMealType ? 1 : 0)}
              </span>
            )}
          </button>
        )}
      </div>

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

          {(filterDiningHall || filterRating || filterMealType) && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFilterDiningHall('');
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
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No creations yet</div>
          <div className="empty-state-message">
            {emptyMessage}
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
          <PostCard key={post.id} post={post} />
          ))}
        </>
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

export default SocialFeed;

