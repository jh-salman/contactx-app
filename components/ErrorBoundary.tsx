// components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors } from '@/context/ThemeContext';
import { logger } from '@/lib/logger';
import { showError } from '@/lib/toast';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to crash reporting service (Sentry, etc.)
    logger.error('ErrorBoundary caught an error', error, { errorInfo });
    // Production: Send to error tracking service
    // Example: Sentry.captureException(error, { extra: errorInfo });

    this.setState({
      error,
      errorInfo,
    });

    // Show user-friendly error message
    showError('Something went wrong', 'The app encountered an error. Please try again.');
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

// Error Fallback Component - Separate component to use hooks safely
function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  // Use ThemeProvider context safely - wrapped in try-catch for safety
  let colors: {
    background: string;
    text: string;
    textSecondary: string;
    primary: string;
  };
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const themeColors = useThemeColors();
    colors = {
      background: themeColors.background || '#ffffff',
      text: themeColors.text || '#000000',
      textSecondary: themeColors.textSecondary || '#666666',
      primary: themeColors.primary || '#3b82f6',
    };
  } catch {
    // Fallback colors if theme context not available (e.g., during error)
    colors = {
      background: '#ffffff',
      text: '#000000',
      textSecondary: '#666666',
      primary: '#3b82f6',
    };
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Oops! Something went wrong
      </Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {error?.message || 'An unexpected error occurred'}
      </Text>
      {__DEV__ && error && (
        <Text style={[styles.stack, { color: colors.textSecondary }]}>
          {error.stack}
        </Text>
      )}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={onReset}
      >
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  stack: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;