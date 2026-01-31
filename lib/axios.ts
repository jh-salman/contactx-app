import { API_BASE_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// Log API configuration on startup (dev only)
if (__DEV__) {
  console.log('🔧 API Base URL:', API_BASE_URL);
}

// Get base URL without /api for Origin header
// For mobile apps, Better Auth expects localhost as origin for local development
const getOriginUrl = () => {
  // Extract host and port from API_BASE_URL
  const apiUrl = API_BASE_URL.replace('/api', '');
  
  // For cloudflared/ngrok tunnels, use the tunnel URL as origin
  if (apiUrl.includes('trycloudflare.com') || apiUrl.includes('ngrok.io') || apiUrl.includes('ngrok-free.app')) {
    return apiUrl;
  }
  
  // For Vercel URLs
  if (apiUrl.includes('vercel.app')) {
    return apiUrl;
  }
  
  // For local IP addresses, use localhost as origin (Better Auth requirement)
  if (apiUrl.includes('10.102.144.18') || apiUrl.includes('10.108.105.18') || apiUrl.includes('10.26.38.18') || apiUrl.includes('10.153.79.18')) {
    // Extract port from URL
    const portMatch = apiUrl.match(/:(\d+)/);
    const port = portMatch ? portMatch[1] : '3004';
    return `http://localhost:${port}`;
  }
  
  // If already localhost, use as is
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return apiUrl;
  }
  
  // Default fallback
  return 'http://localhost:3004';
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
      
      // Set Origin header - backend requires it
      if (config.headers) {
        const originUrl = getOriginUrl();
        
        // For Android, ensure Origin is set correctly
        // Android may strip Origin header, so we set multiple headers
        (config.headers as any).Origin = originUrl;
        (config.headers as any)['X-Origin'] = originUrl;
        (config.headers as any)['X-Requested-Origin'] = originUrl;
        (config.headers as any)['X-Forwarded-Origin'] = originUrl;
        (config.headers as any).Referer = originUrl;
        // Note: X-Forwarded-For should be client IP, but we're using origin for Better Auth compatibility
        
        // Add timezone header
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (timezone) {
            (config.headers as any)['X-Timezone'] = timezone;
          }
        } catch (tzError) {
          console.warn('⚠️ Timezone error:', tzError);
        }
      }

      // Log request details (dev only)
      if (__DEV__) {
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`📤 ${config.method?.toUpperCase()} ${fullUrl}`);
      }
    } catch (error) {
      console.error('❌ Request interceptor error:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request setup error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses (dev only)
    if (__DEV__) {
      const fullUrl = `${response.config.baseURL}${response.config.url}`;
      console.log(`✅ ${response.config.method?.toUpperCase()} ${fullUrl} - ${response.status}`);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error?.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    
    const fullUrl = originalRequest ? `${originalRequest.baseURL || ''}${originalRequest.url || ''}` : 'Unknown URL';

    // Log errors (dev only, simplified)
    if (__DEV__) {
      if (!error?.response) {
        // Network error
        const errorCode = error?.code || 'UNKNOWN';
        console.warn(`🌐 Network Error: ${errorCode} - ${fullUrl}`);
      } else {
        // API error response
        console.error(`❌ API Error: ${error.response.status} - ${fullUrl}`, error.response.data);
      }
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      console.warn('🔐 401 Unauthorized - Clearing auth token');
      
      try {
        // Clear stored auth data
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
        console.log('🗑️ Auth data cleared');
      } catch (storageError) {
        console.error('❌ Error clearing auth data:', storageError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

