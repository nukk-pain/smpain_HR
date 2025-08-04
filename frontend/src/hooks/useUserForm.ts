/**
 * User form management hook
 * 
 * Provides comprehensive form state management with validation,
 * dirty tracking, and submission handling for user forms.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { 
  validateUserForm, 
  validateField, 
  UserValidationData,
  ValidationOptions 
} from '../utils/userValidation';
import { USER_ROLES, UserRole } from '../constants/userRoles';
import { INCENTIVE_FORMULAS, IncentiveFormulaType } from '../constants/incentiveFormulas';

// Base user data interface (compatible with existing User type)
export interface UserData {
  id?: number | string;
  username?: string;
  name?: string;
  role?: string;
  employeeId?: string;
  department?: string;
  position?: string;
  baseSalary?: number;
  incentiveFormula?: string;
  hireDate?: string;
  birthDate?: string;
  accountNumber?: string;
  supervisorId?: string;
  contractType?: string;
  phoneNumber?: string;
  visibleTeams?: any[];
  [key: string]: any;
}

// Form data interface with all fields required
export interface UserFormData {
  username: string;
  password: string;
  name: string;
  role: UserRole | string;
  employeeId: string;
  email: string;
  phoneNumber: string;
  department: string;
  position: string;
  baseSalary: number;
  incentiveFormula: IncentiveFormulaType | string;
  hireDate: string;
  birthDate: string;
  accountNumber: string;
  supervisorId: string;
  contractType: string;
  visibleTeams: string[];
}

// Field types for type-safe handling
type FieldType = 'string' | 'number' | 'date' | 'array' | 'select';

// Field configuration
interface FieldConfig {
  type: FieldType;
  defaultValue: any;
  validate?: boolean;
}

// Form field configurations
const FIELD_CONFIGS: Record<keyof UserFormData, FieldConfig> = {
  username: { type: 'string', defaultValue: '', validate: true },
  password: { type: 'string', defaultValue: '', validate: true },
  name: { type: 'string', defaultValue: '', validate: true },
  role: { type: 'select', defaultValue: USER_ROLES.USER },
  employeeId: { type: 'string', defaultValue: '', validate: true },
  email: { type: 'string', defaultValue: '', validate: true },
  phoneNumber: { type: 'string', defaultValue: '', validate: true },
  department: { type: 'string', defaultValue: '' },
  position: { type: 'string', defaultValue: '' },
  baseSalary: { type: 'number', defaultValue: 0 },
  incentiveFormula: { type: 'select', defaultValue: INCENTIVE_FORMULAS.NONE },
  hireDate: { type: 'date', defaultValue: '' },
  birthDate: { type: 'date', defaultValue: '' },
  accountNumber: { type: 'string', defaultValue: '' },
  supervisorId: { type: 'string', defaultValue: '' },
  contractType: { type: 'select', defaultValue: 'regular' },
  visibleTeams: { type: 'array', defaultValue: [] }
};

// Form options
export interface UseUserFormOptions {
  onSubmit?: (data: UserFormData) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

// Hook return interface
export interface UseUserFormReturn {
  readonly formData: UserFormData;
  readonly errors: Readonly<Record<string, string>>;
  readonly isValid: boolean;
  readonly isDirty: boolean;
  readonly isSubmitting: boolean;
  readonly touchedFields: ReadonlySet<string>;
  handleChange: (field: keyof UserFormData, value: any) => void;
  handleBlur: (field: keyof UserFormData) => void;
  validateForm: () => boolean;
  validateField: (field: keyof UserFormData) => boolean;
  handleSubmit: () => Promise<void>;
  resetForm: () => void;
  clearErrors: () => void;
  setFieldError: (field: string, error: string) => void;
  setFormData: (data: Partial<UserFormData>) => void;
}

// Helper to get initial form data
const getInitialFormData = (user?: UserData): UserFormData => {
  const formData = {} as UserFormData;
  
  // Initialize all fields with defaults or user data
  Object.entries(FIELD_CONFIGS).forEach(([field, config]) => {
    const fieldKey = field as keyof UserFormData;
    const userValue = user?.[fieldKey];
    
    if (userValue !== undefined && userValue !== null) {
      // Special handling for arrays
      if (config.type === 'array') {
        formData[fieldKey] = Array.isArray(userValue) ? userValue : [];
      } else {
        formData[fieldKey] = userValue;
      }
    } else {
      formData[fieldKey] = config.defaultValue;
    }
  });

  // Special handling for email which might not be in user data
  if (user && 'email' in user) {
    formData.email = user.email || '';
  }

  // Never populate password from existing user
  formData.password = '';

  return formData;
};

// Convert value based on field type
const convertValue = (value: any, fieldType: FieldType): any => {
  switch (fieldType) {
    case 'number':
      return typeof value === 'string' ? parseInt(value, 10) || 0 : value;
    case 'array':
      return Array.isArray(value) ? value : [];
    default:
      return value;
  }
};

/**
 * Custom hook for user form management
 */
export const useUserForm = (
  initialUser?: UserData,
  options: UseUserFormOptions = {}
): UseUserFormReturn => {
  // Form state
  const [formData, setFormDataState] = useState<UserFormData>(() => 
    getInitialFormData(initialUser)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Refs for stable callbacks
  const initialFormData = useRef(getInitialFormData(initialUser));
  const isEdit = useMemo(() => !!initialUser?.id, [initialUser]);

  // Options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    onError,
    onSuccess
  } = options;

  /**
   * Validate a single field
   */
  const validateSingleField = useCallback((field: keyof UserFormData): boolean => {
    const fieldConfig = FIELD_CONFIGS[field];
    if (!fieldConfig.validate) return true;

    const validationField = field as keyof UserValidationData;
    const result = validateField(validationField, formData[field] as string);
    
    if (result.isValid) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    } else {
      setErrors(prev => ({ ...prev, [field]: result.message }));
      return false;
    }
  }, [formData]);

  /**
   * Handle field value changes
   */
  const handleChange = useCallback((field: keyof UserFormData, value: any) => {
    const fieldConfig = FIELD_CONFIGS[field];
    const convertedValue = convertValue(value, fieldConfig.type);
    
    setFormDataState(prev => ({ ...prev, [field]: convertedValue }));
    setIsDirty(true);

    // Validate on change if enabled
    if (validateOnChange && fieldConfig.validate) {
      // Use setTimeout to validate with the updated value
      setTimeout(() => validateSingleField(field), 0);
    }
  }, [validateOnChange, validateSingleField]);

  /**
   * Handle field blur
   */
  const handleBlur = useCallback((field: keyof UserFormData) => {
    setTouchedFields(prev => new Set(prev).add(field));
    
    if (validateOnBlur && FIELD_CONFIGS[field].validate) {
      validateSingleField(field);
    }
  }, [validateOnBlur, validateSingleField]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    const validationData: UserValidationData = {
      username: formData.username,
      password: formData.password,
      name: formData.name,
      employeeId: formData.employeeId,
      email: formData.email,
      phoneNumber: formData.phoneNumber
    };

    const validationOptions: ValidationOptions = { isEdit };
    const result = validateUserForm(validationData, validationOptions);
    
    setErrors(result.errors);
    
    // Mark all validated fields as touched
    Object.keys(validationData).forEach(field => {
      setTouchedFields(prev => new Set(prev).add(field));
    });
    
    return result.isValid;
  }, [formData, isEdit]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(formData);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Form submission error:', error);
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmit, onSuccess, onError]);

  /**
   * Reset form to initial state
   */
  const resetForm = useCallback(() => {
    const resetData = getInitialFormData(initialUser);
    setFormDataState(resetData);
    setErrors({});
    setIsDirty(false);
    setIsSubmitting(false);
    setTouchedFields(new Set());
    initialFormData.current = resetData;
  }, [initialUser]);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Set error for specific field
   */
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
    setTouchedFields(prev => new Set(prev).add(field));
  }, []);

  /**
   * Set multiple form fields at once
   */
  const setFormData = useCallback((data: Partial<UserFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
    setIsDirty(true);
  }, []);

  // Compute validation state
  const isValid = useMemo(() => {
    // No errors and either dirty or all required fields filled
    if (Object.keys(errors).length > 0) return false;
    
    if (isEdit) {
      // For edit mode, just check no errors
      return true;
    }
    
    // For new user, check required fields
    const requiredFields: (keyof UserValidationData)[] = 
      ['username', 'password', 'name', 'employeeId'];
    
    return requiredFields.every(field => {
      const value = formData[field];
      return value && value.toString().trim() !== '';
    });
  }, [errors, formData, isEdit]);

  return {
    formData: Object.freeze(formData),
    errors: Object.freeze(errors),
    isValid,
    isDirty,
    isSubmitting,
    touchedFields: touchedFields as ReadonlySet<string>,
    handleChange,
    handleBlur,
    validateForm,
    validateField: validateSingleField,
    handleSubmit,
    resetForm,
    clearErrors,
    setFieldError,
    setFormData
  };
};