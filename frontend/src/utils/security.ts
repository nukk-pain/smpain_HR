/*
 * AI-HEADER
 * Intent: Security utilities for input sanitization and XSS prevention
 * Domain Meaning: Protects application from injection attacks and malicious input
 * Misleading Names: None
 * Data Contracts: Ensures all user input is sanitized before processing
 * PII: Handles sensitive payroll data with proper sanitization
 * Invariants: All input must be sanitized; No HTML/script execution allowed
 * RAG Keywords: security, sanitization, xss, validation, injection, prevention
 * DuplicatePolicy: canonical
 * FunctionIdentity: security-utilities-input-sanitization-xss-prevention
 */

/**
 * Sanitize general text input
 * DomainMeaning: Removes HTML tags and dangerous characters from user input
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns clean string without HTML or scripts
 * RAG_Keywords: sanitize, input, html, xss
 */
export function sanitizeInput(input: any): string {
  if (input === null || input === undefined) {
    return '';
  }
  
  // Convert to string
  let str = String(input);
  
  // Remove HTML tags
  str = str.replace(/<[^>]*>/g, '');
  
  // Remove potential SQL injection patterns
  str = str.replace(/(\-\-|;|\/\*|\*\/|xp_|sp_|DROP|DELETE|INSERT|UPDATE|EXEC|EXECUTE)/gi, '');
  
  // Remove script-related patterns
  str = str.replace(/(javascript:|onerror=|onclick=|onload=|eval\(|expression\()/gi, '');
  
  // Trim whitespace
  str = str.trim();
  
  return str;
}

/**
 * Sanitize numeric input
 * DomainMeaning: Ensures numeric values are valid and within bounds
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns valid number or 0
 * RAG_Keywords: sanitize, number, validation, bounds
 */
export function sanitizeNumber(
  input: any,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): number {
  if (input === null || input === undefined) {
    return 0;
  }
  
  // Extract numbers from string if needed
  const str = String(input).replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  
  if (isNaN(num)) {
    return 0;
  }
  
  // Apply bounds
  if (num < min) return min;
  if (num > max) return max;
  
  return num;
}

/**
 * Sanitize payroll data object
 * DomainMeaning: Sanitizes all fields in a payroll data object
 * MisleadingNames: None
 * SideEffects: Modifies input object
 * Invariants: Returns sanitized payroll data
 * RAG_Keywords: sanitize, payroll, data, object
 */
export function sanitizePayrollData(data: any): any {
  const sanitized: any = {};
  
  // Sanitize basic fields
  if (data.baseSalary !== undefined) {
    sanitized.baseSalary = sanitizeNumber(data.baseSalary, 0);
  }
  
  if (data.year !== undefined) {
    sanitized.year = sanitizeNumber(data.year, 2020, new Date().getFullYear() + 1);
  }
  
  if (data.month !== undefined) {
    sanitized.month = sanitizeNumber(data.month, 1, 12);
  }
  
  if (data.userId !== undefined) {
    sanitized.userId = sanitizeInput(data.userId);
  }
  
  // Sanitize allowances
  if (data.allowances) {
    sanitized.allowances = {};
    const allowanceFields = ['overtime', 'position', 'meal', 'transportation', 'other'];
    
    allowanceFields.forEach(field => {
      if (data.allowances[field] !== undefined) {
        sanitized.allowances[field] = sanitizeNumber(data.allowances[field], 0);
      }
    });
  }
  
  // Sanitize deductions
  if (data.deductions) {
    sanitized.deductions = {};
    const deductionFields = [
      'nationalPension',
      'healthInsurance',
      'employmentInsurance',
      'incomeTax',
      'localIncomeTax',
      'other'
    ];
    
    deductionFields.forEach(field => {
      if (data.deductions[field] !== undefined) {
        sanitized.deductions[field] = sanitizeNumber(data.deductions[field], 0);
      }
    });
  }
  
  // Copy other safe fields
  const safeFields = ['_id', 'paymentStatus', 'hasPayslip'];
  safeFields.forEach(field => {
    if (data[field] !== undefined) {
      sanitized[field] = data[field];
    }
  });
  
  return sanitized;
}

/**
 * Validate email format
 * DomainMeaning: Checks if email address is valid format
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns boolean validation result
 * RAG_Keywords: validate, email, format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (Korean)
 * DomainMeaning: Checks if phone number is valid Korean format
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns boolean validation result
 * RAG_Keywords: validate, phone, number, korean
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Check Korean phone number patterns
  // Mobile: 010, 011, 016, 017, 018, 019
  // Landline: 02, 031, 032, etc.
  const mobileRegex = /^01[016789]\d{7,8}$/;
  const landlineRegex = /^0[2-6]\d{7,9}$/;
  
  return mobileRegex.test(digits) || landlineRegex.test(digits);
}

/**
 * Escape HTML special characters
 * DomainMeaning: Escapes HTML entities to prevent rendering
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns escaped HTML string
 * RAG_Keywords: escape, html, entities, xss
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Prevent XSS in complex objects
 * DomainMeaning: Recursively sanitizes all string values in an object
 * MisleadingNames: None
 * SideEffects: Creates new sanitized object
 * Invariants: Returns sanitized copy of input
 * RAG_Keywords: prevent, xss, object, recursive, sanitize
 * DuplicatePolicy: canonical
 * FunctionIdentity: prevent-xss-recursive-object-sanitization
 */
export function preventXSS(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitives
  if (typeof obj === 'string') {
    return sanitizeInput(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => preventXSS(item));
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    Object.keys(obj).forEach(key => {
      // Sanitize the key itself
      const safeKey = sanitizeInput(key);
      sanitized[safeKey] = preventXSS(obj[key]);
    });
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Create Content Security Policy header
 * DomainMeaning: Generates CSP header for XSS prevention
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns CSP header string
 * RAG_Keywords: csp, content, security, policy, header
 */
export function getCSPHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'", // Allow inline styles for Material-UI
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* https://*.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Sanitize file name
 * DomainMeaning: Removes dangerous characters from file names
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns safe file name
 * RAG_Keywords: sanitize, file, name, path
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return 'file';
  
  // Remove path traversal attempts
  fileName = fileName.replace(/\.\./g, '');
  fileName = fileName.replace(/[\/\\]/g, '');
  
  // Remove special characters except dot and hyphen
  fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Limit length
  if (fileName.length > 255) {
    const ext = fileName.split('.').pop();
    fileName = fileName.substring(0, 250) + '.' + ext;
  }
  
  return fileName;
}

/**
 * Rate limiting helper
 * DomainMeaning: Implements simple rate limiting for API calls
 * MisleadingNames: None
 * SideEffects: Maintains internal state
 * Invariants: Enforces rate limits
 * RAG_Keywords: rate, limit, throttle, api
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 10) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Export rate limiter instance
export const rateLimiter = new RateLimiter();

/**
 * Validate and sanitize URL
 * DomainMeaning: Ensures URLs are safe and valid
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns sanitized URL or empty string
 * RAG_Keywords: validate, sanitize, url, xss
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Prevent javascript: and data: URLs
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    // If URL parsing fails, return empty
    return '';
  }
}