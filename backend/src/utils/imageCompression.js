const sharp = require('sharp');

/**
 * Compress and resize image to fit within Firestore limits
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {number} maxSizeKB - Maximum size in KB (default: 400KB to be safe under 1MB Firestore limit)
 * @returns {Promise<string>} - Compressed base64 image data URI
 */
const compressImage = async (base64Image, maxSizeKB = 400) => {
  try {
    // Extract base64 data and mime type
    let base64Data = base64Image;
    let mimeType = 'image/jpeg';
    
    if (base64Image.startsWith('data:')) {
      const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1] || 'image/jpeg';
        base64Data = matches[2];
      } else {
        base64Data = base64Image.split(',')[1] || base64Image;
      }
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const originalSizeKB = imageBuffer.length / 1024;
    
    console.log(`Original image size: ${originalSizeKB.toFixed(2)} KB`);
    
    // If already small enough, return as-is
    if (originalSizeKB <= maxSizeKB) {
      console.log('Image already within size limit, no compression needed');
      return base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${base64Data}`;
    }
    
    // Compress image using sharp
    let quality = 85;
    let width = null;
    let height = null;
    
    // Start with quality reduction, then resize if needed
    let compressedBuffer = imageBuffer;
    let currentSizeKB = originalSizeKB;
    
    // Get image format
    const metadata = await sharp(imageBuffer).metadata();
    const isPng = mimeType.includes('png') || metadata.format === 'png';
    
    // Try reducing quality first
    while (currentSizeKB > maxSizeKB && quality > 30) {
      let sharpInstance = sharp(imageBuffer);
      
      if (isPng) {
        // For PNG, use compression level (0-9, higher = more compression)
        const compressionLevel = Math.floor((100 - quality) / 10);
        compressedBuffer = await sharpInstance
          .png({ quality, compressionLevel: Math.min(compressionLevel, 9) })
          .toBuffer();
      } else {
        // For JPEG and other formats, convert to JPEG with quality
        compressedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        mimeType = 'image/jpeg'; // Update mime type since we converted
      }
      
      currentSizeKB = compressedBuffer.length / 1024;
      console.log(`Compressed with quality ${quality}: ${currentSizeKB.toFixed(2)} KB`);
      
      if (currentSizeKB > maxSizeKB) {
        quality -= 10;
      }
    }
    
    // If still too large, resize the image and compress more aggressively
    if (currentSizeKB > maxSizeKB) {
      // Get original dimensions (already have metadata from above)
      const originalWidth = metadata.width;
      const originalHeight = metadata.height;
      
      // Calculate new dimensions (maintain aspect ratio)
      // Use a more aggressive ratio to ensure we hit the target
      const ratio = Math.sqrt((maxSizeKB * 0.9) / currentSizeKB); // 90% of target to be safe
      width = Math.round(originalWidth * ratio);
      height = Math.round(originalHeight * ratio);
      
      // Ensure minimum dimensions but allow smaller if needed
      width = Math.max(width, 300);
      height = Math.max(height, 200);
      
      console.log(`Resizing from ${originalWidth}x${originalHeight} to ${width}x${height}`);
      
      // Try with lower quality after resize
      let resizeQuality = 70;
      let resizeAttempts = 0;
      
      while (currentSizeKB > maxSizeKB && resizeQuality > 40 && resizeAttempts < 3) {
        let sharpInstance = sharp(imageBuffer).resize(width, height, { 
          fit: 'inside', 
          withoutEnlargement: true 
        });
        
        if (isPng) {
          compressedBuffer = await sharpInstance
            .png({ quality: resizeQuality, compressionLevel: 9 })
            .toBuffer();
        } else {
          compressedBuffer = await sharpInstance
            .jpeg({ quality: resizeQuality, mozjpeg: true })
            .toBuffer();
          mimeType = 'image/jpeg'; // Update mime type since we converted
        }
        
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`After resize with quality ${resizeQuality}: ${currentSizeKB.toFixed(2)} KB`);
        
        if (currentSizeKB > maxSizeKB) {
          resizeQuality -= 10;
          resizeAttempts++;
          // If still too large, reduce dimensions further
          if (resizeAttempts >= 2) {
            width = Math.round(width * 0.9);
            height = Math.round(height * 0.9);
            console.log(`Further reducing size to ${width}x${height}`);
          }
        }
      }
    }
    
    // Convert back to base64
    const compressedBase64 = compressedBuffer.toString('base64');
    const result = `data:${mimeType};base64,${compressedBase64}`;
    
    console.log(`✅ Image compressed from ${originalSizeKB.toFixed(2)} KB to ${currentSizeKB.toFixed(2)} KB`);
    
    return result;
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, try to return original (might fail later, but at least we tried)
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

module.exports = {
  compressImage,
};

