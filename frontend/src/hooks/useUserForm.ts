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
// Removed unused imports

// Base user data interface (compatible with existing User type)
export interface UserData {
  _id?: string;
  id?: number | string;  // Keep for backward compatibility
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
  visibleTeams?: { departmentId: string; departmentName: string }[];
  [key: string]: any;
}

// Form data interface with all fields required
export interface UserFormData {
  username: string;
  password: string;
  name: string;
  role: string;
  hireDate: string;
  department: string;
  position: string;
  employeeId: string;
  accountNumber: string;
  supervisorId: string;
  contractType: string;
  baseSalary: number;
  incentiveFormula: string;
  birthDate: string;
  phoneNumber: string;
  visibleTeams: { departmentId: string; departmentName: string }[];
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
  role: { type: 'select', defaultValue: 'user' },
  hireDate: { type: 'date', defaultValue: '' },
  department: { type: 'string', defaultValue: '' },
  position: { type: 'string', defaultValue: '' },
  employeeId: { type: 'string', defaultValue: '', validate: false },
  accountNumber: { type: 'string', defaultValue: '' },
  supervisorId: { type: 'string', defaultValue: '' },
  contractType: { type: 'select', defaultValue: 'fulltime' },
  baseSalary: { type: 'number', defaultValue: 0 },
  incentiveFormula: { type: 'string', defaultValue: '' },
  birthDate: { type: 'date', defaultValue: '' },
  phoneNumber: { type: 'string', defaultValue: '' },
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
        (formData as any)[fieldKey] = Array.isArray(userValue) ? userValue : [];
      } else {
        (formData as any)[fieldKey] = userValue;
      }
    } else {
      (formData as any)[fieldKey] = config.defaultValue;
    }
  });

  // Email field removed from UserFormData interface

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
  const isEdit = useMemo(() => !!(initialUser?._id || initialUser?.id), [initialUser]);

  // Options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    onSubmit,
    onError,
    onSuccess
  } = options;

  // Update form data when initialUser changes (for edit mode)
  useEffect(() => {
    if (initialUser) {
      console.log('Updating form data for user edit:', initialUser);
      const newFormData = getInitialFormData(initialUser);
      setFormDataState(newFormData);
      setErrors({});
      setIsDirty(false);
      setTouchedFields(new Set());
    }
  }, [initialUser]);

  // 편집 모드에서 초기 로드 시 비밀번호 검증 오류 제거
  useEffect(() => {
    if (isEdit) {
      console.log('Edit mode detected - clearing password validation errors');
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password;
        return newErrors;
      });
    }
  }, [isEdit]);

  /**
   * Validate a single field
   */
  const validateSingleField = useCallback((field: keyof UserFormData): boolean => {
    const fieldConfig = FIELD_CONFIGS[field];
    if (!fieldConfig.validate) return true;

    // 편집 모드에서 비밀번호가 비어있으면 검증하지 않음
    if (field === 'password' && isEdit && !formData.password) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
      return true;
    }

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
  }, [formData, isEdit]);

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
      // 편집 모드에서 비밀번호가 비어있으면 검증하지 않음
      if (field === 'password' && isEdit && !convertedValue) {
        // 비밀번호 필드의 오류 제거
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.password;
          return newErrors;
        });
      } else {
        // Use setTimeout to validate with the updated value
        setTimeout(() => validateSingleField(field), 0);
      }
    }
  }, [validateOnChange, validateSingleField, isEdit]);

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
    // 편집 모드에서는 비밀번호가 입력된 경우만 검증
    const validationData: UserValidationData = {
      username: formData.username,
      password: isEdit && !formData.password ? '' : formData.password, // 편집 모드에서 빈 비밀번호는 검증하지 않음
      name: formData.name,
      phoneNumber: formData.phoneNumber
    };

    const validationOptions: ValidationOptions = { 
      isEdit,
      skipPasswordValidation: isEdit && !formData.password // 편집 모드에서 비밀번호가 비어있으면 검증 스킵
    };
    const result = validateUserForm(validationData, validationOptions);
    
    setErrors(result.errors);
    
    // Debug: Log validation errors to console
    if (!result.isValid) {
      console.log('Form validation errors:', result.errors);
      console.log('Form data:', formData);
      console.log('Validation options:', validationOptions);
    } else {
      console.log('Form validation passed:', { isEdit, hasPassword: !!formData.password });
    }
    
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
    console.log('handleSubmit called');
    console.log('Current form data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed, aborting submit');
      return;
    }

    console.log('Form validation passed, submitting...');
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
    const hasValidationErrors = Object.keys(errors).length > 0;
    
    if (hasValidationErrors) {
      console.log('Form invalid due to errors:', errors);
      return false;
    }
    
    // 편집 모드와 생성 모드 구분된 검증
    if (isEdit) {
      // 편집 모드: 오류가 없고 기본 필드들이 채워져 있으면 유효
      // 비밀번호는 선택사항이므로 검증하지 않음
      const requiredFieldsForEdit: (keyof UserValidationData)[] = 
        ['username', 'name'];
      
      const isValidForEdit = requiredFieldsForEdit.every(field => {
        const value = formData[field];
        return value && value.toString().trim() !== '';
      });
      
      console.log('Edit mode validation:', {
        hasValidationErrors,
        requiredFieldsForEdit,
        fieldValues: requiredFieldsForEdit.map(field => ({ [field]: formData[field] })),
        isValidForEdit
      });
      
      return isValidForEdit;
    } else {
      // 생성 모드: 필수 필드 모두 채워져야 함 (비밀번호 포함)
      const requiredFields: (keyof UserValidationData)[] = 
        ['username', 'password', 'name'];
      
      const isValidResult = requiredFields.every(field => {
        const value = formData[field];
        return value && value.toString().trim() !== '';
      });
      
      console.log('Create mode validation:', {
        requiredFields,
        fieldValues: requiredFields.map(field => ({ [field]: formData[field] })),
        isValidResult
      });
      
      return isValidResult;
    }
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