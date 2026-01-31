import * as FileSystem from 'expo-file-system';
import { Paths, File } from 'expo-file-system';

/**
 * Convert local image URI to Base64 data URI
 * Supports both local files (file://) and remote URLs (http://, https://)
 * 
 * @param uri - Image URI (local file:// or remote URL)
 * @returns Base64 data URI string or original URL if remote, null on error
 */
export const convertImageToBase64 = async (uri: string): Promise<string | null> => {
  try {
    console.log('🔄 Converting image to base64:', uri.substring(0, 100));
    
    // If it's already a remote URL, return as-is
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      console.log('✅ Already a remote URL');
      return uri;
    }
    
    // If it's already a base64 data URI, return as-is
    if (uri.startsWith('data:image/')) {
      console.log('✅ Already a base64 data URI');
      return uri;
    }
    
    // Check if it's a local file URI
    const isLocalFile = uri.startsWith('file://') || uri.startsWith('content://');
    const isPhotoLibrary = uri.startsWith('ph://') || uri.startsWith('assets-library://');
    
    // Handle iOS Photos library URIs - need to copy to accessible location first
    if (isPhotoLibrary) {
      console.log('📸 Photos library URI detected, copying to accessible location...');
      try {
        // Copy to cache directory first using new API
        const filename = uri.split('/').pop() || `image_${Date.now()}.jpg`;
        const cacheFile = new File(Paths.cache, filename);
        const fileUri = cacheFile.uri;
        
        // Copy the file
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri,
        });
        
        console.log('✅ File copied to:', fileUri);
        
        // Now read from the copied location
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: 'base64' as any,
        });
        
        // Clean up copied file
        try {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        if (!base64 || base64.length === 0) {
          console.error('❌ Empty base64 string after copy');
          return null;
        }
        
        console.log('✅ Base64 conversion successful from Photos library. Length:', base64.length);
        
        // Get file extension to determine MIME type
        const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
        let mimeType = 'image/jpeg';
        
        if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'gif') {
          mimeType = 'image/gif';
        } else if (extension === 'webp') {
          mimeType = 'image/webp';
        }
        
        return `data:${mimeType};base64,${base64}`;
      } catch (copyError: any) {
        console.error('❌ Error copying Photos library file:', copyError);
        // Fall through to try direct read
      }
    }
    
    if (!isLocalFile) {
      console.warn('⚠️ Unknown URI format, returning as-is:', uri.substring(0, 50));
      return uri;
    }
    
    console.log('📁 Local file detected, reading...');
    
    // Convert local file to base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
    });
    
    if (!base64 || base64.length === 0) {
      console.error('❌ Empty base64 string');
      return null;
    }
    
    console.log('✅ Base64 conversion successful. Length:', base64.length);
    
    // Get file extension to determine MIME type
    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    let mimeType = 'image/jpeg'; // default
    
    if (extension === 'png') {
      mimeType = 'image/png';
    } else if (extension === 'gif') {
      mimeType = 'image/gif';
    } else if (extension === 'webp') {
      mimeType = 'image/webp';
    }
    
    // Return data URI format that server can process
    const dataUri = `data:${mimeType};base64,${base64}`;
    console.log('✅ Data URI created. MIME type:', mimeType);
    return dataUri;
  } catch (error: any) {
    console.error('❌ Error converting image to base64:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      uri: uri.substring(0, 100),
    });
    return null;
  }
};

/**
 * Check if URI is a local file that needs conversion
 */
export const isLocalFile = (uri: string): boolean => {
  return uri.startsWith('file://') || uri.startsWith('content://');
};

/**
 * Check if URI is already a remote URL
 */
export const isRemoteUrl = (uri: string): boolean => {
  return uri.startsWith('http://') || uri.startsWith('https://');
};

/**
 * Check if URI is already a base64 data URI
 */
export const isBase64DataUri = (uri: string): boolean => {
  return uri.startsWith('data:image/');
};

