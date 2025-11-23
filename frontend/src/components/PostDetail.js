import React, { useState, useEffect, useCallback } from 'react';
import { X, ThumbsUp, ThumbsDown, Send, Star } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './PostDetail.css';

const PostDetail = ({ postId, onClose }) => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
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

  const displayOptions = post?.displayOptions || {
    image: true,
    items: true,
    location: true,
    mealType: true,
    rating: true,
    review: true,
    calories: true,
    protein: true,
    carbs: true,
    fat: true,
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

  return (
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
                  <button
                    type="button"
                    className="post-user-name clickable"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (post.userId) {
                        navigate(`/home/social/user/${post.userId}`, {
                          state: { fromModal: true, postId, returnPath: location.pathname }
                        });
                        onClose();
                      }
                    }}
                  >
                    {post.userName}
                  </button>
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
            {post.image && displayOptions.image && (
              <div className="post-detail-image">
                <img 
                  src={post.image.startsWith('http') ? post.image : (post.image.startsWith('data:') ? post.image : `data:image/jpeg;base64,${post.image}`)} 
                  alt="Meal" 
                />
              </div>
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
                  const nutritionParts = [];
                  
                  if (displayOptions.calories && item.calories !== undefined) {
                    nutritionParts.push(`${Math.round(Number(item.calories) || 0)} cal`);
                  }
                  if (displayOptions.protein && item.protein !== undefined) {
                    nutritionParts.push(`${Math.round(Number(item.protein) || 0)}g protein`);
                  }
                  if (displayOptions.carbs && (item.carbs !== undefined || item.totalCarbs !== undefined || item.totalCarb !== undefined)) {
                    const carbs = item.carbs !== undefined ? item.carbs : (item.totalCarbs !== undefined ? item.totalCarbs : item.totalCarb);
                    nutritionParts.push(`${Math.round(Number(carbs) || 0)}g carbs`);
                  }
                  if (displayOptions.fat && (item.fat !== undefined || item.totalFat !== undefined)) {
                    const fat = item.fat !== undefined ? item.fat : item.totalFat;
                    nutritionParts.push(`${Math.round(Number(fat) || 0)}g fat`);
                  }

                  return (
                    <div key={index} className="post-item">
                      <div className="post-item-name">{item.recipeName}</div>
                      {nutritionParts.length > 0 && (
                        <div className="post-item-nutrition">
                          {nutritionParts.join(' • ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nutritional Totals */}
          {post.totals && (displayOptions.calories || displayOptions.protein || displayOptions.carbs || displayOptions.fat) && (
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
};

export default PostDetail;

