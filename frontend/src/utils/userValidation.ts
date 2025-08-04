/**
 * User validation utilities
 * 
 * Provides comprehensive validation functions for user data with
 * consistent error messages and type safety.
 */

// Validation result interface
export interface ValidationResult {
  readonly isValid: boolean;
  readonly message: string;
}

// User validation data interface
export interface UserValidationData {
  readonly username?: string;
  readonly password?: string;
  readonly name?: string;
  readonly employeeId?: string;
  readonly email?: string;
  readonly phoneNumber?: string;
}

// Form validation result interface
export interface FormValidationResult {
  readonly isValid: boolean;
  readonly errors: Readonly<Record<string, string>>;
}

// Validation configuration
const VALIDATION_CONFIG = {
  USERNAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 30,
    PATTERN: /^[a-zA-Z0-9가-힣_-]+$/,
    MESSAGES: {
      REQUIRED: '사용자명은 필수입니다.',
      MIN_LENGTH: '사용자명은 2자 이상이어야 합니다.',
      MAX_LENGTH: '사용자명은 30자 이하여야 합니다.',
      INVALID_CHARS: '사용자명에는 영문, 숫자, 한글, _, - 만 사용 가능합니다.'
    }
  },
  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 50,
    MESSAGES: {
      REQUIRED: '비밀번호는 필수입니다.',
      MIN_LENGTH: '비밀번호는 6자 이상이어야 합니다.',
      MAX_LENGTH: '비밀번호는 50자 이하여야 합니다.'
    }
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MESSAGES: {
      REQUIRED: '이메일은 필수입니다.',
      INVALID_FORMAT: '올바른 이메일 형식이 아닙니다.'
    }
  },
  PHONE: {
    PATTERN: /^(01[016789]|02|0[3-9][0-9])-?[0-9]{3,4}-?[0-9]{4}$|^01[016789][0-9]{7,8}$/,
    MESSAGES: {
      INVALID_FORMAT: '올바른 전화번호 형식이 아닙니다. (예: 010-1234-5678)'
    }
  },
  EMPLOYEE_ID: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    MESSAGES: {
      REQUIRED: '사원번호는 필수입니다.',
      MIN_LENGTH: '사원번호는 3자 이상이어야 합니다.',
      MAX_LENGTH: '사원번호는 20자 이하여야 합니다.'
    }
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    MESSAGES: {
      REQUIRED: '이름은 필수입니다.',
      MIN_LENGTH: '이름은 2자 이상이어야 합니다.',
      MAX_LENGTH: '이름은 50자 이하여야 합니다.'
    }
  }
} as const;

// Helper function to check if string is empty
const isEmpty = (value: string): boolean => !value || value.trim() === '';

/**
 * Validate username with comprehensive rules
 */
export const validateUsername = (username: string): ValidationResult => {
  if (isEmpty(username)) {
    return { isValid: false, message: VALIDATION_CONFIG.USERNAME.MESSAGES.REQUIRED };
  }

  const trimmed = username.trim();
  
  if (trimmed.length < VALIDATION_CONFIG.USERNAME.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.USERNAME.MESSAGES.MIN_LENGTH };
  }

  if (trimmed.length > VALIDATION_CONFIG.USERNAME.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.USERNAME.MESSAGES.MAX_LENGTH };
  }

  if (!VALIDATION_CONFIG.USERNAME.PATTERN.test(trimmed)) {
    return { isValid: false, message: VALIDATION_CONFIG.USERNAME.MESSAGES.INVALID_CHARS };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate password with security requirements
 */
export const validatePassword = (password: string): ValidationResult => {
  if (isEmpty(password)) {
    return { isValid: false, message: VALIDATION_CONFIG.PASSWORD.MESSAGES.REQUIRED };
  }

  if (password.length < VALIDATION_CONFIG.PASSWORD.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.PASSWORD.MESSAGES.MIN_LENGTH };
  }

  if (password.length > VALIDATION_CONFIG.PASSWORD.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.PASSWORD.MESSAGES.MAX_LENGTH };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationResult => {
  if (isEmpty(email)) {
    return { isValid: false, message: VALIDATION_CONFIG.EMAIL.MESSAGES.REQUIRED };
  }

  const trimmed = email.trim();
  
  if (!VALIDATION_CONFIG.EMAIL.PATTERN.test(trimmed)) {
    return { isValid: false, message: VALIDATION_CONFIG.EMAIL.MESSAGES.INVALID_FORMAT };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate phone number (optional field)
 */
export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (isEmpty(phoneNumber)) {
    return { isValid: true, message: '' }; // Optional field
  }

  const cleaned = phoneNumber.replace(/\s/g, ''); // Remove spaces
  
  if (!VALIDATION_CONFIG.PHONE.PATTERN.test(cleaned)) {
    return { isValid: false, message: VALIDATION_CONFIG.PHONE.MESSAGES.INVALID_FORMAT };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate employee ID
 */
export const validateEmployeeId = (employeeId: string): ValidationResult => {
  if (isEmpty(employeeId)) {
    return { isValid: false, message: VALIDATION_CONFIG.EMPLOYEE_ID.MESSAGES.REQUIRED };
  }

  const trimmed = employeeId.trim();
  
  if (trimmed.length < VALIDATION_CONFIG.EMPLOYEE_ID.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.EMPLOYEE_ID.MESSAGES.MIN_LENGTH };
  }

  if (trimmed.length > VALIDATION_CONFIG.EMPLOYEE_ID.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.EMPLOYEE_ID.MESSAGES.MAX_LENGTH };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate name field
 */
export const validateName = (name: string): ValidationResult => {
  if (isEmpty(name)) {
    return { isValid: false, message: VALIDATION_CONFIG.NAME.MESSAGES.REQUIRED };
  }

  const trimmed = name.trim();
  
  if (trimmed.length < VALIDATION_CONFIG.NAME.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.NAME.MESSAGES.MIN_LENGTH };
  }

  if (trimmed.length > VALIDATION_CONFIG.NAME.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_CONFIG.NAME.MESSAGES.MAX_LENGTH };
  }

  return { isValid: true, message: '' };
};

// Validation options
export interface ValidationOptions {
  readonly isEdit?: boolean;
  readonly skipRequired?: boolean;
}

// Field validators mapping
const FIELD_VALIDATORS = {
  username: validateUsername,
  password: validatePassword,
  name: validateName,
  employeeId: validateEmployeeId,
  email: validateEmail,
  phoneNumber: validatePhoneNumber
} as const;

/**
 * Comprehensive user form validation with flexible options
 */
export const validateUserForm = (
  userData: Partial<UserValidationData>, 
  options: ValidationOptions = {}
): FormValidationResult => {
  const errors: Record<string, string> = {};
  const { isEdit = false, skipRequired = false } = options;

  // Validate each field if present
  Object.entries(userData).forEach(([field, value]) => {
    if (value !== undefined && field in FIELD_VALIDATORS) {
      const validator = FIELD_VALIDATORS[field as keyof typeof FIELD_VALIDATORS];
      const result = validator(value as string);
      
      if (!result.isValid) {
        errors[field] = result.message;
      }
    }
  });

  // Check required fields for new users
  if (!isEdit && !skipRequired) {
    const requiredFields = ['username', 'password', 'name', 'employeeId'] as const;
    
    requiredFields.forEach(field => {
      if (userData[field] === undefined) {
        const validator = FIELD_VALIDATORS[field];
        const result = validator(''); // Will trigger required validation
        errors[field] = result.message;
      }
    });
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: Object.freeze(errors)
  };
};

/**
 * Quick validation for single field
 */
export const validateField = (
  fieldName: keyof UserValidationData, 
  value: string
): ValidationResult => {
  const validator = FIELD_VALIDATORS[fieldName];
  return validator ? validator(value) : { isValid: true, message: '' };
};