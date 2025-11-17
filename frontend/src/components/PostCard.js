import React, { useState } from 'react';
import { Star, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EditPostModal from './EditPostModal';
import '../pages/Social.css';

const PostCard = ({ post, showDelete = false, onPostUpdated, onPostDeleted, showVisibility = false }) => {
  const { user } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);

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

  const canEdit = showDelete && (user?.id === post.userId || user?.uid === post.userId);

  const handlePostUpdated = () => {
    if (onPostUpdated) {
      onPostUpdated();
    } else {
      window.location.reload();
    }
  };

  const handlePostDeleted = () => {
    if (onPostDeleted) {
      onPostDeleted();
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <div className="post-card">
        <div className="post-header">
          <div className="post-avatar">{getInitials(post.userName)}</div>
          <div className="post-user-info">
            <div className="post-user-name">{post.userName}</div>
            <div className="post-meta">
              {formatDate(post.timestamp)} •{' '}
              <span className="post-location">{post.locationName}</span>
              {showVisibility && (
                <>
                  {' • '}
                  <span className="post-visibility">
                    {(post.isPublic === false || post.isPublic === 'false') ? 'Private' : 'Public'}
                  </span>
                </>
              )}
            </div>
          </div>
          {canEdit && (
            <button
              className="btn"
              onClick={() => setShowEditModal(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.25rem',
                padding: '0.5rem 1rem',
                marginLeft: 'auto'
              }}
              title="Edit post"
            >
              <Edit size={16} />
              Edit
            </button>
          )}
        </div>

      <div className="post-content">
        <div className="post-meal-type">{post.mealName || post.mealType}</div>

        {/* Meal section - show if post has items (from scan) or has image */}
        {(post.items && post.items.length > 0) || post.image ? (
          <div className="post-meal-section">
            <h3 className="post-section-header">Meal</h3>
            {post.image && (
              <div className="post-image-section">
                <div className="post-image">
                  <img 
                    src={post.image.startsWith('http') ? post.image : (post.image.startsWith('data:') ? post.image : `data:image/jpeg;base64,${post.image}`)} 
                    alt="Scanned meal" 
                    onError={(e) => {
                      // Fallback if image fails to load
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Star Rating */}
        <div className="post-rating-section">
          <h3 className="post-section-header">Rating</h3>
          <div className="post-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={20}
                fill={post.rating && star <= post.rating ? '#fbbf24' : 'none'}
                stroke={post.rating && star <= post.rating ? '#fbbf24' : '#d1d5db'}
                style={{ marginRight: '2px' }}
              />
            ))}
            {post.rating && post.rating > 0 && (
              <span style={{ marginLeft: '8px', color: '#6b7280' }}>{post.rating} / 5</span>
            )}
          </div>
        </div>

        {/* Review/Comment */}
        <div className="post-review-section">
          <h3 className="post-section-header">Review</h3>
          <div className="post-review">
            <p className="post-review-text">
              {post.review ? post.review : <em>No review</em>}
            </p>
          </div>
        </div>

        {/* Food Items with Nutrition Values */}
        {post.items && post.items.length > 0 && (
          <div className="post-items-section">
            <h3 className="post-section-header">Food Items</h3>
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

      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={post}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
      />
    </>
  );
};

export default PostCard;

