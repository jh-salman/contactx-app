// Connection test utility for debugging network issues
import { API_BASE_URL } from '@/config/api';
import { logger } from './logger';
import apiClient from './axios';

/**
 * Test connection using native fetch (bypasses axios)
 */
const testWithFetch = async (url: string, timeout: number = 8000): Promise<{ success: boolean; status?: number; error?: string }> => {
  const startTime = Date.now();
  logger.debug(`Starting fetch test (timeout: ${timeout}ms)`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      logger.warn(`Fetch timeout reached (${timeout}ms), aborting`);
      controller.abort();
    }, timeout);
    
    logger.debug(`Making fetch request to: ${url}`);
    const fetchPromise = fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    const response = await fetchPromise;
    const elapsed = Date.now() - startTime;
    clearTimeout(timeoutId);
    
    logger.debug(`Fetch completed in ${elapsed}ms, status: ${response.status}`);
    
    return {
      success: true,
      status: response.status,
    };
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    logger.warn(`Fetch failed after ${elapsed}ms`, { error: error?.name || error?.message });
    
    if (error.name === 'AbortError' || error?.message?.includes('aborted')) {
      return { success: false, error: `Timeout after ${elapsed}ms` };
    }
    return { success: false, error: error?.message || 'Network error' };
  }
};

/**
 * Test connection to the API server
 * This helps diagnose network connectivity issues
 */
export const testConnection = async (): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  const serverUrl = API_BASE_URL.replace('/api', '');
  const endpointsToTry = ['/', '/health', '/api'];
  
  logger.debug('Testing connection', { apiBaseUrl: API_BASE_URL, serverUrl });
  
  // First, try with native fetch (simpler, bypasses axios)
  logger.debug('Step 1: Testing with native fetch');
  for (let i = 0; i < endpointsToTry.length; i++) {
    const endpoint = endpointsToTry[i];
    const testUrl = `${serverUrl}${endpoint}`;
    logger.debug(`[${i + 1}/${endpointsToTry.length}] Trying fetch: ${testUrl}`);
    
    const fetchResult = await testWithFetch(testUrl, 8000);
    
    if (fetchResult.success) {
      logger.debug('Fetch test successful', {
        endpoint,
        status: fetchResult.status,
      });
      
      return {
        success: true,
        details: {
          status: fetchResult.status,
          serverIP: API_BASE_URL,
          endpoint,
          method: 'fetch',
        },
      };
    } else {
      logger.warn(`Fetch failed for ${endpoint}`, { error: fetchResult.error });
      if (i < endpointsToTry.length - 1) {
        logger.debug('Trying next endpoint');
      }
    }
  }
  
  logger.warn('All fetch attempts failed. Trying axios');
  
  // If fetch failed, try with axios
  logger.debug('Step 2: Testing with axios');
  for (const endpoint of endpointsToTry) {
    try {
      logger.debug(`Trying axios: ${endpoint}`);
      const response = await apiClient.get(endpoint, {
        timeout: 10000, // 10 second timeout
      });
      
      logger.debug('Axios connection successful', {
        endpoint,
        status: response.status,
        statusText: response.statusText,
      });
      
      return {
        success: true,
        details: {
          status: response.status,
          statusText: response.statusText,
          serverIP: API_BASE_URL,
          endpoint,
          method: 'axios',
        },
      };
    } catch (error: any) {
      // If we got a response (even if error), server is reachable
      if (error?.response) {
        logger.debug('Server is reachable (got response)', {
          endpoint,
          status: error.response.status,
          statusText: error.response.statusText,
        });
        
        return {
          success: true,
          details: {
            status: error.response.status,
            statusText: error.response.statusText,
            serverIP: API_BASE_URL,
            endpoint,
            method: 'axios',
            note: 'Server responded (even with error), so connection works',
          },
        };
      }
      
      // If it's a network error (no response), continue to next endpoint
      if (!error?.response && error?.code !== 'ECONNABORTED') {
        logger.warn(`Endpoint ${endpoint} failed`, { code: error?.code, message: error?.message });
        continue;
      }
      
      // If timeout, try next endpoint
      if (error?.code === 'ECONNABORTED') {
        logger.warn(`Endpoint ${endpoint} timed out`);
        continue;
      }
    }
  }
  
  // All endpoints failed
  const errorDetails: any = {
    serverIP: API_BASE_URL,
    serverUrl: serverUrl,
    endpointsTried: endpointsToTry,
    type: 'NETWORK_ERROR',
    suggestions: [
      '1. ✅ Verify server is running: Check terminal where backend is running',
      '2. ✅ Check IP address: Run `ifconfig` (Mac) or `ipconfig` (Windows) to verify IP is 10.102.144.18',
      '3. ✅ Same WiFi network: Ensure mobile device and server are on the SAME WiFi network',
      '4. ✅ Test in phone browser: Open http://10.102.144.18:3004 in your phone browser',
      '5. ✅ Mac Firewall: System Settings > Network > Firewall - allow port 3004',
      '6. ✅ Server binding: Your server.ts shows 0.0.0.0:3004 (correct!)',
      '7. ✅ CORS: Update backend app.ts CORS to include exp://10.102.144.18:8081',
      '8. ✅ Network restart: Try restarting WiFi on both device and Mac',
    ],
  };

  return {
    success: false,
    error: 'Cannot connect to server. All endpoints timed out or failed.',
    details: errorDetails,
  };
};

/**
 * Get current API configuration for debugging
 */
export const getAPIConfig = () => {
  return {
    baseURL: API_BASE_URL,
    serverIP: API_BASE_URL.replace('/api', ''),
    env: process.env.EXPO_PUBLIC_API_URL || 'Using default',
    timestamp: new Date().toISOString(),
  };
};

