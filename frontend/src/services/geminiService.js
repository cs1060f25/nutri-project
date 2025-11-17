const API_ENDPOINT = '/api/analyze-meal';

/**
 * Compress image on client side to reduce file size
 * Target: under 3.5MB to stay well under Vercel's 4.5MB limit
 */
const compressImage = (file, maxSizeMB = 3.5, maxWidth = 1920, maxHeight = 1920) => {
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
                // Create a new File object with the compressed blob
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            'image/jpeg',
            quality
          );
        };
        
        // Start with 0.85 quality (good balance)
        compressWithQuality(0.85);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export const analyzeMealImage = async (file) => {
  try {
    // Compress image if it's over 2MB to ensure it stays well under Vercel's 4.5MB limit
    // Multipart form data adds overhead, so we want to be conservative
    const maxSizeBeforeCompression = 2 * 1024 * 1024; // 2MB
    let fileToUpload = file;
    
    if (file.size > maxSizeBeforeCompression) {
      console.log(`Compressing image from ${(file.size / 1024 / 1024).toFixed(2)}MB...`);
      fileToUpload = await compressImage(file);
      console.log(`Compressed to ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB`);
    }

    const formData = new FormData();
    formData.append('image', fileToUpload);

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      // Handle 413 specifically
      if (response.status === 413) {
        throw new Error('Image is too large even after compression. Please try a smaller image or reduce the image quality.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      // Handle error message - could be string or object
      let message = 'Failed to analyze meal image';
      if (errorData?.error) {
        message = typeof errorData.error === 'string' 
          ? errorData.error 
          : errorData.error?.message || JSON.stringify(errorData.error);
      } else if (errorData?.message) {
        message = errorData.message;
      }
      throw new Error(message);
    }

    return response.json();
  } catch (error) {
    // Re-throw with better error message if it's a compression error
    if (error.message.includes('Failed to compress') || error.message.includes('Failed to load')) {
      throw new Error('Failed to process image. Please try a different image file.');
    }
    throw error;
  }
};
