import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocations } from '../services/hudsService';
import { updatePost, deletePost } from '../services/socialService';
import CustomSelect from './CustomSelect';
import './CreatePostModal.css';
import './PostHudsCreation.css';

// All 12 houses (including Quincy which has its own menu)
const ALL_HOUSES = [
  'Pforzheimer House',
  'Cabot House',
  'Currier House',
  'Kirkland House',
  'Leverett House',
  'Lowell House',
  'Eliot House',
  'Adams House',
  'Mather House',
  'Dunster House',
  'Winthrop House',
  'Quincy House'
];

// Helper to get local date in YYYY-MM-DD format (avoids UTC timezone issues)
const getLocalDateString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

// Helper to ensure house names have "House" suffix
const normalizeHouseName = (houseName) => {
  const trimmed = houseName.trim();
  const baseName = trimmed.replace(/\s+House\s*$/i, '').trim();
  const isHouse = ALL_HOUSES.some(base => 
    base.toLowerCase() === baseName.toLowerCase()
  );
  if (isHouse && !trimmed.endsWith('House')) {
    return `${trimmed} House`;
  }
  return trimmed;
};

const EditPostModal = ({ isOpen, onClose, post, onPostUpdated, onPostDeleted }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [diningHalls, setDiningHalls] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({ locationId: '', locationName: '' });
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
  
  // Post display options
  const [showImage, setShowImage] = useState(true);
  const [showItems, setShowItems] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showMealType, setShowMealType] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showReview, setShowReview] = useState(true);
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

  // Initialize form with post data and handle scroll locking
  useEffect(() => {
    if (isOpen) {
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
        const overlay = document.querySelector('.create-post-modal-overlay');
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
  }, [isOpen]);

  // Initialize form with post data
  useEffect(() => {
    if (isOpen && post) {
      // Set meal date (format YYYY-MM-DD)
      if (post.mealDate) {
        setMealDate(post.mealDate);
      } else {
        setMealDate(getLocalDateString());
      }
      
      setMealType(post.mealType || '');
      setRating(post.rating || 0);
      setReview(post.review || '');
      setIsPublic(post.isPublic !== undefined ? post.isPublic : true);
      
      // Set location
      if (post.locationId && post.locationName) {
        const uniqueId = `${post.locationId}|${post.locationName}`;
        setSelectedLocation({
          locationId: uniqueId,
          locationName: post.locationName
        });
      }
      
      // Initialize display options from post or default to all true
      // Handle both old format (showImage, nutrition.showCalories) and new format (image, calories)
      const options = post.displayOptions || {};
      
      // Check for old format vs new format
      const imageValue = options.image !== undefined ? options.image : (options.showImage !== undefined ? options.showImage : true);
      const itemsValue = options.items !== undefined ? options.items : (options.showItems !== undefined ? options.showItems : true);
      const locationValue = options.location !== undefined ? options.location : (options.showLocation !== undefined ? options.showLocation : true);
      const mealTypeValue = options.mealType !== undefined ? options.mealType : true;
      const ratingValue = options.rating !== undefined ? options.rating : true;
      const reviewValue = options.review !== undefined ? options.review : true;
      
      // Handle nutrition - could be nested or flat
      const caloriesValue = options.calories !== undefined ? options.calories : (options.nutrition?.showCalories !== undefined ? options.nutrition.showCalories : true);
      const proteinValue = options.protein !== undefined ? options.protein : (options.nutrition?.showProtein !== undefined ? options.nutrition.showProtein : true);
      const carbsValue = options.carbs !== undefined ? options.carbs : (options.nutrition?.showCarbs !== undefined ? options.nutrition.showCarbs : true);
      const fatValue = options.fat !== undefined ? options.fat : (options.nutrition?.showFat !== undefined ? options.nutrition.showFat : true);
      const saturatedFatValue = options.saturatedFat !== undefined ? options.saturatedFat : true;
      const transFatValue = options.transFat !== undefined ? options.transFat : true;
      const cholesterolValue = options.cholesterol !== undefined ? options.cholesterol : true;
      const sodiumValue = options.sodium !== undefined ? options.sodium : true;
      const dietaryFiberValue = options.dietaryFiber !== undefined ? options.dietaryFiber : true;
      const sugarsValue = options.sugars !== undefined ? options.sugars : true;
      
      setShowImage(imageValue);
      setShowItems(itemsValue);
      setShowLocation(locationValue);
      setShowMealType(mealTypeValue);
      setShowRating(ratingValue);
      setShowReview(reviewValue);
      setShowCalories(caloriesValue);
      setShowProtein(proteinValue);
      setShowCarbs(carbsValue);
      setShowFat(fatValue);
      setShowSaturatedFat(saturatedFatValue);
      setShowTransFat(transFatValue);
      setShowCholesterol(cholesterolValue);
      setShowSodium(sodiumValue);
      setShowDietaryFiber(dietaryFiberValue);
      setShowSugars(sugarsValue);
    }
  }, [isOpen, post]);

  const loadDiningHalls = useCallback(async () => {
    try {
      const locs = await getLocations();
      
      // Expand locations that contain multiple houses
      const expanded = [];
      locs.forEach(loc => {
        const locationName = loc.location_name;
        
        if (locationName.includes(' and ')) {
          const houses = locationName.split(' and ').map(h => h.trim());
          houses.forEach(house => {
            expanded.push({
              location_number: loc.location_number,
              location_name: normalizeHouseName(house),
              original_name: locationName
            });
          });
        } else {
          expanded.push({
            location_number: loc.location_number,
            location_name: normalizeHouseName(locationName),
            original_name: locationName
          });
        }
      });
      
      setDiningHalls(expanded);
    } catch (err) {
      console.error('Failed to load dining halls:', err);
      setError('Failed to load dining halls');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDiningHalls();
    }
  }, [isOpen, loadDiningHalls]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    if (!selectedLocation.locationId || !selectedLocation.locationName) {
      setError('Please select a dining hall');
      return;
    }

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse locationId to get location_number
      let locationNumber = selectedLocation.locationId;
      if (selectedLocation.locationId.includes('|')) {
        const locationParts = selectedLocation.locationId.split('|');
        locationNumber = locationParts[0];
      }

      if (!locationNumber) {
        setError('Invalid location selected');
        setLoading(false);
        return;
      }

      // Prepare the update data
      const updateData = {
        locationId: locationNumber,
        locationName: selectedLocation.locationName,
        mealDate,
        mealType: mealType || null,
        rating,
        review: review.trim() || null,
        isPublic,
        displayOptions: {
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
        },
      };

      // Try to update the post, refresh token if expired and retry
      let currentToken = accessToken;
      try {
        await updatePost(post.id, updateData, currentToken);
      } catch (err) {
        // If token expired, try refreshing and retrying once
        if (err.message && (err.message.includes('expired') || err.message.includes('invalid token'))) {
          try {
            console.log('Token expired, refreshing...');
            currentToken = await refreshAccessToken();
            await updatePost(post.id, updateData, currentToken);
          } catch (refreshErr) {
            console.error('Failed to refresh token:', refreshErr);
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          throw err;
        }
      }

      onClose();
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (err) {
      console.error('Failed to update post:', err);
      setError(err.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    // Show confirmation modal
    setShowDeleteConfirmationModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteConfirmationModal(false);
    setDeleting(true);
    setError(null);

    try {
      // Try to delete the post, refresh token if expired and retry
      let currentToken = accessToken;
      try {
        await deletePost(post.id, currentToken);
      } catch (err) {
        // If token expired, try refreshing and retrying once
        if (err.message && (err.message.includes('expired') || err.message.includes('invalid token'))) {
          try {
            console.log('Token expired, refreshing...');
            currentToken = await refreshAccessToken();
            await deletePost(post.id, currentToken);
          } catch (refreshErr) {
            console.error('Failed to refresh token:', refreshErr);
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          throw err;
        }
      }

      // Dispatch event to update progress on Home and Insights pages
      // (since deleting a post also deletes its associated meal log)
      window.dispatchEvent(new CustomEvent('mealLogUpdated'));
      
      onClose();
      if (onPostDeleted) {
        onPostDeleted();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError(err.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !post) return null;

  const modalContent = (
    <div className="create-post-modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-post-modal-header">
              <h2>Edit Post</h2>
              <button className="create-post-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="create-post-modal-form">
          {/* Image Preview */}
          {post.image && (
            <div className="create-post-modal-image">
              <img 
                src={post.image.startsWith('http') ? post.image : (post.image.startsWith('data:') ? post.image : `data:image/jpeg;base64,${post.image}`)} 
                alt="Meal" 
              />
            </div>
          )}

          {/* Meal Date */}
          <div className="create-post-modal-field">
            <label htmlFor="meal-date">Meal Date</label>
            <input
              id="meal-date"
              type="date"
              value={mealDate}
              onChange={(e) => setMealDate(e.target.value)}
              className="create-post-modal-date"
              required
            />
          </div>

          {/* Meal Type */}
          <div className="create-post-modal-field">
            <label htmlFor="meal-type">Meal Type</label>
            <CustomSelect
              value={mealType}
              onChange={setMealType}
              options={[
                { value: '', label: 'Select meal type' },
                { value: 'Breakfast', label: 'Breakfast' },
                { value: 'Lunch', label: 'Lunch' },
                { value: 'Dinner', label: 'Dinner' }
              ]}
              placeholder="Select meal type"
            />
          </div>

          {/* Dining Hall Selection */}
          <div className="create-post-modal-field">
            <label htmlFor="dining-hall">Dining Hall</label>
            <CustomSelect
              value={selectedLocation.locationId}
              onChange={(uniqueId) => {
                const selected = diningHalls.find(h => `${h.location_number}|${h.location_name}` === uniqueId);
                setSelectedLocation({
                  locationId: uniqueId,
                  locationName: selected?.location_name || ''
                });
              }}
              options={[
                { value: '', label: 'Select a dining hall' },
                ...diningHalls.map((hall) => {
                  const uniqueId = `${hall.location_number}|${hall.location_name}`;
                  return {
                    value: uniqueId,
                    label: hall.location_name
                  };
                })
              ]}
              placeholder="Select a dining hall"
            />
          </div>

          {/* Star Rating */}
          <div className="create-post-modal-field">
            <label>Rating</label>
            <div className="create-post-modal-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="create-post-modal-star"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <Star
                    size={32}
                    fill={star <= (hoveredRating || rating) ? '#fbbf24' : 'none'}
                    stroke={star <= (hoveredRating || rating) ? '#fbbf24' : '#d1d5db'}
                    className={star <= (hoveredRating || rating) ? 'star-filled' : 'star-empty'}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="create-post-modal-rating-text">{rating} / 5</span>
              )}
            </div>
          </div>

          {/* Review/Comment Input */}
          <div className="create-post-modal-field">
            <label htmlFor="review">Review</label>
            <textarea
              id="review"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this meal..."
              rows={4}
              className="create-post-modal-textarea"
            />
          </div>

          {/* Public/Private Toggle */}
          <div className="create-post-modal-field">
            <label htmlFor="post-visibility">Post Visibility</label>
            <CustomSelect
              value={isPublic ? 'public' : 'private'}
              onChange={(value) => setIsPublic(value === 'public')}
              options={[
                { value: 'public', label: 'Public - Visible to everyone' },
                { value: 'private', label: 'Private - Only visible to you' }
              ]}
              placeholder="Select visibility"
            />
          </div>

          {/* Display Options - Chip-based UI */}
          <div className="display-options-section">
            <label>What to Show in Post</label>
            
            <div className="display-options-chips">
              {/* Selected chips */}
              <div className="selected-chips">
                {showImage && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowImage(false)}>
                    <span className="chip-text">Image</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showItems && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowItems(false)}>
                    <span className="chip-text">Food Items</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showLocation && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowLocation(false)}>
                    <span className="chip-text">Location</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showMealType && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowMealType(false)}>
                    <span className="chip-text">Meal Type</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showRating && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowRating(false)}>
                    <span className="chip-text">Rating</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showReview && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowReview(false)}>
                    <span className="chip-text">Review</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showCalories && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowCalories(false)}>
                    <span className="chip-text">Calories</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showProtein && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowProtein(false)}>
                    <span className="chip-text">Protein</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showCarbs && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowCarbs(false)}>
                    <span className="chip-text">Carbs</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showFat && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowFat(false)}>
                    <span className="chip-text">Fat</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showSaturatedFat && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowSaturatedFat(false)}>
                    <span className="chip-text">Saturated Fat</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showTransFat && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowTransFat(false)}>
                    <span className="chip-text">Trans Fat</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showCholesterol && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowCholesterol(false)}>
                    <span className="chip-text">Cholesterol</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showSodium && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowSodium(false)}>
                    <span className="chip-text">Sodium</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showDietaryFiber && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowDietaryFiber(false)}>
                    <span className="chip-text">Dietary Fiber</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
                {showSugars && (
                  <button type="button" className="chip chip-selected" onClick={() => setShowSugars(false)}>
                    <span className="chip-text">Sugars</span>
                    <X size={14} className="chip-icon" />
                  </button>
                )}
              </div>

              {/* Available chips */}
              {(!showImage || !showItems || !showLocation || !showMealType || !showRating || !showReview || !showCalories || !showProtein || !showCarbs || !showFat || !showSaturatedFat || !showTransFat || !showCholesterol || !showSodium || !showDietaryFiber || !showSugars) && (
                <div className="available-chips">
                  {!showImage && (
                    <button type="button" className="chip chip-available" onClick={() => setShowImage(true)}>
                      <span className="chip-text">+ Image</span>
                    </button>
                  )}
                  {!showItems && (
                    <button type="button" className="chip chip-available" onClick={() => setShowItems(true)}>
                      <span className="chip-text">+ Food Items</span>
                    </button>
                  )}
                  {!showLocation && (
                    <button type="button" className="chip chip-available" onClick={() => setShowLocation(true)}>
                      <span className="chip-text">+ Location</span>
                    </button>
                  )}
                  {!showMealType && (
                    <button type="button" className="chip chip-available" onClick={() => setShowMealType(true)}>
                      <span className="chip-text">+ Meal Type</span>
                    </button>
                  )}
                  {!showRating && (
                    <button type="button" className="chip chip-available" onClick={() => setShowRating(true)}>
                      <span className="chip-text">+ Rating</span>
                    </button>
                  )}
                  {!showReview && (
                    <button type="button" className="chip chip-available" onClick={() => setShowReview(true)}>
                      <span className="chip-text">+ Review</span>
                    </button>
                  )}
                  {!showCalories && (
                    <button type="button" className="chip chip-available" onClick={() => setShowCalories(true)}>
                      <span className="chip-text">+ Calories</span>
                    </button>
                  )}
                  {!showProtein && (
                    <button type="button" className="chip chip-available" onClick={() => setShowProtein(true)}>
                      <span className="chip-text">+ Protein</span>
                    </button>
                  )}
                  {!showCarbs && (
                    <button type="button" className="chip chip-available" onClick={() => setShowCarbs(true)}>
                      <span className="chip-text">+ Carbs</span>
                    </button>
                  )}
                  {!showFat && (
                    <button type="button" className="chip chip-available" onClick={() => setShowFat(true)}>
                      <span className="chip-text">+ Fat</span>
                    </button>
                  )}
                  {!showSaturatedFat && (
                    <button type="button" className="chip chip-available" onClick={() => setShowSaturatedFat(true)}>
                      <span className="chip-text">+ Saturated Fat</span>
                    </button>
                  )}
                  {!showTransFat && (
                    <button type="button" className="chip chip-available" onClick={() => setShowTransFat(true)}>
                      <span className="chip-text">+ Trans Fat</span>
                    </button>
                  )}
                  {!showCholesterol && (
                    <button type="button" className="chip chip-available" onClick={() => setShowCholesterol(true)}>
                      <span className="chip-text">+ Cholesterol</span>
                    </button>
                  )}
                  {!showSodium && (
                    <button type="button" className="chip chip-available" onClick={() => setShowSodium(true)}>
                      <span className="chip-text">+ Sodium</span>
                    </button>
                  )}
                  {!showDietaryFiber && (
                    <button type="button" className="chip chip-available" onClick={() => setShowDietaryFiber(true)}>
                      <span className="chip-text">+ Dietary Fiber</span>
                    </button>
                  )}
                  {!showSugars && (
                    <button type="button" className="chip chip-available" onClick={() => setShowSugars(true)}>
                      <span className="chip-text">+ Sugars</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="create-post-modal-error">{error}</div>
          )}

          <div className="create-post-modal-actions">
            <button
              type="button"
              onClick={handleDelete}
              className="create-post-modal-delete"
              disabled={loading || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="create-post-modal-cancel"
              disabled={loading || deleting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-post-modal-submit"
              disabled={loading || deleting}
            >
              {loading ? 'Updating...' : 'Update'}
            </button>
            </div>
          </form>
        </div>
      </div>
  );

  const deleteModalContent = showDeleteConfirmationModal ? (
    <div className="create-post-modal-overlay" onClick={() => setShowDeleteConfirmationModal(false)}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal-header">
          <h2>Confirm Delete</h2>
          <button className="create-post-modal-close" onClick={() => setShowDeleteConfirmationModal(false)}>×</button>
        </div>

        <div className="create-post-modal-content">
          <div className="delete-confirmation-message">
            Are you sure you want to delete this post? This action cannot be undone.
          </div>
        </div>

        <div className="create-post-modal-actions">
          <button
            className="create-post-modal-cancel"
            onClick={() => setShowDeleteConfirmationModal(false)}
          >
            Cancel
          </button>
          <button
            className="create-post-modal-delete"
            onClick={handleConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {createPortal(modalContent, document.body)}
      {createPortal(deleteModalContent, document.body)}
    </>
  );
};

export default EditPostModal;

