/*
 * AI-HEADER
 * Intent: Utility functions for payroll upload validation and retry logic
 * Domain Meaning: Common validation rules and network resilience patterns
 * Misleading Names: None
 * Data Contracts: Works with File objects and API responses
 * PII: None - validation logic only
 * Invariants: Validation rules must match backend expectations
 * RAG Keywords: payroll, upload, validation, retry, network, error
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-upload-utility-functions
 */

// File validation function
export const validatePayrollFile = (file: File): string | null => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  
  if (!allowedTypes.includes(file.type)) {
    return '지원하지 않는 파일 형식입니다. Excel 파일만 업로드 가능합니다.';
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return '파일 크기가 너무 큽니다. 최대 10MB까지 업로드 가능합니다.';
  }
  
  return null;
};

// Enhanced error handling with retry logic
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} failed:`, err);
      
      if (attempt === maxRetries) {
        // On final failure, provide user-friendly error message
        if (err.response?.status === 413) {
          throw new Error('파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.');
        } else if (err.response?.status === 400) {
          throw new Error(err.response?.data?.error || '파일 형식이 올바르지 않습니다.');
        } else if (err.response?.status >= 500) {
          throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } else if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
          throw new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
        } else {
          throw err;
        }
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw new Error('Operation failed after retries');
};

// Generate idempotency key for confirm operations
export const generateIdempotencyKey = (): string => {
  const timestamp = Date.now();
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const randomString = Array.from(randomBytes, (byte) => 
    byte.toString(16).padStart(2, '0')
  ).join('');
  return `confirm_${timestamp}_${randomString}`;
};

// Format file size for display
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};