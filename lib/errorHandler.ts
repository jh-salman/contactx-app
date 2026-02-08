import { ErrorUtils } from 'react-native';
import { showError } from './toast';
import { logger } from './logger';

// Production error tracking service (Sentry, Bugsnag, etc.)
const trackError = (error: Error, context?: Record<string, any>) => {
  logger.error('Error tracked', error, context);
  // Production: Send to error tracking service
  // Example: Sentry.captureException(error, { extra: context });
};

// Handle JavaScript errors
const handleJSError = (error: Error, isFatal: boolean) => {
  trackError(error, { isFatal, type: 'js' });
  
  if (isFatal) {
    // Fatal error - show recovery screen
    showError('App Error', 'A critical error occurred. Please restart the app.');
  } else {
    // Non-fatal error - show toast
    showError('Error', 'Something went wrong. Please try again.');
  }
};

// Handle promise rejections
const handlePromiseRejection = (event: PromiseRejectionEvent) => {
  const error = event.reason instanceof Error 
    ? event.reason 
    : new Error(String(event.reason));
  
  trackError(error, { type: 'promise_rejection' });
  showError('Error', 'An operation failed. Please try again.');
};

// Setup global error handlers
export const setupGlobalErrorHandlers = () => {
  // React Native error handler - check if ErrorUtils is available
  if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
    try {
      const originalHandler = ErrorUtils.getGlobalHandler();
      
      ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
        handleJSError(error, isFatal || false);
        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    } catch (err) {
      // ErrorUtils not available or failed to setup
      logger.warn('ErrorUtils not available', err);
    }
  } else {
    logger.warn('ErrorUtils not available in this environment');
  }

  // Promise rejection handler (works in web and React Native)
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('unhandledrejection', handlePromiseRejection);
  } else if (typeof global !== 'undefined' && (global as any).addEventListener) {
    // React Native environment
    (global as any).addEventListener('unhandledrejection', handlePromiseRejection);
  }
};

// Safe async wrapper - prevents unhandled promise rejections
export const safeAsync = async <T>(
  asyncFn: () => Promise<T>,
  errorMessage = 'Operation failed'
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackError(err, { type: 'safe_async' });
    showError('Error', errorMessage);
    return null;
  }
};

// Safe try-catch wrapper for sync functions
export const safeSync = <T>(
  syncFn: () => T,
  errorMessage = 'Operation failed'
): T | null => {
  try {
    return syncFn();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    trackError(err, { type: 'safe_sync' });
    showError('Error', errorMessage);
    return null;
  }
};

// Retry wrapper for failed operations
export const withRetry = async <T>(
  asyncFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000,
  errorMessage = 'Operation failed'
): Promise<T | null> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // All retries failed
      trackError(lastError, { type: 'retry_failed', attempts: maxRetries });
      showError('Error', errorMessage);
      return null;
    }
  }
  
  return null;
};

// Safe navigation wrapper
export const safeNavigate = (
  navigateFn: () => void,
  errorMessage = 'Navigation failed'
) => {
  return safeSync(navigateFn, errorMessage);
};