import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateMealLog } from '../services/mealLogService';
import { getLocations } from '../services/hudsService';
import CustomSelect from './CustomSelect';
import './CreatePostModal.css';

const EditMealLogModal = ({ isOpen, onClose, onSuccess, mealLog }) => {
  const { accessToken } = useAuth();
  const [mealName, setMealName] = useState('');
  const [mealDate, setMealDate] = useState('');
  const [mealType, setMealType] = useState('');
  const [selectedLocation, setSelectedLocation] = useState({ locationId: '', locationName: '' });
  const [diningHalls, setDiningHalls] = useState([]);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
              location_name: house.trim(),
            });
          });
        } else {
          expanded.push({
            location_number: loc.location_number,
            location_name: locationName,
          });
        }
      });
      
      setDiningHalls(expanded);
    } catch (err) {
      console.error('Failed to load dining halls:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDiningHalls();
    }
  }, [isOpen, loadDiningHalls]);

  useEffect(() => {
    if (isOpen && mealLog) {
      setMealName(mealLog.mealName || '');
      setMealDate(mealLog.mealDate ? new Date(mealLog.mealDate).toISOString().split('T')[0] : '');
      
      // Capitalize meal type to match dropdown options (Breakfast, Lunch, Dinner)
      const capitalizedMealType = mealLog.mealType 
        ? mealLog.mealType.charAt(0).toUpperCase() + mealLog.mealType.slice(1).toLowerCase()
        : '';
      setMealType(capitalizedMealType);
      
      setRating(mealLog.rating || 0);
      setReview(mealLog.review || '');
      setError(null);
    }
  }, [isOpen, mealLog]);

  // Set location after dining halls are loaded
  useEffect(() => {
    if (isOpen && mealLog && diningHalls.length > 0) {
      if (mealLog.locationId && mealLog.locationName) {
        // Find matching hall in the expanded list
        const matchingHall = diningHalls.find(hall => 
          hall.location_number === mealLog.locationId || 
          hall.location_name === mealLog.locationName
        );
        
        if (matchingHall) {
          setSelectedLocation({
            locationId: `${matchingHall.location_number}|${matchingHall.location_name}`,
            locationName: matchingHall.location_name
          });
        } else {
          // Fallback: construct the ID even if not found in list
          setSelectedLocation({
            locationId: `${mealLog.locationId}|${mealLog.locationName}`,
            locationName: mealLog.locationName
          });
        }
      }
    }
  }, [isOpen, mealLog, diningHalls]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!mealLog) return;
    
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
      // Extract location number from locationId format "number|name"
      const [locationNumber, locationName] = selectedLocation.locationId.split('|');
      
      const updatedData = {
        mealName,
        mealDate,
        mealType: mealType.toLowerCase(),
        locationId: locationNumber || selectedLocation.locationId,
        locationName: locationName || selectedLocation.locationName,
        rating,
        review,
      };

      await updateMealLog(mealLog.id, updatedData, accessToken);
      
      // Success - notify parent with updated data
      if (onSuccess) {
        onSuccess({
          ...mealLog,
          ...updatedData,
        });
      }
    } catch (err) {
      console.error('Error updating meal log:', err);
      setError(err.message || 'Failed to update meal log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mealLog) return null;

  const displayRating = hoveredRating || rating;

  return (
    <div className="create-post-modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal-header">
          <h2>Edit Meal Log</h2>
          <button
            className="create-post-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form className="create-post-modal-form" onSubmit={handleSubmit}>
          {mealLog.imageUrl && (
            <div className="create-post-modal-image">
              <img src={mealLog.imageUrl} alt="Meal" />
            </div>
          )}

          <div className="create-post-modal-field">
            <label>Meal Name</label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Enter meal name"
              className="create-post-modal-input"
              required
            />
          </div>

          <div className="create-post-modal-field">
            <label>Dining Hall</label>
            <CustomSelect
              value={selectedLocation.locationId}
              onChange={(value) => {
                const selected = diningHalls.find(hall => 
                  `${hall.location_number}|${hall.location_name}` === value
                );
                setSelectedLocation({
                  locationId: value,
                  locationName: selected?.location_name || ''
                });
              }}
              options={[
                { value: '', label: 'Select a dining hall' },
                ...diningHalls.map((hall) => ({
                  value: `${hall.location_number}|${hall.location_name}`,
                  label: hall.location_name
                }))
              ]}
              placeholder="Select a dining hall"
            />
          </div>

          <div className="create-post-modal-row">
            <div className="create-post-modal-field">
              <label>Date</label>
              <input
                type="date"
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="create-post-modal-date"
                required
              />
            </div>

            <div className="create-post-modal-field">
              <label>Meal Type</label>
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
          </div>

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
                    fill={star <= displayRating ? '#fbbf24' : 'none'}
                    stroke={star <= displayRating ? '#fbbf24' : '#d1d5db'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="create-post-modal-field">
            <label>Review (optional)</label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your thoughts about this meal..."
              className="create-post-modal-textarea"
              rows={4}
            />
          </div>

          {error && (
            <div className="create-post-modal-error">
              {error}
            </div>
          )}

          <div className="create-post-modal-actions">
            <button
              type="button"
              className="create-post-modal-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-post-modal-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader size={18} className="spinner-icon" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMealLogModal;

