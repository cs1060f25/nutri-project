import React, { useState, useEffect, useCallback } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocations } from '../services/hudsService';
import { updatePost, deletePost } from '../services/socialService';
import CustomSelect from './CustomSelect';
import './CreatePostModal.css';

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

  // Initialize form with post data
  useEffect(() => {
    if (isOpen && post) {
      // Set meal date (format YYYY-MM-DD)
      if (post.mealDate) {
        setMealDate(post.mealDate);
      } else {
        setMealDate(new Date().toISOString().split('T')[0]);
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
      alert('Post updated successfully!');
    } catch (err) {
      console.error('Failed to update post:', err);
      setError(err.message || 'Failed to update post');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

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

      onClose();
      if (onPostDeleted) {
        onPostDeleted();
      }
      alert('Post deleted successfully!');
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError(err.message || 'Failed to delete post');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
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
              <img src={post.image} alt="Meal" />
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
};

export default EditPostModal;

