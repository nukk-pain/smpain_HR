/*
 * AI-HEADER
 * Intent: Test suite for security utilities
 * Domain Meaning: Input validation and XSS prevention for payroll data
 * Misleading Names: None
 * Data Contracts: Ensures safe data handling across the application
 * PII: Handles sensitive data sanitization
 * Invariants: Must prevent XSS and injection attacks
 * RAG Keywords: security, sanitization, xss, validation, test
 * DuplicatePolicy: canonical
 * FunctionIdentity: test-security-utilities-input-sanitization
 */

import {
  sanitizeInput,
  sanitizeNumber,
  sanitizePayrollData,
  validateEmail,
  validatePhoneNumber,
  escapeHtml,
  preventXSS
} from './security';

describe('Security Utilities', () => {
  describe('sanitizeInput', () => {
    test('should remove HTML tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      expect(sanitizeInput(input)).toBe('Hello');
    });

    test('should trim whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizeInput(input)).toBe('Hello World');
    });

    test('should handle null and undefined', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
    });

    test('should remove SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --";
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain(';');
    });
  });

  describe('sanitizeNumber', () => {
    test('should parse valid numbers', () => {
      expect(sanitizeNumber('123')).toBe(123);
      expect(sanitizeNumber('123.45')).toBe(123.45);
      expect(sanitizeNumber(456)).toBe(456);
    });

    test('should return 0 for invalid input', () => {
      expect(sanitizeNumber('abc')).toBe(0);
      expect(sanitizeNumber(null)).toBe(0);
      expect(sanitizeNumber(undefined)).toBe(0);
    });

    test('should handle negative numbers', () => {
      expect(sanitizeNumber('-100')).toBe(-100);
    });

    test('should enforce min/max values', () => {
      expect(sanitizeNumber('100', 0, 50)).toBe(50);
      expect(sanitizeNumber('-10', 0, 100)).toBe(0);
    });
  });

  describe('sanitizePayrollData', () => {
    test('should sanitize all fields in payroll data', () => {
      const data = {
        baseSalary: '3000000<script>',
        year: '2024',
        month: '8',
        userId: 'user123<img src=x onerror=alert(1)>',
        allowances: {
          overtime: '200000',
          position: 'abc150000',
          meal: 100000,
          transportation: 50000,
          other: null
        }
      };

      const sanitized = sanitizePayrollData(data);
      
      expect(sanitized.baseSalary).toBe(3000000);
      expect(sanitized.year).toBe(2024);
      expect(sanitized.month).toBe(8);
      expect(sanitized.userId).toBe('user123');
      expect(sanitized.allowances.overtime).toBe(200000);
      expect(sanitized.allowances.position).toBe(150000);
      expect(sanitized.allowances.other).toBe(0);
    });

    test('should handle missing fields', () => {
      const data = {
        baseSalary: 3000000
      };

      const sanitized = sanitizePayrollData(data);
      
      expect(sanitized.baseSalary).toBe(3000000);
      expect(sanitized.allowances).toBeUndefined();
      expect(sanitized.deductions).toBeUndefined();
    });
  });

  describe('validateEmail', () => {
    test('should validate correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@company.co.kr')).toBe(true);
    });

    test('should reject invalid email formats', () => {
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validatePhoneNumber', () => {
    test('should validate Korean phone numbers', () => {
      expect(validatePhoneNumber('010-1234-5678')).toBe(true);
      expect(validatePhoneNumber('01012345678')).toBe(true);
      expect(validatePhoneNumber('02-123-4567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc-defg-hijk')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  describe('escapeHtml', () => {
    test('should escape HTML special characters', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('"quotes"')).toBe('&quot;quotes&quot;');
      expect(escapeHtml("'apostrophe'")).toBe('&#39;apostrophe&#39;');
      expect(escapeHtml('&ampersand')).toBe('&amp;ampersand');
    });

    test('should handle normal text', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('preventXSS', () => {
    test('should sanitize object with potential XSS', () => {
      const obj = {
        name: '<script>alert("XSS")</script>John',
        age: 30,
        description: 'Normal text',
        nested: {
          field: '<img src=x onerror=alert(1)>'
        }
      };

      const safe = preventXSS(obj);
      
      expect(safe.name).toBe('John');
      expect(safe.age).toBe(30);
      expect(safe.description).toBe('Normal text');
      expect(safe.nested.field).toBe('');
    });

    test('should handle arrays', () => {
      const arr = ['<script>bad</script>', 'good', 123];
      const safe = preventXSS(arr);
      
      expect(safe[0]).toBe('');
      expect(safe[1]).toBe('good');
      expect(safe[2]).toBe(123);
    });

    test('should handle null and undefined', () => {
      expect(preventXSS(null)).toBeNull();
      expect(preventXSS(undefined)).toBeUndefined();
    });
  });
});