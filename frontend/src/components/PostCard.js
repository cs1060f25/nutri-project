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
            {post.items.map((item, index) => {
              // Build nutrition details array
              const nutritionDetails = [];
              
              if (item.quantity > 1) {
                nutritionDetails.push(`${item.quantity}x`);
              }
              if (item.servingSize) {
                nutritionDetails.push(item.servingSize);
              }
              if (item.calories !== undefined && item.calories !== null) {
                nutritionDetails.push(`${Math.round(Number(item.calories) || 0)} cal`);
              }
              if (item.protein !== undefined && item.protein !== null) {
                nutritionDetails.push(`${Math.round(Number(item.protein) || 0)}g protein`);
              }
              if (item.carbs !== undefined && item.carbs !== null) {
                nutritionDetails.push(`${Math.round(Number(item.carbs) || 0)}g carbs`);
              } else if (item.totalCarb !== undefined && item.totalCarb !== null) {
                // Handle both carbs and totalCarb for backward compatibility
                const carbValue = typeof item.totalCarb === 'string' 
                  ? parseFloat(item.totalCarb.replace(/[^0-9.]/g, '')) 
                  : Number(item.totalCarb) || 0;
                nutritionDetails.push(`${Math.round(carbValue)}g carbs`);
              }
              if (item.fat !== undefined && item.fat !== null) {
                nutritionDetails.push(`${Math.round(Number(item.fat) || 0)}g fat`);
              } else if (item.totalFat !== undefined && item.totalFat !== null) {
                // Handle both fat and totalFat for backward compatibility
                const fatValue = typeof item.totalFat === 'string' 
                  ? parseFloat(item.totalFat.replace(/[^0-9.]/g, '')) 
                  : Number(item.totalFat) || 0;
                nutritionDetails.push(`${Math.round(fatValue)}g fat`);
              }
              if (item.saturatedFat !== undefined && item.saturatedFat !== null && item.saturatedFat !== '0g' && item.saturatedFat !== 0) {
                const satFatValue = typeof item.saturatedFat === 'string' 
                  ? parseFloat(item.saturatedFat.replace(/[^0-9.]/g, '')) 
                  : Number(item.saturatedFat) || 0;
                if (satFatValue > 0) {
                  nutritionDetails.push(`${Math.round(satFatValue)}g sat fat`);
                }
              }
              if (item.cholesterol !== undefined && item.cholesterol !== null && item.cholesterol !== '0mg' && item.cholesterol !== 0) {
                const cholValue = typeof item.cholesterol === 'string' 
                  ? parseFloat(item.cholesterol.replace(/[^0-9.]/g, '')) 
                  : Number(item.cholesterol) || 0;
                if (cholValue > 0) {
                  nutritionDetails.push(`${Math.round(cholValue)}mg cholesterol`);
                }
              }
              if (item.sodium !== undefined && item.sodium !== null && item.sodium !== '0mg' && item.sodium !== 0) {
                const sodiumValue = typeof item.sodium === 'string' 
                  ? parseFloat(item.sodium.replace(/[^0-9.]/g, '')) 
                  : Number(item.sodium) || 0;
                if (sodiumValue > 0) {
                  nutritionDetails.push(`${Math.round(sodiumValue)}mg sodium`);
                }
              }
              if (item.dietaryFiber !== undefined && item.dietaryFiber !== null && item.dietaryFiber !== '0g' && item.dietaryFiber !== 0) {
                const fiberValue = typeof item.dietaryFiber === 'string' 
                  ? parseFloat(item.dietaryFiber.replace(/[^0-9.]/g, '')) 
                  : Number(item.dietaryFiber) || 0;
                if (fiberValue > 0) {
                  nutritionDetails.push(`${Math.round(fiberValue)}g fiber`);
                }
              }
              if (item.sugars !== undefined && item.sugars !== null && item.sugars !== '0g' && item.sugars !== 0) {
                const sugarsValue = typeof item.sugars === 'string' 
                  ? parseFloat(item.sugars.replace(/[^0-9.]/g, '')) 
                  : Number(item.sugars) || 0;
                if (sugarsValue > 0) {
                  nutritionDetails.push(`${Math.round(sugarsValue)}g sugars`);
                }
              }
              
              return (
              <div key={index} className="post-item">
                <div className="post-item-name">{item.recipeName}</div>
                <div className="post-item-details">
                    {nutritionDetails.join(' • ')}
                  </div>
                </div>
              );
            })}
              </div>
          </div>
        )}

        {post.totals && (
          <div className="post-totals">
            <div className="post-totals-title">Nutritional Totals</div>
            <div className="post-totals-grid">
              {post.totals.calories !== undefined && post.totals.calories !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Calories</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.calories) || 0)}</div>
                </div>
              )}
              {post.totals.protein !== undefined && post.totals.protein !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Protein</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.protein) || 0)}g</div>
                </div>
              )}
              {(post.totals.totalCarb !== undefined && post.totals.totalCarb !== null) || (post.totals.carbs !== undefined && post.totals.carbs !== null) ? (
                <div className="post-total-item">
                  <div className="post-total-label">Carbs</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.totalCarb || post.totals.carbs || 0))}g</div>
                </div>
              ) : null}
              {post.totals.totalFat !== undefined && post.totals.totalFat !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Fat</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.totalFat) || 0)}g</div>
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

