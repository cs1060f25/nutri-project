import React, { useState, useEffect, useCallback } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocations } from '../services/hudsService';
import { saveMealLog } from '../services/mealLogService';
import { getUserProfile } from '../services/profileService';
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

// Freshman dorms that eat at Annenberg
const FRESHMAN_DORMS = [
  'Apley Court',
  'Canaday Hall',
  'Grays Hall',
  'Greenough Hall',
  'Hollis Hall',
  'Holworthy Hall',
  'Hurlbut Hall',
  'Lionel Hall',
  'Mower Hall',
  'Massachusetts Hall',
  'Matthews Hall',
  'Pennypacker Hall',
  'Stoughton Hall',
  'Straus Hall',
  'Thayer Hall',
  'Weld Hall',
  'Wigglesworth Hall'
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

// Auto-detect meal type based on East Coast US time
const getMealTypeFromTime = () => {
  // Get current time in Eastern Time
  const now = new Date();
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const etTime = etFormatter.format(now);
  const [hours, minutes] = etTime.split(':').map(Number);
  const timeInMinutes = hours * 60 + minutes;
  
  // 12:00 AM - 11:29 AM (0 - 689 minutes)
  if (timeInMinutes >= 0 && timeInMinutes < 690) {
    return 'Breakfast';
  }
  // 11:30 AM - 4:59 PM (690 - 1079 minutes)
  if (timeInMinutes >= 690 && timeInMinutes < 1080) {
    return 'Lunch';
  }
  // 5:00 PM - 11:59 PM (1080 - 1439 minutes)
  if (timeInMinutes >= 1080 && timeInMinutes < 1440) {
    return 'Dinner';
  }
  
  // Default to breakfast if somehow outside 24-hour range
  return 'Breakfast';
};

// Get current date in Eastern Time
const getEasternDate = () => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get date parts in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  
  return `${year}-${month}-${day}`;
};

const SaveLogModal = ({ isOpen, onClose, onSuccess, scanData, imageUrl, imageFile }) => {
  const { accessToken, user } = useAuth();
  const [userResidence, setUserResidence] = useState(null);
  const [diningHalls, setDiningHalls] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({ locationId: '', locationName: '' });
  const [mealDate, setMealDate] = useState(getEasternDate());
  const [mealType, setMealType] = useState('');
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

      // Set user's residence as default dining hall if available
      // Try user.residence first, then userResidence state (from profile)
      const residence = user?.residence || userResidence;
      if (residence && expanded.length > 0) {
        let targetDiningHall = residence;
        
        // If user is in a freshman dorm, default to Annenberg Hall
        if (FRESHMAN_DORMS.includes(targetDiningHall)) {
          targetDiningHall = 'Annenberg Hall';
        }
        
        const normalizedTarget = normalizeHouseName(targetDiningHall);
        
        // Try multiple matching strategies
        let matchingHall = expanded.find(hall => 
          hall.location_name.toLowerCase() === normalizedTarget.toLowerCase()
        );
        
        // If no exact match, try without "House" suffix
        if (!matchingHall) {
          const targetWithoutHouse = normalizedTarget.replace(/\s+House\s*$/i, '').trim();
          matchingHall = expanded.find(hall => {
            const hallWithoutHouse = hall.location_name.replace(/\s+House\s*$/i, '').trim();
            return hallWithoutHouse.toLowerCase() === targetWithoutHouse.toLowerCase();
          });
        }
        
        // If still no match, try partial match
        if (!matchingHall) {
          matchingHall = expanded.find(hall => 
            hall.location_name.toLowerCase().includes(normalizedTarget.toLowerCase()) ||
            normalizedTarget.toLowerCase().includes(hall.location_name.toLowerCase())
          );
        }
        
        if (matchingHall) {
          const uniqueId = `${matchingHall.location_number}|${matchingHall.location_name}`;
          setSelectedLocation({
            locationId: uniqueId,
            locationName: matchingHall.location_name
          });
          console.log('Auto-selected dining hall:', matchingHall.location_name, 'from user residence:', residence);
        } else {
          console.log('Could not find matching dining hall for residence:', residence, 'Normalized:', normalizedTarget);
          console.log('Available dining halls:', expanded.map(h => h.location_name));
        }
      } else {
        console.log('User residence not available:', residence, 'or no dining halls loaded');
      }
    } catch (err) {
      console.error('Failed to load dining halls:', err);
      setError('Failed to load dining halls');
    }
  }, [user, userResidence]);

  // Fetch user profile to get residence if not in user object
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (accessToken && !user?.residence) {
        try {
          const profile = await getUserProfile();
          if (profile?.residence) {
            setUserResidence(profile.residence);
          }
        } catch (err) {
          console.error('Failed to fetch user profile:', err);
        }
      } else if (user?.residence) {
        setUserResidence(user.residence);
      }
    };
    
    if (isOpen) {
      fetchUserProfile();
    }
  }, [isOpen, accessToken, user]);

  useEffect(() => {
    if (isOpen) {
      loadDiningHalls();
      
      // Set current date in Eastern Time
      const easternDate = getEasternDate();
      console.log('Setting meal date to Eastern Time:', easternDate);
      setMealDate(easternDate);
      
      // Auto-detect meal type based on current time
      const detectedMealType = getMealTypeFromTime();
      setMealType(detectedMealType);
    } else {
      // Reset form when modal closes
      setSelectedLocation({ locationId: '', locationName: '' });
      setMealDate(getEasternDate());
      setMealType('');
      setRating(0);
      setReview('');
      setError(null);
    }
  }, [isOpen, loadDiningHalls]);

  const compressImage = (dataUrl, maxSizeMB = 0.3, maxWidth = 800, maxHeight = 800) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        
        const compressWithQuality = (quality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              
              if (blob.size > maxSizeBytes && quality > 0.3) {
                compressWithQuality(quality - 0.1);
              } else {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        compressWithQuality(0.7);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  };

  const handleSubmit = async (e) => {
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
      // Compress image if available
      let compressedImageUrl = null;
      if (imageUrl) {
        try {
          const originalSizeMB = (imageUrl.length * 3 / 4 / 1024 / 1024);
          if (originalSizeMB > 0.3) {
            compressedImageUrl = await compressImage(imageUrl);
          } else {
            compressedImageUrl = imageUrl;
          }
        } catch (compressionError) {
          console.error('Image compression failed:', compressionError);
        }
      }

      // Extract location number from locationId format "number|name"
      const [locationNumber, locationName] = selectedLocation.locationId.split('|');

      // Create meal log data
      const mealLogData = {
        mealDate,
        mealType: mealType.toLowerCase(),
        mealName: `${mealType} at ${locationName || selectedLocation.locationName}`,
        timestamp: new Date().toISOString(),
        locationId: locationNumber || selectedLocation.locationId,
        locationName: locationName || selectedLocation.locationName,
        rating,
        review,
        items: scanData?.matchedItems?.map(item => ({
          recipeId: item.recipeId || `scanned-${Date.now()}`,
          recipeName: item.matchedName || item.predictedName,
          servings: item.estimatedServings || 1,
          portionDescription: item.portionDescription,
          calories: item.calories || 0,
          protein: item.protein || 0,
          carbs: item.carbs || 0,
          fat: item.fat || 0,
        })) || [],
      };

      // Add image if available
      if (compressedImageUrl) {
        mealLogData.imageUrl = compressedImageUrl;
      }

      // Save meal log
      await saveMealLog(mealLogData, accessToken);

      // Success - close modal and notify parent
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Error saving meal log:', err);
      setError(err.message || 'Failed to save meal log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayRating = hoveredRating || rating;

  return (
    <div className="create-post-modal-overlay" onClick={onClose}>
      <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-post-modal-header">
          <h2>Save Log</h2>
          <button
            className="create-post-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        <form className="create-post-modal-form" onSubmit={handleSubmit}>
          {imageUrl && (
            <div className="create-post-modal-image">
              <img src={imageUrl} alt="Meal" />
            </div>
          )}

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

          <button
            type="submit"
            className="create-post-modal-submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Log'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SaveLogModal;

