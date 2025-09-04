/*
 * AI-HEADER
 * Intent: Middleware for conditional route availability based on feature flags
 * Domain Meaning: Controls route accessibility based on feature configuration
 * Misleading Names: None
 * Data Contracts: Express middleware contract, feature flag configuration
 * PII: No PII data - route control only
 * Invariants: Routes must be consistently available/unavailable based on flags
 * RAG Keywords: conditional routes, feature flag middleware, dynamic endpoints
 */

const featureFlags = require('../config/featureFlags');

/**
 * Route configuration with feature flag mappings
 * DomainMeaning: Maps routes to their controlling feature flags
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Route config must be consistent
 * RAG_Keywords: route configuration, feature mapping, endpoint control
 * DuplicatePolicy: canonical - primary route configuration
 * FunctionIdentity: hash_route_config_001
 */
const routeFeatureConfig = {
  '/api/payroll/excel/preview': {
    featureFlag: 'PREVIEW_UPLOAD',
    methods: ['POST'],
    fallbackMessage: 'Preview feature coming soon. Please use the legacy upload endpoint.'
  },
  '/api/payroll/excel/confirm': {
    featureFlag: 'PREVIEW_UPLOAD',
    methods: ['POST'],
    fallbackMessage: 'Preview feature coming soon. Please use the legacy upload endpoint.'
  },
  '/api/payroll/upload-excel': {
    featureFlag: 'LEGACY_UPLOAD',
    methods: ['POST'],
    fallbackMessage: 'Legacy upload has been disabled. Please use the new preview endpoint.'
  },
  '/api/payroll/status': {
    featureFlag: 'LEGACY_UPLOAD',
    methods: ['GET'],
    fallbackMessage: 'Legacy status endpoint has been disabled.'
  },
  '/api/users/bulk-create': {
    featureFlag: 'BULK_OPERATIONS',
    methods: ['POST'],
    fallbackMessage: 'Bulk operations are not currently available.'
  },
  '/api/users/import': {
    featureFlag: 'BULK_OPERATIONS',
    methods: ['POST'],
    fallbackMessage: 'Import operations are not currently available.'
  }
};

/**
 * Conditional Routes Middleware
 * DomainMeaning: Blocks or allows routes based on feature flags
 * MisleadingNames: None
 * SideEffects: May block request processing
 * Invariants: Must check flags before allowing route access
 * RAG_Keywords: route middleware, feature flag check, conditional access
 * DuplicatePolicy: canonical - primary conditional middleware
 * FunctionIdentity: hash_conditional_middleware_002
 */
function conditionalRoutesMiddleware() {
  return (req, res, next) => {
    // Check if this route has feature flag configuration
    const routeConfig = routeFeatureConfig[req.path];
    
    // If no config, allow the route (not feature-flagged)
    if (!routeConfig) {
      return next();
    }
    
    // Check if the method is controlled
    if (!routeConfig.methods.includes(req.method)) {
      return next();
    }
    
    // Check if feature is enabled
    const isEnabled = req.isFeatureEnabled 
      ? req.isFeatureEnabled(routeConfig.featureFlag)
      : featureFlags.isEnabled(routeConfig.featureFlag);
    
    if (!isEnabled) {
      // Feature is disabled, block the route
      return res.status(404).json({
        success: false,
        error: 'Feature not available',
        message: routeConfig.fallbackMessage,
        featureFlag: routeConfig.featureFlag
      });
    }
    
    // Feature is enabled, allow the route
    next();
  };
}

/**
 * Get route configuration
 * DomainMeaning: Returns the route-to-feature mapping configuration
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns configuration object
 * RAG_Keywords: get route config, feature mapping, configuration access
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_route_config_003
 */
conditionalRoutesMiddleware.getRouteConfig = function() {
  return routeFeatureConfig;
};

/**
 * Add or update route configuration
 * DomainMeaning: Dynamically configure feature-flagged routes
 * MisleadingNames: None
 * SideEffects: Modifies route configuration
 * Invariants: Route config must have required fields
 * RAG_Keywords: configure route, add feature flag, dynamic configuration
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_configure_route_004
 */
conditionalRoutesMiddleware.configureRoute = function(path, config) {
  if (!config.featureFlag || !config.methods) {
    throw new Error('Route configuration must have featureFlag and methods');
  }
  
  routeFeatureConfig[path] = {
    featureFlag: config.featureFlag,
    methods: config.methods,
    fallbackMessage: config.fallbackMessage || 'This feature is not currently available.'
  };
};

/**
 * Remove route configuration
 * DomainMeaning: Remove feature flag control from a route
 * MisleadingNames: None
 * SideEffects: Modifies route configuration
 * Invariants: Route becomes always accessible after removal
 * RAG_Keywords: remove route config, disable feature flag, unrestrict route
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_remove_route_config_005
 */
conditionalRoutesMiddleware.removeRouteConfig = function(path) {
  delete routeFeatureConfig[path];
};

/**
 * Check if route is feature-flagged
 * DomainMeaning: Determines if a route is controlled by feature flags
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns boolean
 * RAG_Keywords: check route flag, is feature controlled, route status
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_is_route_flagged_006
 */
conditionalRoutesMiddleware.isRouteFlagged = function(path) {
  return routeFeatureConfig.hasOwnProperty(path);
};

/**
 * Get all feature-flagged routes
 * DomainMeaning: Returns list of all routes controlled by feature flags
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns array of route paths
 * RAG_Keywords: list flagged routes, get controlled routes, feature route inventory
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_flagged_routes_007
 */
conditionalRoutesMiddleware.getFlaggedRoutes = function() {
  return Object.keys(routeFeatureConfig);
};

/**
 * Get routes by feature flag
 * DomainMeaning: Returns routes controlled by a specific feature flag
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns array of route paths
 * RAG_Keywords: routes by flag, feature flag routes, flag route mapping
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_routes_by_flag_008
 */
conditionalRoutesMiddleware.getRoutesByFlag = function(flagName) {
  return Object.entries(routeFeatureConfig)
    .filter(([path, config]) => config.featureFlag === flagName)
    .map(([path]) => path);
};

module.exports = conditionalRoutesMiddleware;