import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ThumbsUp, ThumbsDown, Send, Star } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostDetail.css';

const PostDetail = ({ postId, onClose }) => {
  const { accessToken, user } = useAuth();
  // Navigation hooks available for future use
  // eslint-disable-next-line no-unused-vars
  const navigate = useNavigate();
  // eslint-disable-next-line no-unused-vars
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState(null);

  const fetchPostDetails = useCallback(async () => {
    if (!accessToken || !postId) return;

    try {
      setLoading(true);
      // Fetch post details
      const postResponse = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!postResponse.ok) throw new Error('Failed to fetch post');
      const postData = await postResponse.json();
      setPost(postData.post);

      // Fetch comments
      const commentsResponse = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${postId}/comments`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(commentsData.comments || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId, accessToken]);

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  // Handle scroll locking when modal is open
  useEffect(() => {
    if (postId) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Lock body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Prevent body from scrolling and maintain scroll position
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
      
      // Scroll overlay to top to ensure modal is centered in viewport
      setTimeout(() => {
        const overlay = document.querySelector('.post-detail-modal-overlay');
        if (overlay) {
          overlay.scrollTop = 0;
        }
      }, 0);
      
      // Cleanup: restore body scroll when modal closes
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.paddingRight = originalPaddingRight;
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [postId]);

  const handleUpvote = async () => {
    if (!accessToken || !post || isOwnPost) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${postId}/upvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to upvote');
      
      // Refresh post to get updated vote counts
      fetchPostDetails();
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  const handleDownvote = async () => {
    if (!accessToken || !post || isOwnPost) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${postId}/downvote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) throw new Error('Failed to downvote');
      
      // Refresh post to get updated vote counts
      fetchPostDetails();
    } catch (err) {
      console.error('Error downvoting:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !accessToken) return;

    try {
      setCommenting(true);
      const response = await fetch(`${process.env.REACT_APP_API_BASE || ''}/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: newComment.trim() }),
      });

      if (!response.ok) throw new Error('Failed to add comment');
      
      setNewComment('');
      // Refresh comments
      fetchPostDetails();
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setCommenting(false);
    }
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

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const options = post?.displayOptions || {};
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
    saturatedFat: options.saturatedFat !== undefined ? options.saturatedFat : true,
    transFat: options.transFat !== undefined ? options.transFat : true,
    cholesterol: options.cholesterol !== undefined ? options.cholesterol : true,
    sodium: options.sodium !== undefined ? options.sodium : true,
    dietaryFiber: options.dietaryFiber !== undefined ? options.dietaryFiber : true,
    sugars: options.sugars !== undefined ? options.sugars : true,
  };

  // Ensure upvotes and downvotes are arrays
  const upvotes = Array.isArray(post?.upvotes) ? post.upvotes : [];
  const downvotes = Array.isArray(post?.downvotes) ? post.downvotes : [];
  const userId = user?.id || user?.uid;
  
  const hasUpvoted = userId && upvotes.includes(userId);
  const hasDownvoted = userId && downvotes.includes(userId);
  const upvoteCount = upvotes.length;
  const downvoteCount = downvotes.length;
  const isOwnPost = userId && (userId === post?.userId);

  if (!postId) return null;

  const modalContent = (
    <div className="post-detail-modal-overlay" onClick={onClose}>
      <div className="post-detail-modal" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="post-detail-loading">
            <p>Loading post...</p>
          </div>
        ) : error || !post ? (
          <div className="post-detail-error">
            <p>Failed to load post</p>
            <button onClick={onClose} className="btn">Close</button>
          </div>
        ) : (
          <>
            {/* Header with user info and close button */}
            <div className="post-detail-modal-header">
              <div className="post-detail-user-header">
                <div className="post-avatar">{getInitials(post.userName)}</div>
                <div>
                  <div className="post-user-name">
                    {post.userName}
                  </div>
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
                  </div>
                </div>
              </div>
              <button className="post-detail-close" onClick={onClose} aria-label="Close">
                <X size={24} />
              </button>
            </div>

            <div className="post-detail-content">
              <div className="post-detail-container">
                {/* Post Content */}
                <div className="post-detail-card">

          {/* Meal Section */}
          <div className="post-detail-section">
            <h3>Meal</h3>
            {post.image && displayOptions.image ? (
              <div className="post-detail-image">
                <img 
                  src={post.image.startsWith('http') ? post.image : (post.image.startsWith('data:') ? post.image : `data:image/jpeg;base64,${post.image}`)} 
                  alt="Meal" 
                />
              </div>
            ) : (
              <p style={{ fontStyle: 'italic', color: '#6b7280', marginTop: '0.5rem' }}>No image provided</p>
            )}
          </div>

          {/* Rating */}
          {displayOptions.rating && post.rating && (
            <div className="post-detail-section">
              <h3>Rating</h3>
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
                <span style={{ marginLeft: '8px' }}>{post.rating} / 5</span>
              </div>
            </div>
          )}

          {/* Review */}
          {displayOptions.review && post.review && (
            <div className="post-detail-section">
              <h3>Review</h3>
              <p className="post-review-text">{post.review}</p>
            </div>
          )}

          {/* Food Items */}
          {post.items && post.items.length > 0 && displayOptions.items && (
            <div className="post-detail-section">
              <h3>Food Items</h3>
              <div className="post-items">
                {post.items.map((item, index) => {
                  // Build nutrition details array
                  const nutritionDetails = [];
                  
                  // Quantity removed - don't show quantity multiplier
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
                    } else if (item.totalCarbs !== undefined && item.totalCarbs !== null) {
                      // Handle both carbs and totalCarbs for backward compatibility
                      const carbValue = typeof item.totalCarbs === 'string' 
                        ? parseFloat(item.totalCarbs.replace(/[^0-9.]/g, '')) 
                        : Number(item.totalCarbs) || 0;
                      nutritionDetails.push(`${Math.round(carbValue)}g carbs`);
                    } else if (item.totalCarb !== undefined && item.totalCarb !== null) {
                      // Handle legacy totalCarb key
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
                      <div className="meal-item-macros">
                        {nutritionDetails.map((detail, detailIndex) => (
                          <span key={detailIndex} className="nutrition-chip">{detail}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nutritional Totals */}
          {post.totals && (displayOptions.calories || displayOptions.protein || displayOptions.carbs || displayOptions.fat || displayOptions.saturatedFat || displayOptions.transFat || displayOptions.cholesterol || displayOptions.sodium || displayOptions.dietaryFiber || displayOptions.sugars) && (
            <div className="post-detail-section">
              <h3>Nutritional Totals</h3>
              <div className="post-totals-grid">
                {displayOptions.calories && post.totals.calories !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Calories</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.calories).replace(/[^0-9.]/g, '')) || 0)}</div>
                  </div>
                )}
                {displayOptions.protein && post.totals.protein !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Protein</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.protein).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.carbs && (post.totals.totalCarbs !== undefined || post.totals.totalCarb !== undefined) && (
                  <div className="post-total-item">
                    <div className="post-total-label">Carbs</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.totalCarbs || post.totals.totalCarb).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.fat && post.totals.totalFat !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Fat</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.totalFat).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.saturatedFat && post.totals.saturatedFat !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Saturated Fat</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.saturatedFat).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.transFat && post.totals.transFat !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Trans Fat</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.transFat).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.cholesterol && post.totals.cholesterol !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Cholesterol</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.cholesterol).replace(/[^0-9.]/g, '')) || 0)}mg</div>
                  </div>
                )}
                {displayOptions.sodium && post.totals.sodium !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Sodium</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.sodium).replace(/[^0-9.]/g, '')) || 0)}mg</div>
                  </div>
                )}
                {displayOptions.dietaryFiber && post.totals.dietaryFiber !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Dietary Fiber</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.dietaryFiber).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
                {displayOptions.sugars && post.totals.sugars !== undefined && (
                  <div className="post-total-item">
                    <div className="post-total-label">Sugars</div>
                    <div className="post-total-value">{Math.round(parseFloat(String(post.totals.sugars).replace(/[^0-9.]/g, '')) || 0)}g</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vote Buttons */}
          <div className="post-detail-actions">
            <button 
              className={`vote-button upvote-button ${hasUpvoted ? 'active' : ''} ${isOwnPost ? 'disabled' : ''}`}
              onClick={handleUpvote}
              disabled={isOwnPost}
              title={isOwnPost ? "You can't vote on your own post" : "Upvote"}
            >
              <ThumbsUp size={18} />
              <span>{upvoteCount}</span>
            </button>
            <button 
              className={`vote-button downvote-button ${hasDownvoted ? 'active' : ''} ${isOwnPost ? 'disabled' : ''}`}
              onClick={handleDownvote}
              disabled={isOwnPost}
              title={isOwnPost ? "You can't vote on your own post" : "Downvote"}
            >
              <ThumbsDown size={18} />
              <span>{downvoteCount}</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <h3>Comments ({comments.length})</h3>
          
          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="add-comment-form">
            <div className="comment-input-container">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                disabled={commenting}
              />
              <button 
                type="submit" 
                disabled={!newComment.trim() || commenting}
                className="send-comment-button"
              >
                <Send size={18} />
                {commenting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>

          {/* Comments List */}
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div className="comment-header">
                    <div className="comment-avatar">{getInitials(comment.userName)}</div>
                    <div>
                      <div className="comment-user-name">{comment.userName}</div>
                      <div className="comment-timestamp">{formatDate(comment.timestamp)}</div>
                    </div>
                  </div>
                  <p className="comment-text">{comment.comment}</p>
                </div>
              ))
            )}
          </div>
        </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PostDetail;

