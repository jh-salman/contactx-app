import apiClient from '@/lib/axios';

export const authService = {

  login: async (phone: string) => {
    const response = await apiClient.post('/auth/phone-number/send-otp', { phoneNumber: phone });
    return response.data;
  },

  verifyOTP: async (
    phone: string, 
    code: string, 
    options?: { disableSession?: boolean; updatePhoneNumber?: boolean }
  ) => {
    const response = await apiClient.post('/auth/phone-number/verify', {
      phoneNumber: phone,
      code: code,
      disableSession: options?.disableSession ?? false,
      updatePhoneNumber: options?.updatePhoneNumber ?? false,
    });
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response.data;
  },

  // Logout - Sign out from server
  logout: async () => {
    const response = await apiClient.post('/auth/sign-out');
    return response.data;
  },

  // Refresh token (if your backend supports it)
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};

