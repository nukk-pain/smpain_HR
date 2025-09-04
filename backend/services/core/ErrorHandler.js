/**
 * Module Error Handler
 * Centralized error handling for all modular services
 */

class ModuleErrorHandler {
  /**
   * Handle service errors with context
   */
  static async handleServiceError(error, context = {}) {
    const errorInfo = {
      timestamp: new Date(),
      service: context.service || 'unknown',
      method: context.method || 'unknown',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context
    };
    
    // Determine severity
    const severity = this.determineSeverity(error);
    errorInfo.severity = severity;
    
    // Log to appropriate destination based on severity
    if (severity === 'critical') {
      console.error('CRITICAL ERROR:', errorInfo);
      // In future, trigger immediate alerts
    } else if (severity === 'error') {
      console.error('ERROR:', errorInfo);
    } else {
      console.warn('WARNING:', errorInfo);
    }
    
    // Determine if error should bubble up
    if (this.shouldBubbleUp(error, context)) {
      throw error;
    }
    
    // Apply retry logic if appropriate
    if (this.shouldRetry(error, context)) {
      return { retry: true, delay: this.getRetryDelay(context) };
    }
    
    // Return handled error
    return { 
      handled: true, 
      error: errorInfo,
      recovery: this.getSuggestedRecovery(error)
    };
  }
  
  /**
   * Wrap async function with error handling
   */
  static wrapAsync(fn, context = {}) {
    return async (...args) => {
      const startTime = Date.now();
      
      try {
        const result = await fn(...args);
        
        // Track successful execution
        if (context.metrics) {
          context.metrics.success = (context.metrics.success || 0) + 1;
          context.metrics.lastSuccess = new Date();
        }
        
        return result;
      } catch (error) {
        // Add execution time to context
        context.executionTime = Date.now() - startTime;
        
        // Track failed execution
        if (context.metrics) {
          context.metrics.failures = (context.metrics.failures || 0) + 1;
          context.metrics.lastFailure = new Date();
        }
        
        // Handle the error
        const result = await this.handleServiceError(error, context);
        
        // If retry is suggested
        if (result.retry) {
          await new Promise(resolve => setTimeout(resolve, result.delay));
          return fn(...args); // Retry once
        }
        
        // If error was handled, return null or default value
        if (result.handled && context.defaultValue !== undefined) {
          return context.defaultValue;
        }
        
        // Otherwise, throw the error
        throw error;
      }
    };
  }
  
  /**
   * Determine error severity
   */
  static determineSeverity(error) {
    // Critical errors
    if (error.name === 'MongoNetworkError' || 
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('out of memory')) {
      return 'critical';
    }
    
    // Normal errors
    if (error.name === 'ValidationError' ||
        error.name === 'CastError' ||
        error.statusCode >= 400 && error.statusCode < 500) {
      return 'warning';
    }
    
    // Default to error
    return 'error';
  }
  
  /**
   * Determine if error should bubble up
   */
  static shouldBubbleUp(error, context) {
    // Always bubble up critical errors
    if (this.determineSeverity(error) === 'critical') {
      return true;
    }
    
    // Bubble up if explicitly requested
    if (context.bubbleUp === true) {
      return true;
    }
    
    // Don't bubble up handled errors
    if (error.handled === true) {
      return false;
    }
    
    // Default behavior based on error type
    return error.statusCode >= 500 || !error.statusCode;
  }
  
  /**
   * Determine if operation should be retried
   */
  static shouldRetry(error, context) {
    // Check retry count
    const retryCount = context.retryCount || 0;
    const maxRetries = context.maxRetries || 3;
    
    if (retryCount >= maxRetries) {
      return false;
    }
    
    // Retry on network errors
    if (error.code === 'ECONNRESET' || 
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      return true;
    }
    
    // Retry on specific MongoDB errors
    if (error.name === 'MongoNetworkError' ||
        error.code === 11000 && context.retryOnDuplicate) {
      return true;
    }
    
    // Don't retry on client errors
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }
    
    return false;
  }
  
  /**
   * Get retry delay with exponential backoff
   */
  static getRetryDelay(context) {
    const retryCount = context.retryCount || 0;
    const baseDelay = context.baseDelay || 1000;
    const maxDelay = context.maxDelay || 30000;
    
    // Exponential backoff with jitter
    const delay = Math.min(
      baseDelay * Math.pow(2, retryCount) + Math.random() * 1000,
      maxDelay
    );
    
    return Math.floor(delay);
  }
  
  /**
   * Get suggested recovery action
   */
  static getSuggestedRecovery(error) {
    if (error.name === 'ValidationError') {
      return 'Check input data and retry with corrected values';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Check if the service is running and accessible';
    }
    
    if (error.name === 'MongoNetworkError') {
      return 'Check database connection and network connectivity';
    }
    
    if (error.message?.includes('out of memory')) {
      return 'Restart service and check memory limits';
    }
    
    return 'Check logs for more details';
  }
  
  /**
   * Create error with context
   */
  static createError(message, code, statusCode = 500, context = {}) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    error.context = context;
    error.timestamp = new Date();
    return error;
  }
  
  /**
   * Wrap errors with additional context
   */
  static wrapError(originalError, message, context = {}) {
    const error = new Error(message);
    error.originalError = originalError;
    error.stack = originalError.stack;
    error.context = {
      ...context,
      originalMessage: originalError.message,
      originalName: originalError.name
    };
    return error;
  }
}

module.exports = ModuleErrorHandler;