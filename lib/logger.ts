
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = __DEV__;

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${logData}`;
  }

  info(message: string, data?: any) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('info', message, data));
    }
    // Production: Can integrate with crash reporting (Sentry, etc.)
  }

  warn(message: string, data?: any) {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, data));
    } else {
      // Production: Log warnings (less critical than errors)
      console.warn(JSON.stringify({
        level: 'warn',
        message,
        timestamp: new Date().toISOString(),
        ...data
      }));
    }
  }

  error(message: string, error?: Error | any, data?: any) {
    const errorData = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : error;

    if (this.isDevelopment) {
      console.error(this.formatMessage('error', message, { ...errorData, ...data }));
    } else {
      // Production: Always log errors
      console.error(JSON.stringify({
        level: 'error',
        message,
        timestamp: new Date().toISOString(),
        error: errorData,
        ...data
      }));
      // Can send to crash reporting service here
    }
  }

  debug(message: string, data?: any) {
    // Debug only in development
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }
}

export const logger = new Logger();