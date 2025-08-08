// Common API response type definitions

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: Record<string, any>;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: any;
  code?: string;
  statusCode?: number;
}

/**
 * Combined API response type
 */
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Paginated response metadata
 */
export interface PaginationMeta {
  total: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedApiResponse<T = any> {
  success: true;
  data: T[];
  meta: PaginationMeta & Record<string, any>;
  message?: string;
}

/**
 * Filter metadata for list responses
 */
export interface FilterMeta {
  appliedFilters: Record<string, any>;
  availableFilters?: Record<string, any[]>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * List response with filters
 */
export interface FilteredListResponse<T = any> {
  success: true;
  data: T[];
  meta: {
    total: number;
    filter: FilterMeta;
  };
  message?: string;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  total: number;
  successful: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Bulk operation response
 */
export interface BulkOperationResponse {
  success: boolean;
  data: BulkOperationResult;
  message: string;
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation error response
 */
export interface ValidationErrorResponse {
  success: false;
  error: string;
  details: ValidationError[];
  statusCode: 400;
}

/**
 * Authentication error response
 */
export interface AuthErrorResponse {
  success: false;
  error: string;
  statusCode: 401;
  code: 'UNAUTHORIZED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID';
}

/**
 * Authorization error response
 */
export interface AuthorizationErrorResponse {
  success: false;
  error: string;
  statusCode: 403;
  code: 'FORBIDDEN' | 'INSUFFICIENT_PERMISSIONS';
  requiredPermission?: string;
}

/**
 * Not found error response
 */
export interface NotFoundErrorResponse {
  success: false;
  error: string;
  statusCode: 404;
  code: 'NOT_FOUND';
  resource?: string;
  id?: string;
}

/**
 * Server error response
 */
export interface ServerErrorResponse {
  success: false;
  error: string;
  statusCode: 500;
  code: 'INTERNAL_SERVER_ERROR';
  details?: any;
}

/**
 * Rate limit error response
 */
export interface RateLimitErrorResponse {
  success: false;
  error: string;
  statusCode: 429;
  code: 'RATE_LIMIT_EXCEEDED';
  retryAfter?: number;
}

/**
 * HTTP status codes
 */
export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  NoContent = 204,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  MethodNotAllowed = 405,
  Conflict = 409,
  UnprocessableEntity = 422,
  TooManyRequests = 429,
  InternalServerError = 500,
  NotImplemented = 501,
  BadGateway = 502,
  ServiceUnavailable = 503
}

/**
 * API request context
 */
export interface ApiRequestContext {
  requestId: string;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  body?: any;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  success: true;
  data: {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    version?: string;
    environment?: string;
    database?: {
      status: 'connected' | 'disconnected';
      responseTime?: number;
    };
    memory?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
}