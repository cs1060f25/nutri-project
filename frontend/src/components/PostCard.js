import React from 'react';
import { useAuth } from '../context/AuthContext';
import { deletePost } from '../services/socialService';
import '../pages/Social.css';

const PostCard = ({ post, showDelete = false }) => {
  const { accessToken, user } = useAuth();
  const [deleting, setDeleting] = React.useState(false);

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      setDeleting(true);
      await deletePost(post.id, accessToken);
      // Remove from parent component's state
      window.location.reload(); // Simple refresh for now
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete post: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = showDelete && (user?.id === post.userId || user?.uid === post.userId);

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-avatar">{getInitials(post.userName)}</div>
        <div className="post-user-info">
          <div className="post-user-name">{post.userName}</div>
          <div className="post-meta">
            {formatDate(post.timestamp)} •{' '}
            <span className="post-location">{post.locationName}</span>
          </div>
        </div>
        {canDelete && (
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleting}
            style={{ marginLeft: 'auto' }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>

      <div className="post-content">
        <div className="post-meal-type">{post.mealName || post.mealType}</div>

        {post.items && post.items.length > 0 && (
          <div className="post-items">
            {post.items.map((item, index) => (
              <div key={index} className="post-item">
                <div className="post-item-name">{item.recipeName}</div>
                <div className="post-item-details">
                  {item.quantity > 1 && `${item.quantity}x `}
                  {item.servingSize && `${item.servingSize} • `}
                  {item.calories && `${item.calories} cal`}
                </div>
              </div>
            ))}
          </div>
        )}

        {post.totals && (
          <div className="post-totals">
            <div className="post-totals-title">Nutritional Totals</div>
            <div className="post-totals-grid">
              {post.totals.calories && (
                <div className="post-total-item">
                  <div className="post-total-label">Calories</div>
                  <div className="post-total-value">{post.totals.calories}</div>
                </div>
              )}
              {post.totals.protein && (
                <div className="post-total-item">
                  <div className="post-total-label">Protein</div>
                  <div className="post-total-value">{post.totals.protein}</div>
                </div>
              )}
              {post.totals.totalCarb && (
                <div className="post-total-item">
                  <div className="post-total-label">Carbs</div>
                  <div className="post-total-value">{post.totals.totalCarb}</div>
                </div>
              )}
              {post.totals.totalFat && (
                <div className="post-total-item">
                  <div className="post-total-label">Fat</div>
                  <div className="post-total-value">{post.totals.totalFat}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;

