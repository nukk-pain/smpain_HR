// Centralized validation schemas using Joi
const Joi = require('joi');

// Common validation patterns
const patterns = {
  objectId: /^[0-9a-fA-F]{24}$/,
  username: /^[a-zA-Z0-9가-힣_-]{2,30}$/,
  password: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  employeeId: /^EMP\d{3,}$/,
  yearMonth: /^\d{4}-(0[1-9]|1[0-2])$/,
  phoneNumber: /^01[0-9]-\d{3,4}-\d{4}$/,
};

// Base schemas
const baseSchemas = {
  objectId: Joi.string().pattern(patterns.objectId).required(),
  optionalObjectId: Joi.string().pattern(patterns.objectId).optional(),
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  }),
};

// User validation schemas
const userSchemas = {
  create: Joi.object({
    username: Joi.string().pattern(patterns.username).required(),
    password: Joi.string().pattern(patterns.password).required(),
    name: Joi.string().min(2).max(50).required(),
    role: Joi.string().valid('Admin', 'Manager', 'Supervisor', 'User').required(),
    department: Joi.string().min(1).max(50).optional(),
    position: Joi.string().min(1).max(50).optional(),
    employeeId: Joi.string().pattern(patterns.employeeId).optional(),
    phone: Joi.string().pattern(patterns.phoneNumber).optional(),
    hireDate: Joi.date().iso().max('now').optional(),
    baseSalary: Joi.number().integer().min(0).optional(),
    contractType: Joi.string().valid('regular', 'contract', 'intern').default('regular'),
    isActive: Joi.boolean().default(true),
    permissions: Joi.array().items(Joi.string()).optional(),
  }),

  update: Joi.object({
    username: Joi.string().pattern(patterns.username).optional(),
    name: Joi.string().min(2).max(50).optional(),
    role: Joi.string().valid('Admin', 'Manager', 'Supervisor', 'User').optional(),
    department: Joi.string().min(1).max(50).optional(),
    position: Joi.string().min(1).max(50).optional(),
    employeeId: Joi.string().pattern(patterns.employeeId).optional(),
    phone: Joi.string().pattern(patterns.phoneNumber).optional(),
    hireDate: Joi.date().iso().max('now').optional(),
    baseSalary: Joi.number().integer().min(0).optional(),
    contractType: Joi.string().valid('regular', 'contract', 'intern').optional(),
    isActive: Joi.boolean().optional(),
    terminationDate: Joi.date().iso().optional(),
    leaveBalance: Joi.number().min(-10).max(50).optional(), // Allow some negative for advance usage
    permissions: Joi.array().items(Joi.string()).optional(),
  }),

  profileUpdate: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    birthDate: Joi.date().iso().max('now').optional(),
    phoneNumber: Joi.string().pattern(patterns.phoneNumber).optional(),
  }),

  passwordChange: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(patterns.password).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
  }),

  bulkImport: Joi.object({
    users: Joi.array().items(
      Joi.object({
        username: Joi.string().pattern(patterns.username).required(),
        name: Joi.string().min(2).max(50).required(),
        role: Joi.string().valid('Admin', 'Manager', 'Supervisor', 'User').required(),
        department: Joi.string().min(1).max(50).optional(),
        position: Joi.string().min(1).max(50).optional(),
        phone: Joi.string().pattern(patterns.phoneNumber).optional(),
        hireDate: Joi.date().iso().max('now').optional(),
        baseSalary: Joi.number().integer().min(0).optional(),
      })
    ).min(1).max(100).required(),
  }),
};

// Leave request validation schemas
const leaveSchemas = {
  create: Joi.object({
    startDate: Joi.date().iso().min('now').required(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
    reason: Joi.string().min(5).max(500).required(),
    daysCount: Joi.number().positive().max(30).required(),
    emergencyContact: Joi.string().optional(),
    handoverNotes: Joi.string().max(1000).optional(),
  }),

  update: Joi.object({
    startDate: Joi.date().iso().min('now').optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    reason: Joi.string().min(5).max(500).optional(),
    daysCount: Joi.number().positive().max(30).optional(),
    emergencyContact: Joi.string().optional(),
    handoverNotes: Joi.string().max(1000).optional(),
  }),

  approval: Joi.object({
    approved: Joi.boolean().required(),
    note: Joi.string().max(500).optional(),
    rejectionReason: Joi.when('approved', {
      is: false,
      then: Joi.string().min(5).max(500).required(),
      otherwise: Joi.optional(),
    }),
  }),

  cancellation: Joi.object({
    reason: Joi.string().min(5).max(500).required(),
  }),

  bulkApproval: Joi.object({
    requestIds: Joi.array().items(baseSchemas.objectId).min(1).max(50).required(),
    approved: Joi.boolean().required(),
    note: Joi.string().max(500).optional(),
  }),

  carryOver: Joi.object({
    year: Joi.number().integer().min(2020).max(2030).required(),
    maxCarryOver: Joi.number().integer().min(0).max(25).default(15),
  }),
};

// Payroll validation schemas
const payrollSchemas = {
  create: Joi.object({
    userId: baseSchemas.objectId,
    year: Joi.number().integer().min(2020).max(2030).required(),
    month: Joi.number().integer().min(1).max(12).required(),
    baseSalary: Joi.number().integer().min(0).required(),
    
    // Allowances object structure
    allowances: Joi.object({
      overtime: Joi.number().integer().min(0).default(0),
      position: Joi.number().integer().min(0).default(0),
      meal: Joi.number().integer().min(0).default(0),
      transportation: Joi.number().integer().min(0).default(0),
      other: Joi.number().integer().min(0).default(0)
    }).default({}),
    
    // Deductions object structure  
    deductions: Joi.object({
      nationalPension: Joi.number().integer().min(0).default(0),
      healthInsurance: Joi.number().integer().min(0).default(0),
      employmentInsurance: Joi.number().integer().min(0).default(0),
      incomeTax: Joi.number().integer().min(0).default(0),
      localIncomeTax: Joi.number().integer().min(0).default(0),
      other: Joi.number().integer().min(0).default(0)
    }).default({}),
    
    paymentStatus: Joi.string().valid('pending', 'approved', 'paid').default('pending'),
    paymentDate: Joi.date().iso().optional(),
    notes: Joi.string().max(1000).optional(),
  }),

  update: Joi.object({
    baseSalary: Joi.number().integer().min(0).optional(),
    
    // Allowances object structure
    allowances: Joi.object({
      overtime: Joi.number().integer().min(0).optional(),
      position: Joi.number().integer().min(0).optional(),
      meal: Joi.number().integer().min(0).optional(),
      transportation: Joi.number().integer().min(0).optional(),
      other: Joi.number().integer().min(0).optional()
    }).optional(),
    
    // Deductions object structure
    deductions: Joi.object({
      nationalPension: Joi.number().integer().min(0).optional(),
      healthInsurance: Joi.number().integer().min(0).optional(),
      employmentInsurance: Joi.number().integer().min(0).optional(),
      incomeTax: Joi.number().integer().min(0).optional(),
      localIncomeTax: Joi.number().integer().min(0).optional(),
      other: Joi.number().integer().min(0).optional()
    }).optional(),
    
    paymentStatus: Joi.string().valid('pending', 'approved', 'paid').optional(),
    paymentDate: Joi.date().iso().optional(),
    notes: Joi.string().max(1000).optional(),
  }),

  bulkCreate: Joi.object({
    payrolls: Joi.array().items(
      Joi.object({
        userId: baseSchemas.objectId,
        yearMonth: Joi.string().pattern(patterns.yearMonth).required(),
        baseSalary: Joi.number().integer().min(0).required(),
        incentive: Joi.number().integer().min(0).default(0),
        netPay: Joi.number().integer().min(0).required(),
      })
    ).min(1).max(200).required(),
  }),
};

// Department validation schemas
const departmentSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    supervisorId: baseSchemas.optionalObjectId,
    isActive: Joi.boolean().default(true),
    budget: Joi.number().integer().min(0).optional(),
    code: Joi.string().alphanum().min(2).max(10).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    supervisorId: baseSchemas.optionalObjectId,
    isActive: Joi.boolean().optional(),
    budget: Joi.number().integer().min(0).optional(),
    code: Joi.string().alphanum().min(2).max(10).optional(),
  }),
};

// Sales validation schemas
const salesSchemas = {
  create: Joi.object({
    userId: baseSchemas.objectId,
    yearMonth: Joi.string().pattern(patterns.yearMonth).required(),
    amount: Joi.number().min(0).required(),
    target: Joi.number().min(0).optional(),
    commission: Joi.number().min(0).optional(),
    notes: Joi.string().max(1000).optional(),
  }),

  update: Joi.object({
    amount: Joi.number().min(0).optional(),
    target: Joi.number().min(0).optional(),
    commission: Joi.number().min(0).optional(),
    notes: Joi.string().max(1000).optional(),
  }),
};

// Bonus validation schemas
const bonusSchemas = {
  create: Joi.object({
    userId: baseSchemas.objectId,
    yearMonth: Joi.string().pattern(patterns.yearMonth).required(),
    amount: Joi.number().min(0).required(),
    type: Joi.string().valid('performance', 'holiday', 'project', 'other').required(),
    reason: Joi.string().min(5).max(500).required(),
    notes: Joi.string().max(1000).optional(),
  }),

  update: Joi.object({
    amount: Joi.number().min(0).optional(),
    type: Joi.string().valid('performance', 'holiday', 'project', 'other').optional(),
    reason: Joi.string().min(5).max(500).optional(),
    notes: Joi.string().max(1000).optional(),
  }),
};

// Authentication validation schemas
const authSchemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(patterns.password).required(),
  }),

  resetPassword: Joi.object({
    password: Joi.string().pattern(patterns.password).required(),
  }),
};

// Admin validation schemas
const adminSchemas = {
  leaveAdjust: Joi.object({
    userId: baseSchemas.objectId,
    type: Joi.string().valid('add', 'subtract', 'carry_over', 'cancel_usage').required(),
    amount: Joi.number().min(-50).max(50).required(),
    reason: Joi.string().min(5).max(500).required(),
    effectiveDate: Joi.date().iso().default('now'),
  }),

  policyUpdate: Joi.object({
    saturdayMultiplier: Joi.number().min(0).max(1).default(0.5),
    sundayMultiplier: Joi.number().min(0).max(1).default(0),
    maxConsecutiveDays: Joi.number().integer().min(1).max(30).default(15),
    minAdvanceNoticeDays: Joi.number().integer().min(0).max(30).default(3),
    maxCarryOverDays: Joi.number().integer().min(0).max(30).default(15),
    allowAdvanceUsage: Joi.boolean().default(true),
    maxAdvanceUsageDays: Joi.number().integer().min(0).max(10).default(3),
    effectiveDate: Joi.date().iso().default('now'),
  }),

  bulkApprove: Joi.object({
    requestIds: Joi.array().items(baseSchemas.objectId).min(1).max(100).required(),
    action: Joi.string().valid('approve', 'reject').required(),
    note: Joi.string().max(500).optional(),
  }),
};

// Query parameter validation schemas
const querySchemas = {
  userQuery: Joi.object({
    department: Joi.string().optional(),
    position: Joi.string().optional(),
    role: Joi.string().valid('Admin', 'Manager', 'Supervisor', 'User').optional(),
    isActive: Joi.boolean().optional(),
    search: Joi.string().min(1).max(100).optional(),
    ...baseSchemas.paginationQuery.describe().keys,
  }),

  leaveQuery: Joi.object({
    user_id: baseSchemas.optionalObjectId,
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    month: Joi.string().pattern(patterns.yearMonth).optional(),
    ...baseSchemas.paginationQuery.describe().keys,
  }),

  payrollQuery: Joi.object({
    userId: baseSchemas.optionalObjectId,
    yearMonth: Joi.string().pattern(patterns.yearMonth).optional(),
    year: Joi.number().integer().min(2020).max(2030).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    department: Joi.string().optional(),
    ...baseSchemas.paginationQuery.describe().keys,
  }),

  reportQuery: Joi.object({
    yearMonth: Joi.string().pattern(patterns.yearMonth).required(),
    department: Joi.string().optional(),
    format: Joi.string().valid('json', 'excel', 'pdf').default('json'),
    includeInactive: Joi.boolean().default(false),
  }),
};

// File upload validation schemas
const uploadSchemas = {
  file: Joi.object({
    type: Joi.string().valid('payroll', 'users', 'report').required(),
    description: Joi.string().max(500).optional(),
  }),
};

// Create validation middleware
const createValidationMiddleware = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        errors,
      });
    }

    // Replace original data with validated and converted data
    req[property] = value;
    next();
  };
};

// Validation middleware factories
const validate = {
  body: (schema) => createValidationMiddleware(schema, 'body'),
  query: (schema) => createValidationMiddleware(schema, 'query'),
  params: (schema) => createValidationMiddleware(schema, 'params'),
};

// Export all schemas and utilities
module.exports = {
  // Schema groups
  userSchemas,
  leaveSchemas,
  payrollSchemas,
  departmentSchemas,
  salesSchemas,
  bonusSchemas,
  authSchemas,
  adminSchemas,
  querySchemas,
  uploadSchemas,
  baseSchemas,

  // Validation utilities
  validate,
  createValidationMiddleware,
  patterns,

  // Common validators
  validateObjectId: validate.params(Joi.object({
    id: baseSchemas.objectId,
  })),

  validatePagination: validate.query(baseSchemas.paginationQuery),

  validateDateRange: validate.query(baseSchemas.dateRange),
};