import { logger } from '@/lib/logger';

// API Base URL Configuration - Same for both development and production
const DEFAULT_API_URL = 'https://contactx.xsalonx.com/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

// Validate API URL
if (__DEV__) {
  if (!API_BASE_URL || API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
    logger.warn('API URL Warning', {
      currentURL: API_BASE_URL,
      message: 'Using localhost/127.0.0.1 may not work on physical devices. Use your local IP address instead.',
      example: 'http://192.168.1.100:3004/api or https://your-tunnel.trycloudflare.com/api',
    });
  }
  
  logger.info('API Base URL', { url: API_BASE_URL });
  logger.info('To change API URL, set EXPO_PUBLIC_API_URL in .env file');
}


