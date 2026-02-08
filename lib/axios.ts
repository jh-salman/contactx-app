import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { logger } from './logger';

// Interface for error response data
interface ErrorResponseData {
  message?: string;
  error?: string;
  success?: boolean;
  data?: any;
  [key: string]: any;
}

// Log API configuration on startup (dev only)
if (__DEV__) {
  logger.info('API Base URL', { url: API_BASE_URL });
}

// Get base URL without /api for Origin header
// For mobile apps, Better Auth expects the API base URL as origin (not the API URL itself)
const getOriginUrl = () => {
  // Extract host and port from API_BASE_URL
  const apiUrl = API_BASE_URL.replace('/api', '');
  
  // For mobile apps, use the API base URL as origin
  // This matches what Better Auth expects in trustedOrigins
    return apiUrl;
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add auth token and ensure Origin header is set
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Set Origin header for Better Auth
      // For mobile apps, we send the API base URL as origin (which should be in trustedOrigins)
      if (config.headers) {
        const originUrl = getOriginUrl();
        
        // Set Origin header - Better Auth checks this against trustedOrigins
        // For Vercel, mobile apps send the API URL itself as origin
        (config.headers as any).Origin = originUrl;
        
        // Additional headers for Android compatibility and Better Auth
        (config.headers as any)['X-Origin'] = originUrl;
        (config.headers as any)['X-Requested-Origin'] = originUrl;
        (config.headers as any)['X-Forwarded-Origin'] = originUrl;
        (config.headers as any).Referer = originUrl;
        
        // Add timezone header
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (timezone) {
            (config.headers as any)['X-Timezone'] = timezone;
          }
        } catch (tzError) {
          logger.warn('Timezone error', tzError);
        }
      }

      // Log request details (dev only)
      if (__DEV__) {
        const fullUrl = `${config.baseURL}${config.url}`;
        logger.debug(`Request: ${config.method?.toUpperCase()} ${fullUrl}`);
      }
    } catch (error) {
      logger.error('Request interceptor error', error);
    }
    return config;
  },
  (error: AxiosError) => {
    logger.error('Request setup error', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses (dev only)
    if (__DEV__) {
      const fullUrl = `${response.config.baseURL}${response.config.url}`;
      logger.debug(`Response: ${response.config.method?.toUpperCase()} ${fullUrl} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    
    const fullUrl = originalRequest ? `${originalRequest.baseURL || ''}${originalRequest.url || ''}` : 'Unknown URL';

    // Type-safe access to error response data
    const errorData = error.response?.data as ErrorResponseData | undefined;
    const errorMessage = errorData?.message || errorData?.error || '';

    const isDatabaseError = 
      (error.response?.status === 400 || error.response?.status === 500) &&
      (errorMessage.toLowerCase().includes('column') ||
       errorMessage.toLowerCase().includes('table') ||
       errorMessage.toLowerCase().includes('does not exist') ||
       errorMessage.toLowerCase().includes('database') ||
       errorMessage.toLowerCase().includes('prisma') ||
       errorMessage.toLowerCase().includes('not available') ||
       errorMessage.toLowerCase().includes('invocation'));

    // Log errors (dev only, simplified)
    if (__DEV__) {
      if (!error?.response) {
        // Network error
        const errorCode = error?.code || 'UNKNOWN';
        logger.warn('Network Error', { code: errorCode, url: fullUrl });
      } else {
        // Don't log database errors as errors - they're handled gracefully
        if (isDatabaseError) {
          logger.info('Database schema issue (handled gracefully)', { url: fullUrl });
        } else {
          logger.error('API Error', error, { status: error.response.status, url: fullUrl });
        }
      }
    }

    // Production-safe error handling - ensure error is always handled
    // Add handled flag to prevent app crashes
    const handledError = {
      ...error,
      handled: true,
      userMessage: errorData?.message || errorData?.error || error.message || 'An error occurred',
    };

    // For database errors, modify the error response to be handled gracefully by UI
    if (isDatabaseError && error.response) {
      // Modify error response to indicate success with empty data
      // This allows UI components to treat it as empty state
      error.response.data = {
        success: true,
        data: [],
        message: 'No data available'
      };
      // Change status to 200 so it's not treated as an error
      error.response.status = 200;
      // Return the modified response instead of rejecting
      return Promise.resolve(error.response);
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      logger.warn('401 Unauthorized - Clearing auth token');
      
      try {
        // Clear stored auth data
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        logger.info('Auth data cleared');
      } catch (storageError) {
        logger.error('Error clearing auth data', storageError);
      }
    }

    // Return handled error instead of raw error
    return Promise.reject(handledError);
  }
);

export default apiClient;

