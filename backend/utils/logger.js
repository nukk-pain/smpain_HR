/**
 * Simple logging utility with sensitive data masking and log level control
 * 
 * Log levels: debug, info, warn, error
 * Set LOG_LEVEL environment variable to control output
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LOG_LEVELS.info;
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Mask sensitive data in log messages
 */
function maskSensitiveData(data) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  // Mask JWT tokens
  data = data.replace(/Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/gi, 'Bearer [TOKEN_MASKED]');
  data = data.replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, '[JWT_MASKED]');
  
  // Mask passwords in JSON
  data = data.replace(/"password"\s*:\s*"[^"]+"/gi, '"password":"[MASKED]"');
  data = data.replace(/"newPassword"\s*:\s*"[^"]+"/gi, '"newPassword":"[MASKED]"');
  data = data.replace(/"currentPassword"\s*:\s*"[^"]+"/gi, '"currentPassword":"[MASKED]"');
  
  // Mask MongoDB connection strings
  data = data.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/gi, '$1[USER]:[PASSWORD]@');
  
  // Mask refresh tokens
  data = data.replace(/"refreshToken"\s*:\s*"[^"]+"/gi, '"refreshToken":"[MASKED]"');
  
  // Mask CSRF tokens (but keep first 8 chars for debugging)
  data = data.replace(/csrf-[a-f0-9]{8}(-[a-f0-9-]+)/gi, 'csrf-$1...[MASKED]');

  return data;
}

/**
 * Format log message with timestamp and level
 */
function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // Convert objects to string
  const formattedArgs = args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg, null, 2);
    }
    return arg;
  });

  const fullMessage = [message, ...formattedArgs].join(' ');
  
  // Mask sensitive data in production
  const finalMessage = isProduction ? maskSensitiveData(fullMessage) : fullMessage;
  
  return `${prefix} ${finalMessage}`;
}

/**
 * Logger object with level-specific methods
 */
const logger = {
  debug(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.debug) {
      console.log(formatMessage('debug', message, ...args));
    }
  },

  info(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.info) {
      console.log(formatMessage('info', message, ...args));
    }
  },

  warn(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },

  error(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.error) {
      console.error(formatMessage('error', message, ...args));
    }
  },

  // Special method for auth-related logging
  auth(action, username, details = {}) {
    const safeDetails = { ...details };
    delete safeDetails.password;
    delete safeDetails.token;
    delete safeDetails.refreshToken;
    
    this.info(`AUTH: ${action} for user: ${username}`, safeDetails);
  },

  // Special method for API request logging
  request(method, path, user = null) {
    const userInfo = user ? `by ${user.username || user.id}` : 'by anonymous';
    this.info(`API: ${method} ${path} ${userInfo}`);
  },

  // Get current log level
  getLevel() {
    return process.env.LOG_LEVEL || 'info';
  }
};

module.exports = logger;