// lib/toast.ts
// Toast utility functions for consistent toast messages across the app

import Toast from 'react-native-toast-message';

/**
 * Show success toast message
 */
export const showSuccess = (title: string, message?: string) => {
  Toast.show({
    type: 'success',
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'top',
  });
};

/**
 * Show error toast message
 */
export const showError = (title: string, message?: string) => {
  Toast.show({
    type: 'error',
    text1: title,
    text2: message,
    visibilityTime: 4000,
    position: 'top',
  });
};

/**
 * Show info toast message
 */
export const showInfo = (title: string, message?: string) => {
  Toast.show({
    type: 'info',
    text1: title,
    text2: message,
    visibilityTime: 3000,
    position: 'top',
  });
};

/**
 * Show warning toast message
 */
export const showWarning = (title: string, message?: string) => {
  Toast.show({
    type: 'info', // Using info type for warning (can customize later)
    text1: title,
    text2: message,
    visibilityTime: 3500,
    position: 'top',
  });
};
