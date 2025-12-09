import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Calendar, MapPin, Star, Loader, X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMealLogs, updateMealLog } from '../services/mealLogService';
import { createPost, getPostsByUser } from '../services/socialService';
import CustomSelect from './CustomSelect';
import PostDetail from './PostDetail';
import './PostHudsCreation.css';

const PostHudsCreation = () => {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [postedMealIds, setPostedMealIds] = useState(new Set());
  const [mealIdToPostId, setMealIdToPostId] = useState(new Map());
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);

  // Editable fields
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  
  // Post display options
  const [showImage, setShowImage] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showMealType, setShowMealType] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showReview, setShowReview] = useState(true);
  
  // Nutrition display options (specific nutrients)
  const [showCalories, setShowCalories] = useState(true);
  const [showProtein, setShowProtein] = useState(true);
  const [showCarbs, setShowCarbs] = useState(true);
  const [showFat, setShowFat] = useState(true);
  const [showSaturatedFat, setShowSaturatedFat] = useState(true);
  const [showTransFat, setShowTransFat] = useState(true);
  const [showCholesterol, setShowCholesterol] = useState(true);
  const [showSodium, setShowSodium] = useState(true);
  const [showDietaryFiber, setShowDietaryFiber] = useState(true);
  const [showSugars, setShowSugars] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      const response = await getMealLogs({}, accessToken);
      setLogs(response.meals || []);
      
      // Fetch user's posts to see which meal logs have been posted
      try {
        const postsResponse = await getPostsByUser(user.id || user.uid, 1000, accessToken);
        const postedIds = new Set();
        const mealToPostMap = new Map();
        
        postsResponse.posts
          .filter(post => post.mealId)
          .forEach(post => {
            postedIds.add(post.mealId);
            mealToPostMap.set(post.mealId, post.id);
          });
        
        setPostedMealIds(postedIds);
        setMealIdToPostId(mealToPostMap);
      } catch (postsErr) {
        console.error('Failed to load posts:', postsErr);
        // Continue even if posts fail to load
      }
    } catch (err) {
      setError('Failed to load meal logs');
    } finally {
      setLoading(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSelectLog = (log) => {
    setSelectedLog(log);
    setRating(log.rating || 0);
    setReview(log.review || '');
    setIsPublic(true);
    setShowEditForm(true);
    setError('');
    setSuccess('');
  };

  const handlePost = async (e) => {
    e.preventDefault();
    
    if (!selectedLog) return;
    
    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setPosting(true);
    setError('');
    setSuccess('');

    try {
      // First, update the meal log with any changes
      const updates = {
        rating,
        review,
      };
      
      await updateMealLog(selectedLog.id, updates, accessToken);
      
      // Then create a social post referencing this meal log with display options
      const displayOptions = {
        image: showImage,
        items: showItems,
        location: showLocation,
        mealType: showMealType,
        rating: showRating,
        review: showReview,
        calories: showCalories,
        protein: showProtein,
        carbs: showCarbs,
        fat: showFat,
        saturatedFat: showSaturatedFat,
        transFat: showTransFat,
        cholesterol: showCholesterol,
        sodium: showSodium,
        dietaryFiber: showDietaryFiber,
        sugars: showSugars,
      };
      
      await createPost(selectedLog.id, accessToken, isPublic, displayOptions);
      
      // Redirect to social feed
      navigate('/home/social/feed');
    } catch (err) {
      setError(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleCancel = () => {
    setShowEditForm(false);
    setSelectedLog(null);
    setRating(0);
    setReview('');
    setError('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const displayRating = hoveredRating || rating;

  if (loading) {
    return (
      <div className="post-huds-loading">
        <div className="spinner" />
        <p>Loading your meal logs...</p>
      </div>
    );
  }

  if (!showEditForm) {
    return (
      <div className="post-huds-container">
        <div className="post-huds-header">
          <h2>Select a Meal Log to Post</h2>
          <p>Choose from your past meals to share with the community</p>
        </div>

        {success && (
          <div className="post-huds-success">
            {success}
          </div>
        )}

        {logs.length === 0 ? (
          <div className="post-huds-empty">
            <Calendar size={64} />
            <h3>No Meal Logs Yet</h3>
            <p>Start by scanning and logging meals from the Food Scanner</p>
          </div>
        ) : (
          <div className="meal-logs-grid">
            {[...logs].sort((a, b) => {
              const aIsPosted = postedMealIds.has(a.id);
              const bIsPosted = postedMealIds.has(b.id);
              // Unposted meals (false) come before posted meals (true)
              if (aIsPosted === bIsPosted) return 0;
              return aIsPosted ? 1 : -1;
            }).map((log) => {
              const isPosted = postedMealIds.has(log.id);
              const postId = mealIdToPostId.get(log.id);
              const handleClick = () => {
                console.log('Clicked log:', log.id, 'isPosted:', isPosted, 'postId:', postId);
                if (isPosted && postId) {
                  // Open post modal
                  console.log('Opening modal with postId:', postId);
                  setSelectedPostId(postId);
                  setShowPostModal(true);
                } else {
                  handleSelectLog(log);
                }
              };
              
              return (
                <div
                  key={log.id}
                  className={`meal-log-card-compact ${isPosted ? 'already-posted' : ''}`}
                  onClick={handleClick}
                  style={{ cursor: 'pointer' }}
                >
                  {isPosted && (
                    <div className="posted-badge">
                      <CheckCircle size={16} />
                      <span>Posted</span>
                    </div>
                  )}
                  {log.imageUrl && (
                    <div className="meal-log-card-image">
                      <img src={log.imageUrl} alt={log.mealName} />
                    </div>
                  )}
                  <div className="meal-log-card-content">
                    <h3>{log.mealName}</h3>
                    <div className="meal-log-card-meta">
                      <span className="meal-type-badge">{log.mealType}</span>
                      <span className="meal-date">
                        <Calendar size={14} />
                        {formatDate(log.mealDate)}
                      </span>
                    </div>
                    {log.locationName && (
                      <div className="meal-location">
                        <MapPin size={14} />
                        {log.locationName}
                      </div>
                    )}
                    <div className="meal-log-card-footer">
                      <span>{isPosted ? 'View post' : 'Post this meal'}</span>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Post Detail Modal */}
        {(() => {
          console.log('Modal render check (selection view):', { showPostModal, selectedPostId });
          return showPostModal && selectedPostId ? (
            <PostDetail
              postId={selectedPostId}
              onClose={() => {
                console.log('Closing modal');
                setShowPostModal(false);
                setSelectedPostId(null);
              }}
            />
          ) : null;
        })()}
      </div>
    );
  }

  return (
    <div className="post-huds-container">
      <div className="post-huds-header">
        <h2>Create Post from Meal Log</h2>
        <p>Edit any details before posting to the community</p>
      </div>

      {error && (
        <div className="post-huds-error">
          {error}
        </div>
      )}

      <form className="post-huds-form" onSubmit={handlePost}>
        {selectedLog?.imageUrl && (
          <div className="post-huds-image">
            <img src={selectedLog.imageUrl} alt="Meal" />
          </div>
        )}

        <div className="post-huds-row">
          <div className="post-huds-field">
            <label>Date</label>
            <input
              type="text"
              value={formatDate(selectedLog?.mealDate)}
              disabled
            />
          </div>

          <div className="post-huds-field">
            <label>Meal Type</label>
            <input
              type="text"
              value={selectedLog?.mealType ? selectedLog.mealType.charAt(0).toUpperCase() + selectedLog.mealType.slice(1) : ''}
              disabled
            />
          </div>
        </div>

        <div className="post-huds-field">
          <label>Location</label>
          <input
            type="text"
            value={selectedLog?.locationName || ''}
            disabled
          />
        </div>

        <div className="post-huds-field">
          <label>Rating</label>
          <div className="post-huds-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="post-huds-star"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
              >
                <Star
                  size={32}
                  fill={star <= displayRating ? '#fbbf24' : 'none'}
                  stroke={star <= displayRating ? '#fbbf24' : '#d1d5db'}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="post-huds-field">
          <label>Review</label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your thoughts about this meal..."
            rows={4}
          />
        </div>

        <div className="post-huds-field">
          <label>Visibility</label>
          <CustomSelect
            value={isPublic ? 'public' : 'private'}
            onChange={(value) => setIsPublic(value === 'public')}
            options={[
              { value: 'public', label: '🌍 Public - Anyone can see' },
              { value: 'private', label: '🔒 Private - Only friends' }
            ]}
          />
        </div>

        <div className="post-huds-field">
          <label>What to Show in Post</label>
          
          {/* Selected items as removable chips */}
          <div className="post-display-chips-selected">
            {selectedLog?.imageUrl && showImage && (
              <div className="post-display-chip selected" onClick={() => setShowImage(false)}>
                <span>Image</span>
                <X size={14} />
              </div>
            )}
            {showItems && (
              <div className="post-display-chip selected" onClick={() => setShowItems(false)}>
                <span>Food Items</span>
                <X size={14} />
              </div>
            )}
            {showLocation && (
              <div className="post-display-chip selected" onClick={() => setShowLocation(false)}>
                <span>Location</span>
                <X size={14} />
              </div>
            )}
            {showMealType && (
              <div className="post-display-chip selected" onClick={() => setShowMealType(false)}>
                <span>Meal Type</span>
                <X size={14} />
              </div>
            )}
            {showRating && (
              <div className="post-display-chip selected" onClick={() => setShowRating(false)}>
                <span>Rating</span>
                <X size={14} />
              </div>
            )}
            {showReview && (
              <div className="post-display-chip selected" onClick={() => setShowReview(false)}>
                <span>Review</span>
                <X size={14} />
              </div>
            )}
            {showCalories && (
              <div className="post-display-chip selected" onClick={() => setShowCalories(false)}>
                <span>Calories</span>
                <X size={14} />
              </div>
            )}
            {showProtein && (
              <div className="post-display-chip selected" onClick={() => setShowProtein(false)}>
                <span>Protein</span>
                <X size={14} />
              </div>
            )}
            {showCarbs && (
              <div className="post-display-chip selected" onClick={() => setShowCarbs(false)}>
                <span>Carbs</span>
                <X size={14} />
              </div>
            )}
            {showFat && (
              <div className="post-display-chip selected" onClick={() => setShowFat(false)}>
                <span>Fat</span>
                <X size={14} />
              </div>
            )}
            {showSaturatedFat && (
              <div className="post-display-chip selected" onClick={() => setShowSaturatedFat(false)}>
                <span>Saturated Fat</span>
                <X size={14} />
              </div>
            )}
            {showTransFat && (
              <div className="post-display-chip selected" onClick={() => setShowTransFat(false)}>
                <span>Trans Fat</span>
                <X size={14} />
              </div>
            )}
            {showCholesterol && (
              <div className="post-display-chip selected" onClick={() => setShowCholesterol(false)}>
                <span>Cholesterol</span>
                <X size={14} />
              </div>
            )}
            {showSodium && (
              <div className="post-display-chip selected" onClick={() => setShowSodium(false)}>
                <span>Sodium</span>
                <X size={14} />
              </div>
            )}
            {showDietaryFiber && (
              <div className="post-display-chip selected" onClick={() => setShowDietaryFiber(false)}>
                <span>Dietary Fiber</span>
                <X size={14} />
              </div>
            )}
            {showSugars && (
              <div className="post-display-chip selected" onClick={() => setShowSugars(false)}>
                <span>Sugars</span>
                <X size={14} />
              </div>
            )}
          </div>

          {/* Available items to add */}
          {(!showImage || !showItems || !showLocation || !showMealType || !showRating || !showReview || !showCalories || !showProtein || !showCarbs || !showFat || !showSaturatedFat || !showTransFat || !showCholesterol || !showSodium || !showDietaryFiber || !showSugars) && (
            <div className="post-display-chips-available">
              <span className="post-display-chips-label">Add to post:</span>
              <div className="post-display-chips-bank">
                {selectedLog?.imageUrl && !showImage && (
                  <div className="post-display-chip available" onClick={() => setShowImage(true)}>
                    <span>Image</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showItems && (
                  <div className="post-display-chip available" onClick={() => setShowItems(true)}>
                    <span>Food Items</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showLocation && (
                  <div className="post-display-chip available" onClick={() => setShowLocation(true)}>
                    <span>Location</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showMealType && (
                  <div className="post-display-chip available" onClick={() => setShowMealType(true)}>
                    <span>Meal Type</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showRating && (
                  <div className="post-display-chip available" onClick={() => setShowRating(true)}>
                    <span>Rating</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showReview && (
                  <div className="post-display-chip available" onClick={() => setShowReview(true)}>
                    <span>Review</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showCalories && (
                  <div className="post-display-chip available" onClick={() => setShowCalories(true)}>
                    <span>Calories</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showProtein && (
                  <div className="post-display-chip available" onClick={() => setShowProtein(true)}>
                    <span>Protein</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showCarbs && (
                  <div className="post-display-chip available" onClick={() => setShowCarbs(true)}>
                    <span>Carbs</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showFat && (
                  <div className="post-display-chip available" onClick={() => setShowFat(true)}>
                    <span>Fat</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showSaturatedFat && (
                  <div className="post-display-chip available" onClick={() => setShowSaturatedFat(true)}>
                    <span>Saturated Fat</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showTransFat && (
                  <div className="post-display-chip available" onClick={() => setShowTransFat(true)}>
                    <span>Trans Fat</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showCholesterol && (
                  <div className="post-display-chip available" onClick={() => setShowCholesterol(true)}>
                    <span>Cholesterol</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showSodium && (
                  <div className="post-display-chip available" onClick={() => setShowSodium(true)}>
                    <span>Sodium</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showDietaryFiber && (
                  <div className="post-display-chip available" onClick={() => setShowDietaryFiber(true)}>
                    <span>Dietary Fiber</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
                {!showSugars && (
                  <div className="post-display-chip available" onClick={() => setShowSugars(true)}>
                    <span>Sugars</span>
                    <span className="plus-icon">+</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="post-huds-actions">
          <button
            type="button"
            className="post-huds-cancel"
            onClick={handleCancel}
            disabled={posting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="post-huds-submit"
            disabled={posting}
          >
            {posting ? (
              <>
                <Loader size={18} className="spinner-icon" />
                Posting...
              </>
            ) : (
              'Post to Feed'
            )}
          </button>
        </div>
      </form>

      {/* Post Detail Modal */}
      {(() => {
        console.log('Modal render check:', { showPostModal, selectedPostId });
        return showPostModal && selectedPostId ? (
          <PostDetail
            postId={selectedPostId}
            onClose={() => {
              console.log('Closing modal');
              setShowPostModal(false);
              setSelectedPostId(null);
            }}
          />
        ) : null;
      })()}
    </div>
  );
};

export default PostHudsCreation;

