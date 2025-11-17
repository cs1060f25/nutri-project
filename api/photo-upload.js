/**
 * Vercel serverless function for photo upload and compression
 * Compresses images to fit within Firestore size limits
 */

const sharp = require('sharp');

/**
 * Compress and resize image to fit within Firestore limits
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {number} maxSizeKB - Maximum size in KB (default: 750KB to be safe under 1MB Firestore limit)
 * @returns {Promise<string>} - Compressed base64 image data URI
 */
const compressImage = async (base64Image, maxSizeKB = 750) => {
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
    
    // Get image format and dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const isPng = mimeType.includes('png') || metadata.format === 'png';
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    // For very large images (>1MB), resize immediately and convert to JPEG for better compression
    // For smaller images, try quality reduction first
    const shouldResizeImmediately = originalSizeKB > 1000;
    
    let compressedBuffer = imageBuffer;
    let currentSizeKB = originalSizeKB;
    
    if (shouldResizeImmediately) {
      // For very large images, resize immediately to speed up compression
      // Calculate target dimensions based on desired file size
      // Rough estimate: target ~750KB, so resize to roughly 1200x900 or smaller
      const targetMaxDimension = 1200; // Max width or height
      let width = originalWidth;
      let height = originalHeight;
      
      if (width > height) {
        if (width > targetMaxDimension) {
          height = Math.round((height * targetMaxDimension) / width);
          width = targetMaxDimension;
        }
      } else {
        if (height > targetMaxDimension) {
          width = Math.round((width * targetMaxDimension) / height);
          height = targetMaxDimension;
        }
      }
      
      console.log(`Large image detected (${originalSizeKB.toFixed(2)} KB), resizing immediately from ${originalWidth}x${originalHeight} to ${width}x${height}`);
      
      // Resize and convert to JPEG with moderate quality (faster than multiple iterations)
      compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70, mozjpeg: true })
        .toBuffer();
      
      mimeType = 'image/jpeg';
      currentSizeKB = compressedBuffer.length / 1024;
      console.log(`After initial resize: ${currentSizeKB.toFixed(2)} KB`);
      
      // If still too large, reduce quality in one step
      if (currentSizeKB > maxSizeKB) {
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`After quality reduction: ${currentSizeKB.toFixed(2)} KB`);
      }
      
      // If still too large, resize more aggressively
      if (currentSizeKB > maxSizeKB) {
        const ratio = Math.sqrt((maxSizeKB * 0.8) / currentSizeKB);
        width = Math.max(Math.round(width * ratio), 400);
        height = Math.max(Math.round(height * ratio), 300);
        
        console.log(`Further resizing to ${width}x${height}`);
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`Final size: ${currentSizeKB.toFixed(2)} KB`);
      }
    } else {
      // For smaller images, try quality reduction first (faster)
      // Convert PNG to JPEG immediately for better compression
      let quality = isPng ? 70 : 75; // Start lower for faster compression
      
      if (isPng) {
        // Convert PNG to JPEG immediately (JPEG compresses much better)
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        mimeType = 'image/jpeg';
      } else {
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }
      
      currentSizeKB = compressedBuffer.length / 1024;
      console.log(`Compressed with quality ${quality}: ${currentSizeKB.toFixed(2)} KB`);
      
      // If still too large, resize
      if (currentSizeKB > maxSizeKB) {
        const ratio = Math.sqrt((maxSizeKB * 0.9) / currentSizeKB);
        const width = Math.max(Math.round(originalWidth * ratio), 400);
        const height = Math.max(Math.round(originalHeight * ratio), 300);
        
        console.log(`Resizing from ${originalWidth}x${originalHeight} to ${width}x${height}`);
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        mimeType = 'image/jpeg';
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`After resize: ${currentSizeKB.toFixed(2)} KB`);
      }
    }
    
    // Convert back to base64
    const compressedBase64 = compressedBuffer.toString('base64');
    const result = `data:${mimeType};base64,${compressedBase64}`;
    
    console.log(`✅ Image compressed from ${originalSizeKB.toFixed(2)} KB to ${currentSizeKB.toFixed(2)} KB`);
    
    return result;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, maxSizeKB } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Compress the image
    const compressedImage = await compressImage(image, maxSizeKB || 750);

    res.status(200).json({
      success: true,
      compressedImage,
    });
  } catch (error) {
    console.error('Error in photo-upload API:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to compress image'
    });
  }
};

