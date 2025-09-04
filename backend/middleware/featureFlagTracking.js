/*
 * AI-HEADER
 * Intent: Middleware to track feature flag usage and errors for health monitoring
 * Domain Meaning: Intercepts feature flag usage and reports metrics
 * Misleading Names: None
 * Data Contracts: Request/response tracking for feature-flagged endpoints
 * PII: No PII data - operational metrics only
 * Invariants: Must not modify request/response, only observe
 * RAG Keywords: feature flag tracking, usage metrics, error tracking middleware
 */

const healthMonitor = require('../services/FeatureFlagHealthMonitor');

/**
 * Create middleware to track feature flag usage
 * DomainMeaning: Wraps endpoints to track success/failure for feature flags
 * MisleadingNames: None
 * SideEffects: Records metrics to health monitor
 * Invariants: Must not alter request/response flow
 * RAG_Keywords: usage tracking, metric recording, middleware wrapper
 * DuplicatePolicy: canonical - primary tracking middleware
 * FunctionIdentity: hash_track_feature_flag_001
 */
function trackFeatureFlag(flagName) {
  return async (req, res, next) => {
    // Skip if feature is not enabled for this user
    if (!req.isFeatureEnabled || !req.isFeatureEnabled(flagName)) {
      return next();
    }
    
    // Store original methods
    const originalJson = res.json;
    const originalStatus = res.status;
    const originalSend = res.send;
    
    let statusCode = 200;
    let errorOccurred = false;
    let errorDetails = null;
    
    // Override status to capture status code
    res.status = function(code) {
      statusCode = code;
      if (code >= 400) {
        errorOccurred = true;
      }
      return originalStatus.call(this, code);
    };
    
    // Override json to capture response
    res.json = function(data) {
      // Check if response indicates an error
      if (statusCode >= 400 || (data && data.error) || (data && data.success === false)) {
        errorOccurred = true;
        errorDetails = {
          statusCode,
          message: data?.error || data?.message || 'Unknown error',
          endpoint: req.path,
          method: req.method
        };
      }
      
      // Record usage
      healthMonitor.recordUsage(flagName, !errorOccurred, errorDetails).catch(err => {
        console.error('Failed to record feature flag usage:', err);
      });
      
      return originalJson.call(this, data);
    };
    
    // Override send for non-JSON responses
    res.send = function(data) {
      if (statusCode >= 400) {
        errorOccurred = true;
        errorDetails = {
          statusCode,
          message: 'Non-JSON error response',
          endpoint: req.path,
          method: req.method
        };
      }
      
      // Record usage
      healthMonitor.recordUsage(flagName, !errorOccurred, errorDetails).catch(err => {
        console.error('Failed to record feature flag usage:', err);
      });
      
      return originalSend.call(this, data);
    };
    
    // Handle errors passed to next()
    const originalNext = next;
    next = function(err) {
      if (err) {
        errorOccurred = true;
        errorDetails = {
          statusCode: err.statusCode || 500,
          message: err.message || 'Internal server error',
          endpoint: req.path,
          method: req.method,
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        };
        
        // Record usage
        healthMonitor.recordUsage(flagName, false, errorDetails).catch(recordErr => {
          console.error('Failed to record feature flag error:', recordErr);
        });
      }
      
      return originalNext(err);
    };
    
    // Continue with request
    next();
  };
}

/**
 * Conditionally apply middleware based on feature flag
 * DomainMeaning: Apply middleware only when feature is enabled
 * MisleadingNames: None
 * SideEffects: May skip middleware based on flag
 * Invariants: Must check flag for each request
 * RAG_Keywords: conditional middleware, feature gating, dynamic routing
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_conditional_middleware_002
 */
function conditionalMiddleware(flagName, middleware) {
  return (req, res, next) => {
    // Check if feature is enabled for this request
    if (req.isFeatureEnabled && req.isFeatureEnabled(flagName)) {
      // Apply the middleware
      return middleware(req, res, next);
    }
    
    // Skip middleware if feature is disabled
    next();
  };
}

/**
 * Apply feature flag to entire router
 * DomainMeaning: Gate entire route group behind feature flag
 * MisleadingNames: None
 * SideEffects: May return 404 if feature disabled
 * Invariants: Must check flag before routing
 * RAG_Keywords: route gating, feature router, conditional routes
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_feature_router_003
 */
function featureRouter(flagName, router) {
  return (req, res, next) => {
    // Check if feature is enabled
    if (req.isFeatureEnabled && req.isFeatureEnabled(flagName)) {
      // Use the router
      return router(req, res, next);
    }
    
    // Feature is disabled, return 404 or 403
    res.status(404).json({
      error: 'Feature not available',
      message: `The requested feature "${flagName}" is not currently available`
    });
  };
}

/**
 * Record feature flag decision
 * DomainMeaning: Log when feature flag affects request flow
 * MisleadingNames: None
 * SideEffects: Logs to console
 * Invariants: Must not throw errors
 * RAG_Keywords: decision logging, flag evaluation, audit trail
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_record_decision_004
 */
function recordFeatureFlagDecision(flagName, enabled, userId) {
  try {
    console.log(`📊 Feature flag decision: ${flagName} = ${enabled} for user ${userId || 'anonymous'}`);
    
    // In production, this could send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Analytics.track('feature_flag_evaluated', {
      //   flagName,
      //   enabled,
      //   userId,
      //   timestamp: new Date().toISOString()
      // });
    }
  } catch (error) {
    console.error('Failed to record feature flag decision:', error);
  }
}

module.exports = {
  trackFeatureFlag,
  conditionalMiddleware,
  featureRouter,
  recordFeatureFlagDecision
};