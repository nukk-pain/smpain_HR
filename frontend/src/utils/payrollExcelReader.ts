/**
 * Utility functions for reading and validating Excel files for payroll upload
 */

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
}

/**
 * Validates that a file is an Excel file with proper extension and size
 */
export const validateExcelFile = (file: File): FileValidationResult => {
  // Check file type
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/xlsx',
    'application/xls'
  ];

  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['xlsx', 'xls'];

  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
    return {
      isValid: false,
      error: 'Excel 파일만 업로드 가능합니다 (.xlsx, .xls)'
    };
  }

  // Check file size (10MB limit)
  const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSizeInBytes) {
    return {
      isValid: false,
      error: '파일 크기는 10MB를 초과할 수 없습니다'
    };
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: '파일이 비어있습니다'
    };
  }

  return {
    isValid: true,
    file
  };
};

/**
 * Reads file as base64 for uploading
 */
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        // Remove data URL prefix if present
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      } else {
        reject(new Error('Failed to read file as base64'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('파일 읽기 실패'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Creates form data for file upload
 */
export const createFileFormData = (file: File, additionalData?: Record<string, any>): FormData => {
  const formData = new FormData();
  formData.append('file', file);
  
  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
    });
  }
  
  return formData;
};

/**
 * Formats file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};