import React, { useState, useEffect } from 'react';
import { Star, Edit, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EditPostModal from './EditPostModal';
import PostDetail from './PostDetail';
import '../pages/Social.css';

const PostCard = ({ post, showDelete = false, onPostUpdated, onPostDeleted, showVisibility = false }) => {
  const { user, accessToken } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [isVoting, setIsVoting] = useState(false);
  const [localUpvotes, setLocalUpvotes] = useState(post?.upvotes || []);
  const [localDownvotes, setLocalDownvotes] = useState(post?.downvotes || []);

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
    });
  };

  const canEdit = showDelete && (user?.id === post.userId || user?.uid === post.userId);
  const isOwnPost = user?.id === post.userId || user?.uid === post.userId;

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

  // Get display options (defaults to showing everything if not set)
  // Handle both old format (showImage, nutrition.showCalories) and new format (image, calories)
  const options = post.displayOptions || {};
  const displayOptions = {
    image: options.image !== undefined ? options.image : (options.showImage !== undefined ? options.showImage : true),
    items: options.items !== undefined ? options.items : (options.showItems !== undefined ? options.showItems : true),
    location: options.location !== undefined ? options.location : (options.showLocation !== undefined ? options.showLocation : true),
    mealType: options.mealType !== undefined ? options.mealType : true,
    rating: options.rating !== undefined ? options.rating : true,
    review: options.review !== undefined ? options.review : true,
    calories: options.calories !== undefined ? options.calories : (options.nutrition?.showCalories !== undefined ? options.nutrition.showCalories : true),
    protein: options.protein !== undefined ? options.protein : (options.nutrition?.showProtein !== undefined ? options.nutrition.showProtein : true),
    carbs: options.carbs !== undefined ? options.carbs : (options.nutrition?.showCarbs !== undefined ? options.nutrition.showCarbs : true),
    fat: options.fat !== undefined ? options.fat : (options.nutrition?.showFat !== undefined ? options.nutrition.showFat : true),
  };

  const handleCardClick = (e) => {
    // Don't open modal if clicking on the edit button, vote buttons, or comment button
    if (e.target.closest('.btn') || e.target.closest('button') || e.target.closest('.post-vote-button') || e.target.closest('.post-comment-button')) {
      return;
    }
    setShowDetailModal(true);
  };

  // Fetch comment count
  useEffect(() => {
    const fetchCommentCount = async () => {
      if (!accessToken || !post?.id) return;
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${post.id}/comments`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setCommentCount(data.count || 0);
        }
      } catch (err) {
        console.error('Error fetching comment count:', err);
      }
    };

    fetchCommentCount();
  }, [post?.id, accessToken]);

  // Sync local vote state when post prop changes
  useEffect(() => {
    setLocalUpvotes(post?.upvotes || []);
    setLocalDownvotes(post?.downvotes || []);
  }, [post?.upvotes, post?.downvotes]);

  const handleUpvote = async (e) => {
    e.stopPropagation();
    if (!accessToken || !post || isVoting || isOwnPost) return;

    const userId = user?.id || user?.uid;
    if (!userId) return;

    // Optimistically update UI
    const currentUpvotes = [...localUpvotes];
    const currentDownvotes = [...localDownvotes];
    const wasUpvoted = currentUpvotes.includes(userId);
    const wasDownvoted = currentDownvotes.includes(userId);

    if (wasUpvoted) {
      // Remove upvote
      setLocalUpvotes(currentUpvotes.filter(id => id !== userId));
    } else {
      // Add upvote and remove downvote if exists
      if (!currentUpvotes.includes(userId)) {
        setLocalUpvotes([...currentUpvotes, userId]);
      }
      if (wasDownvoted) {
        setLocalDownvotes(currentDownvotes.filter(id => id !== userId));
      }
    }

    try {
      setIsVoting(true);
      const url = `${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${post.id}/upvote`;
      console.log('Upvoting post:', post.id, 'URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upvote failed:', response.status, errorText);
        // Revert on error
        setLocalUpvotes(post?.upvotes || []);
        setLocalDownvotes(post?.downvotes || []);
        throw new Error(`Failed to upvote: ${response.status} ${errorText}`);
      }
      
      console.log('Upvote successful');
      
      // Refresh the post data if callback exists
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (err) {
      console.error('Error upvoting:', err);
      // State already reverted above
    } finally {
      setIsVoting(false);
    }
  };

  const handleDownvote = async (e) => {
    e.stopPropagation();
    if (!accessToken || !post || isVoting || isOwnPost) return;

    const userId = user?.id || user?.uid;
    if (!userId) return;

    // Optimistically update UI
    const currentUpvotes = [...localUpvotes];
    const currentDownvotes = [...localDownvotes];
    const wasUpvoted = currentUpvotes.includes(userId);
    const wasDownvoted = currentDownvotes.includes(userId);

    if (wasDownvoted) {
      // Remove downvote
      setLocalDownvotes(currentDownvotes.filter(id => id !== userId));
    } else {
      // Add downvote and remove upvote if exists
      if (!currentDownvotes.includes(userId)) {
        setLocalDownvotes([...currentDownvotes, userId]);
      }
      if (wasUpvoted) {
        setLocalUpvotes(currentUpvotes.filter(id => id !== userId));
      }
    }

    try {
      setIsVoting(true);
      const url = `${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${post.id}/downvote`;
      console.log('Downvoting post:', post.id, 'URL:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Downvote failed:', response.status, errorText);
        // Revert on error
        setLocalUpvotes(post?.upvotes || []);
        setLocalDownvotes(post?.downvotes || []);
        throw new Error(`Failed to downvote: ${response.status} ${errorText}`);
      }
      
      console.log('Downvote successful');
      
      // Refresh the post data if callback exists
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (err) {
      console.error('Error downvoting:', err);
      // State already reverted above
    } finally {
      setIsVoting(false);
    }
  };

  const hasUpvoted = localUpvotes.includes(user?.id || user?.uid);
  const hasDownvoted = localDownvotes.includes(user?.id || user?.uid);
  const upvoteCount = localUpvotes.length;
  const downvoteCount = localDownvotes.length;

  return (
    <>
    <div className="post-card" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <div className="post-header">
        <div className="post-avatar">{getInitials(post.userName)}</div>
        <div className="post-user-info">
          <div className="post-user-name">{post.userName}</div>
          <div className="post-meta">
            <span className="post-meta-chip">Posted on {formatDate(post.createdAt || post.timestamp)}</span>
            {post.loggedDate && (
              <span className="post-meta-chip">Logged on {formatDate(post.loggedDate)}</span>
            )}
            {displayOptions.location && post.locationName && (
              <span className="post-meta-chip">{post.locationName}</span>
            )}
            {displayOptions.mealType && post.mealType && (
              <span className="post-meta-chip post-meal-type-chip">{post.mealType}</span>
            )}
            {showVisibility && (
              <span className="post-meta-chip">
                {(post.isPublic === false || post.isPublic === 'false') ? 'Private' : 'Public'}
              </span>
            )}
            </div>
          </div>
          {canEdit && (
          <button
              className="btn post-edit-button post-edit-button-desktop"
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
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
      {canEdit && (
        <button
          className="btn post-edit-button post-edit-button-mobile"
          onClick={(e) => {
            e.stopPropagation();
            setShowEditModal(true);
          }}
          title="Edit post"
        >
          <Edit size={16} />
          Edit
        </button>
      )}

      <div className="post-content">

        {/* Meal section - show if image is enabled and exists */}
        {post.image && displayOptions.image && (
          <div className="post-meal-section">
            <h3 className="post-section-header">Meal</h3>
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
          </div>
        )}

        {/* Meal section header (when no image) */}
        {(!post.image || !displayOptions.image) && (
          <div className="post-meal-section">
            <h3 className="post-section-header">Meal</h3>
          </div>
        )}

        {/* Star Rating */}
        {displayOptions.rating && post.rating && (
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
        )}

        {/* Review/Comment */}
        {displayOptions.review && (
          <div className="post-review-section">
            <h3 className="post-section-header">Review</h3>
            <div className="post-review">
              <p className="post-review-text">
                {post.review ? post.review : <em>No review</em>}
              </p>
            </div>
          </div>
        )}

        {/* Food Items with Nutrition Values */}
        {post.items && post.items.length > 0 && displayOptions.items && (
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
              if (displayOptions.calories && item.calories !== undefined && item.calories !== null) {
                nutritionDetails.push(`${Math.round(Number(item.calories) || 0)} cal`);
              }
              if (displayOptions.protein && item.protein !== undefined && item.protein !== null) {
                nutritionDetails.push(`${Math.round(Number(item.protein) || 0)}g protein`);
              }
              if (displayOptions.carbs) {
                if (item.carbs !== undefined && item.carbs !== null) {
                  nutritionDetails.push(`${Math.round(Number(item.carbs) || 0)}g carbs`);
                } else if (item.totalCarb !== undefined && item.totalCarb !== null) {
                  // Handle both carbs and totalCarb for backward compatibility
                  const carbValue = typeof item.totalCarb === 'string' 
                    ? parseFloat(item.totalCarb.replace(/[^0-9.]/g, '')) 
                    : Number(item.totalCarb) || 0;
                  nutritionDetails.push(`${Math.round(carbValue)}g carbs`);
                }
              }
              if (displayOptions.fat) {
                if (item.fat !== undefined && item.fat !== null) {
                  nutritionDetails.push(`${Math.round(Number(item.fat) || 0)}g fat`);
                } else if (item.totalFat !== undefined && item.totalFat !== null) {
                  // Handle both fat and totalFat for backward compatibility
                  const fatValue = typeof item.totalFat === 'string' 
                    ? parseFloat(item.totalFat.replace(/[^0-9.]/g, '')) 
                    : Number(item.totalFat) || 0;
                  nutritionDetails.push(`${Math.round(fatValue)}g fat`);
                }
              }
              if (displayOptions.fat && item.saturatedFat !== undefined && item.saturatedFat !== null && item.saturatedFat !== '0g' && item.saturatedFat !== 0) {
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

        {post.totals && (displayOptions.calories || displayOptions.protein || displayOptions.carbs || displayOptions.fat) && (
          <div className="post-totals">
            <div className="post-totals-title">Nutritional Totals</div>
            <div className="post-totals-grid">
              {displayOptions.calories && post.totals.calories !== undefined && post.totals.calories !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Calories</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.calories) || 0)}</div>
                </div>
              )}
              {displayOptions.protein && post.totals.protein !== undefined && post.totals.protein !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Protein</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.protein) || 0)}g</div>
                </div>
              )}
              {displayOptions.carbs && ((post.totals.totalCarb !== undefined && post.totals.totalCarb !== null) || (post.totals.carbs !== undefined && post.totals.carbs !== null)) ? (
                <div className="post-total-item">
                  <div className="post-total-label">Carbs</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.totalCarb || post.totals.carbs || 0))}g</div>
                </div>
              ) : null}
              {displayOptions.fat && post.totals.totalFat !== undefined && post.totals.totalFat !== null && (
                <div className="post-total-item">
                  <div className="post-total-label">Fat</div>
                  <div className="post-total-value">{Math.round(Number(post.totals.totalFat) || 0)}g</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vote and Comment Actions */}
        <div className="post-actions-bar">
          <button 
            className={`post-vote-button upvote-button ${hasUpvoted ? 'active' : ''} ${isOwnPost ? 'disabled' : ''}`}
            onClick={handleUpvote}
            disabled={isVoting || isOwnPost}
            title={isOwnPost ? "You can't vote on your own post" : "Upvote"}
          >
            <ThumbsUp size={18} />
            <span>{upvoteCount}</span>
          </button>
          <button 
            className={`post-vote-button downvote-button ${hasDownvoted ? 'active' : ''} ${isOwnPost ? 'disabled' : ''}`}
            onClick={handleDownvote}
            disabled={isVoting || isOwnPost}
            title={isOwnPost ? "You can't vote on your own post" : "Downvote"}
          >
            <ThumbsDown size={18} />
            <span>{downvoteCount}</span>
          </button>
          <button 
            className="post-comment-button"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetailModal(true);
            }}
            title="View comments"
          >
            <MessageCircle size={18} />
            <span>{commentCount}</span>
          </button>
        </div>
      </div>
    </div>

      <EditPostModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        post={post}
        onPostUpdated={handlePostUpdated}
        onPostDeleted={handlePostDeleted}
      />
      
      {showDetailModal && (
        <PostDetail
          postId={post.id}
          onClose={async () => {
            setShowDetailModal(false);
            // Refresh comment count when modal closes
            if (accessToken && post?.id) {
              try {
                const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${post.id}/comments`, {
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                  },
                });
                if (response.ok) {
                  const data = await response.json();
                  setCommentCount(data.count || 0);
                }
              } catch (err) {
                console.error('Error fetching comment count:', err);
              }
            }
          }}
        />
      )}
    </>
  );
};

export default PostCard;

