import apiClient from '@/lib/axios';
import { logger } from '@/lib/logger';
import { convertImageToBase64 } from '@/utils/imageUtils';

/**
 * Upload a single image to Cloudinary via API
 * Returns the Cloudinary URL
 */
export const uploadImageToCloudinary = async (
  imageUriOrBase64: string,
  imageType: 'logo' | 'profile' | 'cover'
): Promise<string | null> => {
  try {
    logger.debug('Starting image upload', { 
      input: imageUriOrBase64.substring(0, 50) + '...', 
      imageType 
    });
    
    let base64Image: string | null = null;
    
    // Check if input is already a base64 data URI
    if (imageUriOrBase64.startsWith('data:image/')) {
      logger.debug('Input is already a base64 data URI');
      base64Image = imageUriOrBase64;
    }
    // Check if input is already a URL
    else if (imageUriOrBase64.startsWith('http://') || imageUriOrBase64.startsWith('https://')) {
      logger.debug('Input is already a URL, returning as-is');
      return imageUriOrBase64;
    }
    // Otherwise, convert from URI to base64
    else {
      logger.debug('Converting URI to base64');
      base64Image = await convertImageToBase64(imageUriOrBase64);
      
      if (!base64Image) {
        logger.error('Failed to convert image to base64', null, { input: imageUriOrBase64.substring(0, 100) });
        throw new Error('Failed to convert image to base64. Please try selecting the image again.');
      }
    }

    logger.debug('Image ready for upload', { base64Length: base64Image.length });

    // Upload to API endpoint that handles Cloudinary upload
    // The server will upload to Cloudinary and return the URL
    logger.debug('Uploading to server');
    const response = await apiClient.post('/card/upload-image', {
      image: base64Image,
      type: imageType,
    });

    const cloudinaryUrl = response.data?.url || response.data?.imageUrl || null;
    
    if (cloudinaryUrl) {
      logger.debug('Image uploaded successfully', { cloudinaryUrl });
    } else {
      logger.warn('No URL in response', response.data);
    }

    // Return Cloudinary URL from response
    return cloudinaryUrl;
  } catch (error: any) {
    logger.error('Error uploading image to Cloudinary', error, {
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

