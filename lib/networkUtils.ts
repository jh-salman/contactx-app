// Network utility functions

/**
 * Get your local IP address for development
 * On macOS/Linux: run `ifconfig | grep "inet " | grep -v 127.0.0.1`
 * On Windows: run `ipconfig` and look for IPv4 Address
 * 
 * Common local network IP ranges:
 * - 192.168.x.x
 * - 10.0.x.x
 * - 172.16.x.x - 172.31.x.x
 */

export const getLocalIP = () => {
  // This is a helper function - you need to manually set your IP
  // Example: return '192.168.1.100';
  return null;
};

/**
 * Check if the API URL is properly configured
 */
export const validateAPIUrl = (url: string): boolean => {
  if (!url || url === 'http://localhost:3004/api' || url === 'http://localhost:3004' || url.includes('localhost') || url.includes('127.0.0.1')) {
    return false;
  }
  return true;
};

