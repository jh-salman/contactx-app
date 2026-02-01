// API Base URL Configuration
const DEFAULT_API_URL = __DEV__ 
  ? 'https://contact-x-api.vercel.app/api' // Development tunnel
  : 'https://contact-x-api.vercel.app/api'; // Production Vercel

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

// Validate API URL
if (__DEV__) {
  if (!API_BASE_URL || API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    console.warn('⚠️ API URL Warning:', {
      currentURL: API_BASE_URL,
      message: 'Using localhost/127.0.0.1 may not work on physical devices. Use your local IP address instead.',
      example: 'http://192.168.1.100:3004/api or https://your-tunnel.trycloudflare.com/api',
    });
  }
  
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('💡 To change API URL, set EXPO_PUBLIC_API_URL in .env file');
}


