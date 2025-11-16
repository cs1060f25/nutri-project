import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFeedPosts, getDiningHallFeedPosts } from '../services/socialService';
import PostCard from './PostCard';
import '../pages/Social.css';

const SocialFeed = () => {
  const { accessToken } = useAuth();
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'dining-halls'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        setPosts(data.posts || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching feed:', err);
        setError(err.message);
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

  if (error) {
    return (
      <div className="empty-state">
        <p>Error loading feed: {error}</p>
      </div>
    );
  }

  const emptyMessage = activeTab === 'friends' 
    ? 'Start following friends to see their posts in your feed!'
    : 'Follow dining halls to see posts from those locations!';

  return (
    <div className="social-feed">
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
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

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">No posts yet</div>
          <div className="empty-state-message">
            {emptyMessage}
          </div>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      )}
    </div>
  );
};

export default SocialFeed;

