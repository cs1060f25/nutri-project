import React, { useState, useEffect, useCallback } from 'react';
import { X, Star } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getLocations } from '../services/hudsService';
import { createPostFromScan } from '../services/socialService';
import { saveMealLog } from '../services/mealLogService';
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

const CreatePostModal = ({ isOpen, onClose, onSuccess, scanData, imageUrl, imageFile, initialData }) => {
  const { accessToken, refreshAccessToken } = useAuth();
  const [diningHalls, setDiningHalls] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({ locationId: '', locationName: '' });
  const [mealDate, setMealDate] = useState(initialData?.mealDate || new Date().toISOString().split('T')[0]); // Default to today or initialData
  const [mealType, setMealType] = useState(initialData?.mealType || '');
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [review, setReview] = useState('');
  const [isPublic, setIsPublic] = useState(true); // Default to public
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  
  // Check if this is from meal planning (no imageUrl or imageFile provided)
  const isFromMealPlanning = !imageUrl && !imageFile;

  const loadDiningHalls = useCallback(async () => {
    try {
      const locs = await getLocations();
      
      // Expand locations that contain multiple houses (same logic as Home.js and MealLogger.js)
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
      
      // Pre-fill form if initialData is provided
      if (initialData) {
        if (initialData.mealDate) {
          setMealDate(initialData.mealDate);
        }
        // Capitalize meal type (meal plan uses lowercase, but options use capitalized)
        if (initialData.mealType) {
          const capitalized = initialData.mealType.charAt(0).toUpperCase() + initialData.mealType.slice(1);
          setMealType(capitalized);
        }
      }
    } else {
      // Reset form when modal closes
      setSelectedLocation({ locationId: '', locationName: '' });
      setMealDate(initialData?.mealDate || new Date().toISOString().split('T')[0]);
      setMealType(initialData?.mealType ? (initialData.mealType.charAt(0).toUpperCase() + initialData.mealType.slice(1)) : '');
      setRating(0);
      setReview('');
      setError(null);
      setUploadedImage(null);
      setUploadedImagePreview(null);
    }
  }, [isOpen, loadDiningHalls, initialData]);

  // Set selected location after dining halls are loaded
  useEffect(() => {
    if (isOpen && initialData && diningHalls.length > 0 && initialData.locationId && initialData.locationName) {
      // Find matching dining hall - locationId might be just the number or in format "number|name"
      let locationNumber = initialData.locationId;
      if (initialData.locationId.includes('|')) {
        locationNumber = initialData.locationId.split('|')[0];
      }
      
      // Find the dining hall that matches
      const matchingHall = diningHalls.find(hall => 
        hall.location_number === locationNumber || 
        hall.location_name === initialData.locationName ||
        `${hall.location_number}|${hall.location_name}` === initialData.locationId
      );
      
      if (matchingHall) {
        const uniqueId = `${matchingHall.location_number}|${matchingHall.location_name}`;
        setSelectedLocation({
          locationId: uniqueId,
          locationName: matchingHall.location_name,
        });
      } else {
        // Fallback: try to construct the ID from the provided data
        const uniqueId = `${locationNumber}|${initialData.locationName}`;
        setSelectedLocation({
          locationId: uniqueId,
          locationName: initialData.locationName,
        });
      }
    }
  }, [isOpen, initialData, diningHalls]);

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
      // Helper function to compress image on client side
      const compressImage = (file, maxSizeMB = 0.5, maxWidth = 1200, maxHeight = 1200) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              // Calculate new dimensions
              let width = img.width;
              let height = img.height;
              
              if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
              }

              // Create canvas and draw resized image
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);

              // Convert to blob with quality compression
              const maxSizeBytes = maxSizeMB * 1024 * 1024;
              
              // Try compression with decreasing quality until we're under the limit
              const compressWithQuality = (quality) => {
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      reject(new Error('Failed to compress image'));
                      return;
                    }
                    
                    // If still too large and quality can be reduced, try again with lower quality
                    if (blob.size > maxSizeBytes && quality > 0.3) {
                      compressWithQuality(quality - 0.1);
                    } else {
                      // Convert blob to base64
                      const reader2 = new FileReader();
                      reader2.onload = () => resolve(reader2.result);
                      reader2.onerror = reject;
                      reader2.readAsDataURL(blob);
                    }
                  },
                  'image/jpeg',
                  quality
                );
              };
              
              // Start with 0.75 quality (good balance for smaller file size)
              compressWithQuality(0.75);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });
      };

      // Convert image to base64 if needed, or use the imageUrl
      // Compress images before sending to avoid payload size limits
      let imageBase64 = null;
      if (imageUrl && imageUrl.startsWith('data:')) {
        // If it's already base64, check size and compress if needed
        const base64SizeMB = imageUrl.length * 3 / 4 / 1024 / 1024; // Approximate size
        if (base64SizeMB > 0.5) {
          console.log(`Image is large (${base64SizeMB.toFixed(2)}MB), compressing...`);
          // Convert base64 to blob, then compress
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          imageBase64 = await compressImage(file);
          console.log(`Compressed to approximately ${(imageBase64.length * 3 / 4 / 1024 / 1024).toFixed(2)}MB`);
        } else {
          imageBase64 = imageUrl;
          console.log('Using imageUrl (data URL), size:', (base64SizeMB * 1024 * 1024).toFixed(2), 'MB');
        }
      } else if (imageFile) {
        // Compress file before converting to base64
        console.log('Compressing imageFile before upload...');
        imageBase64 = await compressImage(imageFile);
        console.log('Compressed imageFile to base64, size:', (imageBase64.length * 3 / 4 / 1024 / 1024).toFixed(2), 'MB');
      } else if (uploadedImage) {
        // Compress uploaded image file before converting to base64
        console.log('Compressing uploadedImage before upload...');
        imageBase64 = await compressImage(uploadedImage);
        console.log('Compressed uploadedImage to base64, size:', (imageBase64.length * 3 / 4 / 1024 / 1024).toFixed(2), 'MB');
      } else if (imageUrl) {
        // If we have an imageUrl but it's not base64, try to fetch and convert
        imageBase64 = imageUrl;
        console.log('Using imageUrl (non-data URL), size:', imageBase64?.length || 0);
      }
      
      if (!imageBase64) {
        console.warn('No image data available for post');
      }

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

      // If from meal planning, create only a meal log (not a post)
      if (isFromMealPlanning) {
        // Convert matchedItems to meal log items format
        const mealLogItems = (scanData.matchedItems || []).map(item => ({
          recipeId: item.recipeId || item.id || null,
          recipeName: item.matchedName || item.predictedName || item.name || 'Unknown dish',
          quantity: item.estimatedServings || 1,
          servingSize: item.portionDescription || '1 serving',
          calories: String(item.calories || 0),
          protein: `${item.protein || 0}g`,
          totalCarbs: `${item.carbs || item.totalCarbs || 0}g`,
          totalFat: `${item.fat || item.totalFat || 0}g`,
          saturatedFat: item.saturatedFat ? `${item.saturatedFat}g` : '0g',
          transFat: item.transFat ? `${item.transFat}g` : '0g',
          cholesterol: item.cholesterol ? `${item.cholesterol}mg` : '0mg',
          sodium: item.sodium ? `${item.sodium}mg` : '0mg',
          dietaryFiber: item.dietaryFiber ? `${item.dietaryFiber}g` : '0g',
          sugars: item.sugars ? `${item.sugars}g` : '0g',
        }));

        // totals will be calculated by backend from items
        const mealLogData = {
          mealDate,
          mealType: mealType ? mealType.toLowerCase() : null,
          mealName: mealType || null,
          locationId: locationNumber,
          locationName: selectedLocation.locationName,
          items: mealLogItems,
          // totals will be calculated by backend from items
          timestamp: scanData.timestamp || new Date().toISOString(),
          rating: rating || null,
          review: review.trim() || null,
          savedMealPlanId: scanData.savedMealPlanId || null,
          imageUrl: imageBase64 || null,
        };

        // Try to create the meal log, refresh token if expired and retry
        let currentToken = accessToken;
        try {
          await saveMealLog(mealLogData, currentToken);
          
          // Dispatch event to notify other components (Home, Insights, MealPlanning) to refresh progress
          window.dispatchEvent(new CustomEvent('mealLogUpdated'));
        } catch (err) {
          // If token expired, try refreshing and retrying once
          if (err.message && (err.message.includes('expired') || err.message.includes('invalid token'))) {
            try {
              console.log('Token expired, refreshing...');
              currentToken = await refreshAccessToken();
              await saveMealLog(mealLogData, currentToken);
              
              // Dispatch event after successful creation
              window.dispatchEvent(new CustomEvent('mealLogUpdated'));
            } catch (refreshErr) {
              console.error('Failed to refresh token:', refreshErr);
              throw new Error('Session expired. Please log in again.');
            }
          } else {
            throw err;
          }
        }
      } else {
        // Create a post (from scanner)
        const postData = {
          image: imageBase64,
          locationId: locationNumber,
          locationName: selectedLocation.locationName,
          mealDate,
          mealType: mealType || null,
          rating,
          review: review.trim(), // Send empty string instead of null
          isPublic,
          matchedItems: scanData.matchedItems || [],
          unmatchedDishes: scanData.unmatchedDishes || [],
          nutritionTotals: scanData.nutritionTotals || {
            calories: scanData.calories || 0,
            protein: scanData.protein || 0,
            totalCarbs: scanData.carbs || scanData.totalCarbs || 0,
            totalFat: scanData.fat || scanData.totalFat || 0,
            saturatedFat: scanData.saturatedFat || 0,
            transFat: scanData.transFat || 0,
            cholesterol: scanData.cholesterol || 0,
            sodium: scanData.sodium || 0,
            dietaryFiber: scanData.dietaryFiber || 0,
            sugars: scanData.sugars || 0,
          },
          timestamp: scanData.timestamp || new Date().toISOString(),
        };

        // Try to create the post, refresh token if expired and retry
        let currentToken = accessToken;
        try {
          await createPostFromScan(postData, currentToken);
        } catch (err) {
          // If token expired, try refreshing and retrying once
          if (err.message && (err.message.includes('expired') || err.message.includes('invalid token'))) {
            try {
              console.log('Token expired, refreshing...');
              currentToken = await refreshAccessToken();
              await createPostFromScan(postData, currentToken);
            } catch (refreshErr) {
              console.error('Failed to refresh token:', refreshErr);
              throw new Error('Session expired. Please log in again.');
            }
          } else {
            throw err;
          }
        }
      }

      // Dispatch event to notify other components (Home, Insights) to refresh progress
      window.dispatchEvent(new CustomEvent('mealLogUpdated'));
      
      // Keep modal open during delay, then close and reset scanner
      if (onSuccess) {
        setTimeout(() => {
          onClose();
          onSuccess();
        }, 1000); // 1 second delay with modal open
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const foodItems = [
    ...(scanData?.matchedItems || []).map(item => item.matchedName || item.predictedName),
    ...(scanData?.unmatchedDishes || [])
  ];

  return (
    <>
      {/* Main Create Post Modal */}
      {isOpen && (
        <div className="create-post-modal-overlay" onClick={onClose}>
          <div className="create-post-modal" onClick={(e) => e.stopPropagation()}>
            <div className="create-post-modal-header">
              <h2>Create Post</h2>
              <button className="create-post-modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="create-post-modal-form">
          {/* Image Preview from Food Scanner */}
          {imageUrl && !isFromMealPlanning && (
            <div className="create-post-modal-image">
              <img src={imageUrl} alt="Scanned meal" />
            </div>
          )}

          {/* Image Upload Section (only for meal planning) */}
          {isFromMealPlanning && (
            <div className="create-post-modal-field">
              <label htmlFor="image-upload">Upload Picture</label>
              <div className="create-post-modal-image-upload">
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setUploadedImage(file);
                      // Create preview
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setUploadedImagePreview(event.target.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="create-post-modal-file-input"
                />
                {uploadedImagePreview && (
                  <div className="create-post-modal-image-preview">
                    <img src={uploadedImagePreview} alt="Uploaded meal" />
                    <button
                      type="button"
                      className="create-post-modal-remove-image"
                      onClick={() => {
                        setUploadedImage(null);
                        setUploadedImagePreview(null);
                        // Reset file input
                        const fileInput = document.getElementById('image-upload');
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
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

          {/* Public/Private Toggle - Only show when not from meal planning */}
          {!isFromMealPlanning && (
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
          )}

          {/* Food Items as Chips */}
          {foodItems.length > 0 && (
            <div className="create-post-modal-field">
              <label>Food Items</label>
              <div className="create-post-modal-chips">
                {foodItems.map((item, index) => (
                  <span key={index} className="create-post-modal-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="create-post-modal-error">{error}</div>
          )}

          <div className="create-post-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="create-post-modal-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-post-modal-submit"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Log'}
            </button>
          </div>
        </form>
          </div>
        </div>
      )}

    </>
  );
};

export default CreatePostModal;

