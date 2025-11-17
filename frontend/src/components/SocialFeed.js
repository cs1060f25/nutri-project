import React, { useState, useEffect, useCallback } from 'react';
import { Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFeedPosts, getDiningHallFeedPosts } from '../services/socialService';
import PostCard from './PostCard';
import CustomSelect from './CustomSelect';
import '../pages/Social.css';

const SocialFeed = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'dining-halls'
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterDiningHall, setFilterDiningHall] = useState('');
  const [filterVisibility, setFilterVisibility] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [filterMealType, setFilterMealType] = useState('');

  // Filter posts based on filter criteria
  useEffect(() => {
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
  }, [posts, filterDiningHall, filterVisibility, filterRating, filterMealType]);

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
            Filter
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
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No posts yet</div>
          <div className="empty-state-message">
            {emptyMessage}
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
            <PostCard key={post.id} post={post} />
          ))}
        </>
      )}
    </div>
  );
};

export default SocialFeed;

