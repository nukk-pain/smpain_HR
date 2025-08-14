/*
 * AI-HEADER
 * Intent: Adapter pattern for backward compatibility with legacy API
 * Domain Meaning: Translates between old and new API formats
 * Misleading Names: None
 * Data Contracts: Maps legacy request/response to new format
 * PII: May handle PII data in payroll information
 * Invariants: Must maintain exact legacy API behavior
 * RAG Keywords: adapter pattern, backward compatibility, legacy API wrapper
 */

/**
 * Legacy Adapter for Backward Compatibility
 * DomainMeaning: Maintains compatibility with v1.x API while using v2.0 services
 * MisleadingNames: None
 * SideEffects: Logs deprecation warnings
 * Invariants: Legacy behavior must be preserved exactly
 * RAG_Keywords: legacy adapter, API compatibility, version migration
 * DuplicatePolicy: canonical - primary legacy adapter
 * FunctionIdentity: hash_legacy_adapter_001
 */
class LegacyAdapter {
  constructor() {
    // Define legacy endpoint mappings
    this.legacyEndpoints = {
      '/api/payroll/upload-excel': '/api/payroll/excel/preview',
      '/api/payroll/status': '/api/payroll/upload-status',
      '/api/users/bulk-create': '/api/users/import'
    };

    // Track deprecation warnings
    this.deprecationWarnings = new Set();
  }

  /**
   * Adapt legacy upload request to new format
   * DomainMeaning: Transforms v1.x request to v2.0 format
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: All legacy fields must be preserved
   * RAG_Keywords: request adapter, format transformation, legacy mapping
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_adapt_upload_request_002
   */
  adaptUploadRequest(legacyRequest) {
    const adapted = {
      file: legacyRequest.file,
      metadata: {
        period: legacyRequest.body?.period,
        department: legacyRequest.body?.department,
        uploadedBy: legacyRequest.user?.id,
        // Skip preview for legacy endpoints to maintain old behavior
        skipPreview: true,
        isLegacyRequest: true
      }
    };

    // Preserve any additional fields from legacy request
    if (legacyRequest.body) {
      Object.keys(legacyRequest.body).forEach(key => {
        if (!['period', 'department'].includes(key)) {
          adapted.metadata[key] = legacyRequest.body[key];
        }
      });
    }

    return adapted;
  }

  /**
   * Adapt new response to legacy format
   * DomainMeaning: Transforms v2.0 response to v1.x format
   * MisleadingNames: None
   * SideEffects: Logs if data is truncated
   * Invariants: Legacy response structure must be exact
   * RAG_Keywords: response adapter, format conversion, legacy response
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_adapt_upload_response_003
   */
  adaptUploadResponse(newResponse) {
    // Legacy format expected by v1.x clients
    const legacyResponse = {
      success: newResponse.success,
      message: newResponse.success 
        ? 'File uploaded successfully' 
        : 'Upload failed',
      data: newResponse.data
    };

    // Legacy API didn't have preview tokens or summaries
    // Remove new fields that legacy clients don't expect
    delete legacyResponse.previewToken;
    delete legacyResponse.summary;
    delete legacyResponse.errors;
    delete legacyResponse.warnings;

    // If there were errors/warnings, append to message
    if (newResponse.errors && newResponse.errors.length > 0) {
      legacyResponse.message += `. ${newResponse.errors.length} errors found`;
    }

    return legacyResponse;
  }

  /**
   * Adapt error response to legacy format
   * DomainMeaning: Transforms v2.0 error to v1.x error format
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Error format must match v1.x exactly
   * RAG_Keywords: error adapter, legacy error format, error conversion
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_adapt_error_response_004
   */
  adaptErrorResponse(newError) {
    // Legacy error format was simpler
    const legacyError = {
      success: false,
      error: newError.message || newError.error || 'An error occurred'
    };

    // Legacy API didn't expose details field
    // Just return the message as the error

    return legacyError;
  }

  /**
   * Check if endpoint is legacy
   * DomainMeaning: Identifies legacy API endpoints
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns boolean consistently
   * RAG_Keywords: endpoint detection, legacy identification, route checking
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_legacy_endpoint_005
   */
  isLegacyEndpoint(path) {
    return Object.keys(this.legacyEndpoints).includes(path);
  }

  /**
   * Check if legacy mode is enabled
   * DomainMeaning: Determines if system should support legacy APIs
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Defaults to true for compatibility
   * RAG_Keywords: legacy mode, compatibility check, mode detection
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_legacy_mode_enabled_006
   */
  isLegacyModeEnabled() {
    // Default to true for backward compatibility
    const legacyMode = process.env.LEGACY_MODE;
    if (legacyMode === undefined) {
      return true;
    }
    return legacyMode === 'true';
  }

  /**
   * Log deprecation warning
   * DomainMeaning: Tracks and logs API deprecation usage
   * MisleadingNames: None
   * SideEffects: Logs to console, updates warning set
   * Invariants: Each endpoint warned only once per session
   * RAG_Keywords: deprecation warning, usage tracking, migration notice
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_log_deprecation_007
   */
  logDeprecation(endpoint, userId) {
    const warningKey = `${endpoint}-${userId || 'anonymous'}`;
    if (!this.deprecationWarnings.has(warningKey)) {
      console.warn(`[DEPRECATION] Legacy endpoint ${endpoint} used by ${userId || 'anonymous'}. This endpoint will be removed in v3.0`);
      this.deprecationWarnings.add(warningKey);
    }
  }

  /**
   * Express middleware for legacy support
   * DomainMeaning: Intercepts and adapts legacy API requests
   * MisleadingNames: None
   * SideEffects: Modifies request object, logs deprecation
   * Invariants: Must not break new API endpoints
   * RAG_Keywords: express middleware, legacy intercept, request adaptation
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_middleware_008
   */
  middleware() {
    return (req, res, next) => {
      // Check if this is a legacy endpoint
      const isLegacy = this.isLegacyEndpoint(req.path);
      req.isLegacyEndpoint = isLegacy;

      if (isLegacy && this.isLegacyModeEnabled()) {
        // Log deprecation warning
        this.logDeprecation(req.path, req.user?.id);

        // Store original json method if it exists
        const originalJson = res.json ? res.json.bind(res) : null;

        // Override json method to adapt response
        res.json = (data) => {
          let adaptedData = data;
          
          // Adapt response based on endpoint
          if (req.path === '/api/payroll/upload-excel') {
            if (data.success) {
              adaptedData = this.adaptUploadResponse(data);
            } else {
              adaptedData = this.adaptErrorResponse(data);
            }
          }

          return originalJson(adaptedData);
        };

        // Adapt request if needed
        if (req.path === '/api/payroll/upload-excel' && req.method === 'POST') {
          const adapted = this.adaptUploadRequest(req);
          req.adaptedMetadata = adapted.metadata;
        }
      }

      next();
    };
  }

  /**
   * Get mapped endpoint for legacy path
   * DomainMeaning: Returns new endpoint for legacy path
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns null if not legacy
   * RAG_Keywords: endpoint mapping, route translation, path conversion
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_mapped_endpoint_009
   */
  getMappedEndpoint(legacyPath) {
    return this.legacyEndpoints[legacyPath] || null;
  }

  /**
   * Get deprecation statistics
   * DomainMeaning: Returns usage statistics for deprecated endpoints
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns object with usage counts
   * RAG_Keywords: deprecation stats, usage metrics, migration tracking
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_deprecation_stats_010
   */
  getDeprecationStats() {
    const stats = {};
    this.deprecationWarnings.forEach(warning => {
      const [endpoint] = warning.split('-');
      stats[endpoint] = (stats[endpoint] || 0) + 1;
    });
    return stats;
  }
}

module.exports = LegacyAdapter;