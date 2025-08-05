const Joi = require('joi');

// User validation schemas
const userSchemas = {
  create: Joi.object({
    username: Joi.string().pattern(/^[a-zA-Z0-9가-힣_-]{2,30}$/).required().messages({
      'string.pattern.base': 'Username can contain letters, numbers, Korean characters, underscore, and hyphen (2-30 characters)'
    }),
    password: Joi.string().min(6).max(100).required(),
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    role: Joi.string().valid('admin', 'supervisor', 'user').required(),
    department: Joi.string().min(1).max(50).required(),
    position: Joi.string().min(1).max(50).required(),
    employeeId: Joi.string().min(1).max(20).required(),
    phone: Joi.string().pattern(/^01[0-9]-\d{4}-\d{4}$/).required(),
    accountNumber: Joi.string().min(10).max(20),
    hireDate: Joi.date().required(),
    managerId: Joi.string().allow(null),
    supervisorId: Joi.string().allow(null),
    contractType: Joi.string().valid('regular', 'contract', 'intern').required(),
    baseSalary: Joi.number().min(0),
    incentiveFormula: Joi.string().allow(''),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    department: Joi.string().min(1).max(50),
    position: Joi.string().min(1).max(50),
    phone: Joi.string().pattern(/^01[0-9]-\d{4}-\d{4}$/),
    accountNumber: Joi.string().min(10).max(20),
    managerId: Joi.string().allow(null),
    supervisorId: Joi.string().allow(null),
    contractType: Joi.string().valid('regular', 'contract', 'intern'),
    baseSalary: Joi.number().min(0),
    incentiveFormula: Joi.string().allow(''),
    isActive: Joi.boolean(),
    terminationDate: Joi.date().allow(null),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required(),
  }),
};

// Payroll validation schemas
const payrollSchemas = {
  monthly: Joi.object({
    employee_id: Joi.string().required(),
    year_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    base_salary: Joi.number().min(0).required(),
    incentive: Joi.number().min(0).default(0),
    bonus_total: Joi.number().min(0).default(0),
    award_total: Joi.number().min(0).default(0),
    deductions: Joi.number().min(0).default(0),
    notes: Joi.string().max(500).allow(''),
  }),

  bonus: Joi.object({
    user_id: Joi.string().required(),
    type: Joi.string().valid('bonus', 'award').required(),
    amount: Joi.number().min(0).required(),
    reason: Joi.string().min(1).max(200).required(),
    date: Joi.date().required(),
    year_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  }),

  sales: Joi.object({
    user_id: Joi.string().required(),
    sales_amount: Joi.number().min(0).required(),
    target_amount: Joi.number().min(0).required(),
    year_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    notes: Joi.string().max(500).allow(''),
  }),
};

// Leave validation schemas
const leaveSchemas = {
  request: Joi.object({
    start_date: Joi.date().required(),
    end_date: Joi.date().min(Joi.ref('start_date')).required(),
    leave_type: Joi.string().valid('annual', 'sick', 'personal', 'maternity', 'paternity').required(),
    reason: Joi.string().min(1).max(500).required(),
    half_day: Joi.boolean().default(false),
  }),

  approve: Joi.object({
    action: Joi.string().valid('approve', 'reject').required(),
    comments: Joi.string().max(500).allow(''),
  }),
};

// Incentive validation schemas
const incentiveSchemas = {
  formula: Joi.object({
    formula: Joi.string().min(1).max(1000).required(),
    variables: Joi.object().pattern(
      Joi.string(),
      Joi.number()
    ).required(),
  }),

  calculate: Joi.object({
    employee_id: Joi.string().required(),
    sales_amount: Joi.number().min(0).required(),
    year_month: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
    formula: Joi.string().allow(''),
    variables: Joi.object().pattern(
      Joi.string(),
      Joi.number()
    ),
  }),

  validate: Joi.object({
    formula: Joi.string().min(1).max(1000).required(),
    variables: Joi.object().pattern(
      Joi.string(),
      Joi.number()
    ).required(),
  }),
};

// Department validation schemas
const departmentSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(50).required(),
    description: Joi.string().max(200).allow(''),
    manager_id: Joi.string().allow(null),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(50),
    description: Joi.string().max(200).allow(''),
    manager_id: Joi.string().allow(null),
  }),
};

// File upload validation
const fileSchemas = {
  upload: Joi.object({
    yearMonth: Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  }),
};

// Auth validation schemas
const authSchemas = {
  login: Joi.object({
    username: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

// Query parameter validation
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().allow(''),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  dateRange: Joi.object({
    start_date: Joi.date(),
    end_date: Joi.date().min(Joi.ref('start_date')),
  }),

  userFilter: Joi.object({
    department: Joi.string(),
    position: Joi.string(),
    isActive: Joi.boolean(),
    search: Joi.string().max(100),
  }),
};

// Custom validation functions
const customValidations = {
  // Validate Korean phone number
  koreanPhone: (value, helpers) => {
    const phoneRegex = /^01[0-9]-\d{4}-\d{4}$/;
    if (!phoneRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate Korean name
  koreanName: (value, helpers) => {
    const nameRegex = /^[가-힣]{2,10}$/;
    if (!nameRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate employee ID format
  employeeId: (value, helpers) => {
    const empIdRegex = /^[A-Z]{2,3}\d{3,6}$/;
    if (!empIdRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    return value;
  },

  // Validate year-month format
  yearMonth: (value, helpers) => {
    const ymRegex = /^\d{4}-\d{2}$/;
    if (!ymRegex.test(value)) {
      return helpers.error('any.invalid');
    }
    
    const [year, month] = value.split('-');
    const y = parseInt(year);
    const m = parseInt(month);
    
    if (y < 2020 || y > 2030 || m < 1 || m > 12) {
      return helpers.error('any.invalid');
    }
    
    return value;
  },

  // Validate incentive formula safety
  incentiveFormula: (value, helpers) => {
    // Check for dangerous keywords
    const dangerousKeywords = [
      'eval', 'Function', 'setTimeout', 'setInterval',
      'require', 'import', 'process', 'global',
      'window', 'document', 'console', '__proto__'
    ];

    const lowerValue = value.toLowerCase();
    for (const keyword of dangerousKeywords) {
      if (lowerValue.includes(keyword.toLowerCase())) {
        return helpers.error('any.invalid');
      }
    }

    // Allow only specific characters and patterns
    const allowedPattern = /^[a-zA-Z0-9_\s+\-*/.()><=&|?:]+$/;
    if (!allowedPattern.test(value)) {
      return helpers.error('any.invalid');
    }

    return value;
  },
};

// Validation middleware factory
const createValidator = (schema, target = 'body') => {
  return (req, res, next) => {
    const data = target === 'query' ? req.query : 
                  target === 'params' ? req.params : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    // Replace the original data with validated and sanitized data
    if (target === 'query') {
      req.query = value;
    } else if (target === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }

    next();
  };
};

module.exports = {
  userSchemas,
  payrollSchemas,
  leaveSchemas,
  incentiveSchemas,
  departmentSchemas,
  fileSchemas,
  authSchemas,
  querySchemas,
  customValidations,
  createValidator,
};