const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class SecurityManager {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
    this.algorithm = 'aes-256-gcm';
    this.failedAttempts = new Map(); // IP -> { count, lastAttempt }
    this.sessionTokens = new Map(); // tokenId -> { userId, expires }
  }

  // Data encryption for sensitive information
  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  // Data decryption
  decrypt(encryptedData) {
    if (!encryptedData || !encryptedData.encrypted) return null;
    
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, Buffer.from(iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  // Hash sensitive data (one-way)
  hash(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  // Verify hashed data
  verifyHash(data, hash, salt) {
    const { hash: newHash } = this.hash(data, salt);
    return newHash === hash;
  }

  // Password strength validation
  validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'admin', 'qwerty', 'letmein',
      'welcome', 'monkey', '1234567890', 'password123'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 20);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;
    
    // Penalty for repeated characters
    const repeatedChars = password.match(/(.)\1{2,}/g);
    if (repeatedChars) {
      score -= repeatedChars.length * 5;
    }
    
    // Penalty for sequential characters
    if (/123|abc|qwe/i.test(password)) {
      score -= 10;
    }
    
    score = Math.max(0, Math.min(100, score));
    
    if (score >= 80) return 'strong';
    if (score >= 60) return 'medium';
    if (score >= 40) return 'weak';
    return 'very-weak';
  }

  // Brute force protection
  checkBruteForce(ip) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(ip);
    
    if (!attempts) {
      return { allowed: true, remainingAttempts: 5 };
    }
    
    // Clear old attempts (older than 15 minutes)
    if (now - attempts.lastAttempt > 15 * 60 * 1000) {
      this.failedAttempts.delete(ip);
      return { allowed: true, remainingAttempts: 5 };
    }
    
    const remainingAttempts = Math.max(0, 5 - attempts.count);
    
    if (attempts.count >= 5) {
      const lockoutTime = 15 * 60 * 1000; // 15 minutes
      const timeRemaining = lockoutTime - (now - attempts.lastAttempt);
      
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutTimeRemaining: Math.max(0, timeRemaining)
      };
    }
    
    return { allowed: true, remainingAttempts };
  }

  // Record failed login attempt
  recordFailedAttempt(ip) {
    const now = Date.now();
    const attempts = this.failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    attempts.count += 1;
    attempts.lastAttempt = now;
    
    this.failedAttempts.set(ip, attempts);
    
    // Log suspicious activity
    if (attempts.count >= 3) {
      console.warn(`⚠️ Multiple failed login attempts from IP: ${ip} (${attempts.count} attempts)`);
    }
  }

  // Clear failed attempts on successful login
  clearFailedAttempts(ip) {
    this.failedAttempts.delete(ip);
  }

  // Generate secure session token
  generateSessionToken(userId) {
    const tokenId = crypto.randomUUID();
    const expires = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
    
    this.sessionTokens.set(tokenId, {
      userId,
      expires,
      created: new Date()
    });
    
    return tokenId;
  }

  // Validate session token
  validateSessionToken(tokenId) {
    const session = this.sessionTokens.get(tokenId);
    
    if (!session) {
      return { valid: false, reason: 'Token not found' };
    }
    
    if (new Date() > session.expires) {
      this.sessionTokens.delete(tokenId);
      return { valid: false, reason: 'Token expired' };
    }
    
    return { valid: true, userId: session.userId };
  }

  // Revoke session token
  revokeSessionToken(tokenId) {
    return this.sessionTokens.delete(tokenId);
  }

  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = new Date();
    for (const [tokenId, session] of this.sessionTokens.entries()) {
      if (now > session.expires) {
        this.sessionTokens.delete(tokenId);
      }
    }
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove < and > characters
      .trim();
  }

  // SQL injection protection (for raw queries)
  escapeSql(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // Audit logging
  logSecurityEvent(event, details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getEventSeverity(event)
    };
    
    console.log(`🔒 Security Event: ${JSON.stringify(logEntry)}`);
    
    // In production, send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      // Send to external security monitoring service
      this.sendToSecurityMonitoring(logEntry);
    }
  }

  // Get event severity level
  getEventSeverity(event) {
    const severityMap = {
      'login_success': 'info',
      'login_failed': 'warning',
      'brute_force_attempt': 'critical',
      'unauthorized_access': 'critical',
      'data_access': 'info',
      'data_modification': 'warning',
      'admin_action': 'warning',
      'security_violation': 'critical',
      'file_upload': 'info',
      'password_change': 'warning'
    };
    
    return severityMap[event] || 'info';
  }

  // Send to external security monitoring (placeholder)
  sendToSecurityMonitoring(logEntry) {
    // Implementation depends on your security monitoring solution
    // Examples: Splunk, ELK Stack, AWS CloudTrail, etc.
    console.log('📤 Sending to security monitoring:', logEntry);
  }

  // Data masking for logs
  maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) return data;
    
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'accountNumber',
      'ssn', 'socialSecurityNumber', 'creditCard', 'bank'
    ];
    
    const masked = { ...data };
    
    for (const field of sensitiveFields) {
      if (masked[field]) {
        const value = String(masked[field]);
        masked[field] = '*'.repeat(Math.max(4, value.length - 4)) + value.slice(-4);
      }
    }
    
    return masked;
  }

  // Generate CSRF token
  generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate CSRF token
  validateCSRFToken(sessionToken, submittedToken) {
    return sessionToken === submittedToken;
  }

  // Check for suspicious patterns
  detectSuspiciousActivity(req) {
    const suspicious = [];
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /insert\s+into/i,
      /delete\s+from/i,
      /update\s+.*set/i,
      /'.*or.*'.*='/i
    ];
    
    const requestString = JSON.stringify(req.body) + JSON.stringify(req.query);
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(requestString)) {
        suspicious.push('SQL injection attempt');
        break;
      }
    }
    
    // Check for XSS patterns
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(requestString)) {
        suspicious.push('XSS attempt');
        break;
      }
    }
    
    // Check request frequency (simple rate limiting)
    const userAgent = req.get('User-Agent');
    if (!userAgent || userAgent.length < 10) {
      suspicious.push('Missing or suspicious user agent');
    }
    
    return suspicious;
  }

  // Middleware for security checks
  securityMiddleware() {
    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      // Check for suspicious activity
      const suspicious = this.detectSuspiciousActivity(req);
      if (suspicious.length > 0) {
        this.logSecurityEvent('security_violation', {
          ip,
          url: req.url,
          method: req.method,
          suspicious,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          success: false,
          error: 'Suspicious activity detected'
        });
      }
      
      // Sanitize inputs
      if (req.body) {
        req.body = this.sanitizeInputRecursive(req.body);
      }
      
      // Note: req.query is read-only in Express, so we don't modify it directly
      // Query parameters are already processed by Express and usually safe
      // For additional query validation, use route-specific validation
      
      next();
    };
  }

  // Recursive input sanitization
  sanitizeInputRecursive(obj) {
    if (typeof obj === 'string') {
      return this.sanitizeInput(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeInputRecursive(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeInputRecursive(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

module.exports = SecurityManager;