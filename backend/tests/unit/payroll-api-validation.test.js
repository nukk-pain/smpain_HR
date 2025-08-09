/*
 * AI-HEADER
 * Intent: Unit tests for payroll API request validation
 * Domain Meaning: Tests API request validation, sanitization, and security
 * Misleading Names: None
 * Data Contracts: Tests Joi validation schemas and middleware
 * PII: Uses test data only - no real salary information
 * Invariants: Invalid requests must be rejected; Valid requests pass through
 * RAG Keywords: api, validation, unit test, joi, middleware, security
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-api-validation-unit-tests
 */

const Joi = require('joi');
const { sanitizePayrollInput } = require('../../middleware/payrollSecurity');

describe('Payroll API Validation', () => {
  
  describe('Payroll Creation Schema', () => {
    // Define the validation schema that should be used in the API
    const payrollCreateSchema = Joi.object({
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
      year: Joi.number().integer().min(2020).max(2030).required(),
      month: Joi.number().integer().min(1).max(12).required(),
      baseSalary: Joi.number().min(0).required(),
      allowances: Joi.object({
        overtime: Joi.number().min(0).default(0),
        position: Joi.number().min(0).default(0),
        meal: Joi.number().min(0).default(0),
        transportation: Joi.number().min(0).default(0),
        other: Joi.number().min(0).default(0)
      }).default({}),
      deductions: Joi.object({
        nationalPension: Joi.number().min(0).default(0),
        healthInsurance: Joi.number().min(0).default(0),
        employmentInsurance: Joi.number().min(0).default(0),
        incomeTax: Joi.number().min(0).default(0),
        localIncomeTax: Joi.number().min(0).default(0),
        other: Joi.number().min(0).default(0)
      }).default({}),
      paymentStatus: Joi.string().valid('pending', 'approved', 'paid', 'cancelled').default('pending'),
      note: Joi.string().max(500).optional()
    });

    test('should validate valid payroll creation request', () => {
      const validRequest = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: 3000000,
        allowances: {
          overtime: 200000,
          meal: 150000
        },
        deductions: {
          nationalPension: 135000,
          incomeTax: 180000
        }
      };

      const { error, value } = payrollCreateSchema.validate(validRequest);

      expect(error).toBeUndefined();
      expect(value.userId).toBe('507f1f77bcf86cd799439011');
      expect(value.baseSalary).toBe(3000000);
      expect(value.allowances.overtime).toBe(200000);
      expect(value.allowances.position).toBe(0); // Default value
      expect(value.paymentStatus).toBe('pending'); // Default value
    });

    test('should reject missing required fields', () => {
      const invalidRequests = [
        { // Missing userId
          year: 2024,
          month: 8,
          baseSalary: 3000000
        },
        { // Missing year
          userId: '507f1f77bcf86cd799439011',
          month: 8,
          baseSalary: 3000000
        },
        { // Missing month
          userId: '507f1f77bcf86cd799439011',
          year: 2024,
          baseSalary: 3000000
        },
        { // Missing baseSalary
          userId: '507f1f77bcf86cd799439011',
          year: 2024,
          month: 8
        }
      ];

      invalidRequests.forEach(request => {
        const { error } = payrollCreateSchema.validate(request);
        expect(error).toBeDefined();
        expect(error.details).toHaveLength(1);
      });
    });

    test('should reject invalid userId format', () => {
      const invalidUserIds = [
        'invalid-id',
        '123',
        '507f1f77bcf86cd79943901', // Too short
        '507f1f77bcf86cd799439011x', // Too long
        '507f1f77bcf86cd79943901G' // Invalid character
      ];

      invalidUserIds.forEach(userId => {
        const request = {
          userId,
          year: 2024,
          month: 8,
          baseSalary: 3000000
        };

        const { error } = payrollCreateSchema.validate(request);
        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('userId');
      });
    });

    test('should reject invalid year ranges', () => {
      const invalidYears = [2019, 2031, 1999, 2050];

      invalidYears.forEach(year => {
        const request = {
          userId: '507f1f77bcf86cd799439011',
          year,
          month: 8,
          baseSalary: 3000000
        };

        const { error } = payrollCreateSchema.validate(request);
        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('year');
      });
    });

    test('should reject invalid month ranges', () => {
      const invalidMonths = [0, 13, -1, 15];

      invalidMonths.forEach(month => {
        const request = {
          userId: '507f1f77bcf86cd799439011',
          year: 2024,
          month,
          baseSalary: 3000000
        };

        const { error } = payrollCreateSchema.validate(request);
        expect(error).toBeDefined();
        expect(error.details[0].path).toContain('month');
      });
    });

    test('should reject negative salary and allowances', () => {
      const invalidRequest = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: -1000,
        allowances: {
          overtime: -50000
        },
        deductions: {
          nationalPension: -10000
        }
      };

      const { error } = payrollCreateSchema.validate(invalidRequest);
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThanOrEqual(1); // At least baseSalary error
    });

    test('should reject invalid payment status', () => {
      const request = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: 3000000,
        paymentStatus: 'invalid-status'
      };

      const { error } = payrollCreateSchema.validate(request);
      expect(error).toBeDefined();
      expect(error.details[0].path).toContain('paymentStatus');
    });

    test('should handle optional fields correctly', () => {
      const minimalRequest = {
        userId: '507f1f77bcf86cd799439011',
        year: 2024,
        month: 8,
        baseSalary: 3000000
      };

      const { error, value } = payrollCreateSchema.validate(minimalRequest);

      expect(error).toBeUndefined();
      expect(value.allowances).toBeDefined();
      expect(value.deductions).toBeDefined();
      expect(typeof value.allowances).toBe('object');
      expect(typeof value.deductions).toBe('object');
    });
  });

  describe('Payroll Update Schema', () => {
    const payrollUpdateSchema = Joi.object({
      baseSalary: Joi.number().min(0).optional(),
      allowances: Joi.object({
        overtime: Joi.number().min(0).optional(),
        position: Joi.number().min(0).optional(),
        meal: Joi.number().min(0).optional(),
        transportation: Joi.number().min(0).optional(),
        other: Joi.number().min(0).optional()
      }).optional(),
      deductions: Joi.object({
        nationalPension: Joi.number().min(0).optional(),
        healthInsurance: Joi.number().min(0).optional(),
        employmentInsurance: Joi.number().min(0).optional(),
        incomeTax: Joi.number().min(0).optional(),
        localIncomeTax: Joi.number().min(0).optional(),
        other: Joi.number().min(0).optional()
      }).optional(),
      paymentStatus: Joi.string().valid('pending', 'approved', 'paid', 'cancelled').optional(),
      note: Joi.string().max(500).optional()
    });

    test('should validate partial updates', () => {
      const partialUpdates = [
        { baseSalary: 3200000 },
        { allowances: { overtime: 250000 } },
        { deductions: { incomeTax: 200000 } },
        { paymentStatus: 'approved' },
        { note: 'Updated salary for promotion' },
        {} // Empty update should be valid
      ];

      partialUpdates.forEach(update => {
        const { error } = payrollUpdateSchema.validate(update);
        expect(error).toBeUndefined();
      });
    });

    test('should reject invalid partial updates', () => {
      const invalidUpdates = [
        { baseSalary: -1000 },
        { allowances: { overtime: -50000 } },
        { paymentStatus: 'invalid' },
        { note: 'x'.repeat(501) } // Too long note
      ];

      invalidUpdates.forEach(update => {
        const { error } = payrollUpdateSchema.validate(update);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Query Parameter Validation', () => {
    const querySchema = Joi.object({
      year: Joi.number().integer().min(2020).max(2030).optional(),
      month: Joi.number().integer().min(1).max(12).optional(),
      userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
      paymentStatus: Joi.string().valid('pending', 'approved', 'paid', 'cancelled').optional(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20)
    });

    test('should validate query parameters', () => {
      const validQueries = [
        { year: 2024, month: 8 },
        { userId: '507f1f77bcf86cd799439011' },
        { paymentStatus: 'pending' },
        { page: 2, limit: 50 },
        {} // Empty query
      ];

      validQueries.forEach(query => {
        const { error, value } = querySchema.validate(query);
        expect(error).toBeUndefined();
        expect(value.page).toBeGreaterThanOrEqual(1);
        expect(value.limit).toBeGreaterThanOrEqual(1);
      });
    });

    test('should reject invalid query parameters', () => {
      const invalidQueries = [
        { year: 2019 },
        { month: 13 },
        { userId: 'invalid' },
        { paymentStatus: 'invalid' },
        { page: 0 },
        { limit: 101 }
      ];

      invalidQueries.forEach(query => {
        const { error } = querySchema.validate(query);
        expect(error).toBeDefined();
      });
    });
  });

  describe('Security Middleware', () => {
    test('should sanitize payroll input data', () => {
      const mockReq = {
        body: {
          userId: '507f1f77bcf86cd799439011',
          year: 2024,
          month: 8,
          baseSalary: 3000000,
          paymentStatus: '<script>alert("xss")</script>pending',
          note: '  Regular note with extra spaces  '
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      sanitizePayrollInput(mockReq, mockRes, mockNext);

      // Should sanitize XSS attempts
      expect(mockReq.body.paymentStatus).not.toContain('<script>');
      
      // Should trim whitespace
      expect(mockReq.body.note).toBe('Regular note with extra spaces');
      
      // Should call next() if successful
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject invalid year values', () => {
      const mockReq = {
        body: {
          year: 2015, // Invalid year
          month: 8,
          baseSalary: 3000000
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      sanitizePayrollInput(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid year value'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid month values', () => {
      const mockReq = {
        body: {
          year: 2024,
          month: 13, // Invalid month
          baseSalary: 3000000
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      sanitizePayrollInput(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid month value'
      });
    });

    test('should sanitize nested allowances and deductions', () => {
      const mockReq = {
        body: {
          allowances: {
            overtime: 'invalid', // Should be converted to 0
            meal: 150000
          },
          deductions: {
            incomeTax: -100, // Negative should be converted to 0
            nationalPension: 135000
          }
        }
      };

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      const mockNext = jest.fn();

      sanitizePayrollInput(mockReq, mockRes, mockNext);

      expect(mockReq.body.allowances.overtime).toBe(0);
      expect(mockReq.body.allowances.meal).toBe(150000);
      expect(mockReq.body.deductions.incomeTax).toBe(0);
      expect(mockReq.body.deductions.nationalPension).toBe(135000);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});