import apiClient from '@/lib/axios';
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
    console.log('📤 Starting image upload:', { 
      input: imageUriOrBase64.substring(0, 50) + '...', 
      imageType 
    });
    
    let base64Image: string | null = null;
    
    // Check if input is already a base64 data URI
    if (imageUriOrBase64.startsWith('data:image/')) {
      console.log('✅ Input is already a base64 data URI');
      base64Image = imageUriOrBase64;
    }
    // Check if input is already a URL
    else if (imageUriOrBase64.startsWith('http://') || imageUriOrBase64.startsWith('https://')) {
      console.log('✅ Input is already a URL, returning as-is');
      return imageUriOrBase64;
    }
    // Otherwise, convert from URI to base64
    else {
      console.log('🔄 Converting URI to base64...');
      base64Image = await convertImageToBase64(imageUriOrBase64);
      
      if (!base64Image) {
        console.error('❌ Failed to convert image to base64. Input:', imageUriOrBase64.substring(0, 100));
        throw new Error('Failed to convert image to base64. Please try selecting the image again.');
      }
    }

    console.log('✅ Image ready for upload. Base64 length:', base64Image.length);

    // Upload to API endpoint that handles Cloudinary upload
    // The server will upload to Cloudinary and return the URL
    console.log('📤 Uploading to server...');
    const response = await apiClient.post('/card/upload-image', {
      image: base64Image,
      type: imageType,
    });

    const cloudinaryUrl = response.data?.url || response.data?.imageUrl || null;
    
    if (cloudinaryUrl) {
      console.log('✅ Image uploaded successfully. Cloudinary URL:', cloudinaryUrl);
    } else {
      console.warn('⚠️ No URL in response:', response.data);
    }

    // Return Cloudinary URL from response
    return cloudinaryUrl;
  } catch (error: any) {
    console.error('❌ Error uploading image to Cloudinary:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
};

