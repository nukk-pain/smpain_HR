/*
 * AI-HEADER
 * Intent: Feature flag system for controlled feature rollout
 * Domain Meaning: Controls feature availability based on configuration
 * Misleading Names: None
 * Data Contracts: Feature flag names and configuration format
 * PII: No PII data - configuration only
 * Invariants: Flags must be toggleable without code deployment
 * RAG Keywords: feature flags, feature toggles, rollout control, A/B testing
 */

const crypto = require('crypto');

/**
 * Feature Flag System
 * DomainMeaning: Manages feature availability and gradual rollouts
 * MisleadingNames: None
 * SideEffects: None - pure configuration
 * Invariants: Flag states must be consistent across requests
 * RAG_Keywords: feature flag management, controlled rollout, user targeting
 * DuplicatePolicy: canonical - primary feature flag implementation
 * FunctionIdentity: hash_feature_flags_001
 */
class FeatureFlags {
  constructor() {
    // Define all available feature flags
    this.flags = {
      PREVIEW_UPLOAD: {
        name: 'Excel Preview Upload',
        description: 'Two-step Excel upload with preview',
        default: false,
        envVar: 'FEATURE_PREVIEW_UPLOAD',
        groupsEnvVar: 'FEATURE_PREVIEW_UPLOAD_GROUPS',
        percentageEnvVar: 'FEATURE_PREVIEW_UPLOAD_PERCENTAGE'
      },
      LEGACY_UPLOAD: {
        name: 'Legacy Upload Support',
        description: 'Maintain backward compatibility with old upload',
        default: true,
        envVar: 'FEATURE_LEGACY_UPLOAD',
        groupsEnvVar: 'FEATURE_LEGACY_UPLOAD_GROUPS',
        percentageEnvVar: 'FEATURE_LEGACY_UPLOAD_PERCENTAGE'
      },
      BULK_OPERATIONS: {
        name: 'Bulk Operations',
        description: 'Enable bulk user and data operations',
        default: false,
        envVar: 'FEATURE_BULK_OPERATIONS',
        groupsEnvVar: 'FEATURE_BULK_OPERATIONS_GROUPS',
        percentageEnvVar: 'FEATURE_BULK_OPERATIONS_PERCENTAGE'
      },
      MODULAR_ERROR_SERVICE: {
        name: 'Modular Error Logging Service',
        description: 'Use refactored modular error logging service instead of monolithic one',
        default: false,
        envVar: 'USE_MODULAR_ERROR_SERVICE',
        groupsEnvVar: 'MODULAR_ERROR_SERVICE_GROUPS',
        percentageEnvVar: 'MODULAR_ROLLOUT_PCT'
      }
    };

    // Runtime overrides (for testing and dynamic updates)
    this.overrides = {};
  }

  /**
   * Check if a feature is enabled globally
   * DomainMeaning: Global feature availability check
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns boolean consistently
   * RAG_Keywords: feature enabled, flag check, global toggle
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_enabled_002
   */
  isEnabled(flagName) {
    // Check runtime override first
    if (this.overrides.hasOwnProperty(flagName)) {
      return this.overrides[flagName];
    }

    const flag = this.flags[flagName];
    if (!flag) {
      return false;
    }

    // Check environment variable
    const envValue = process.env[flag.envVar];
    if (envValue !== undefined) {
      return envValue === 'true';
    }

    // Return default value
    return flag.default;
  }

  /**
   * Check if a feature is enabled for a specific user
   * DomainMeaning: User-specific feature availability with targeting
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Same user always gets same result
   * RAG_Keywords: user targeting, percentage rollout, group-based flags
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_enabled_for_user_003
   */
  isEnabledForUser(flagName, user) {
    const flag = this.flags[flagName];
    if (!flag) {
      return false;
    }

    // Admins always have access to features for testing
    if (user.role === 'Admin') {
      return true;
    }

    // First check if globally enabled
    if (this.isEnabled(flagName)) {
      return true;
    }

    // Check group-based targeting
    const groups = process.env[flag.groupsEnvVar];
    if (groups) {
      const allowedGroups = groups.split(',').map(g => g.trim());
      if (allowedGroups.includes(user.role)) {
        return true;
      }
    }

    // Check percentage-based rollout
    const percentage = process.env[flag.percentageEnvVar];
    if (percentage) {
      const percentValue = parseInt(percentage, 10);
      if (!isNaN(percentValue)) {
        return this.isInPercentage(user.id || user.username, percentValue);
      }
    }

    // Fall back to global flag
    return this.isEnabled(flagName);
  }

  /**
   * Determine if user is in percentage rollout
   * DomainMeaning: Consistent hash-based percentage calculation
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Same user ID always produces same result
   * RAG_Keywords: percentage rollout, consistent hashing, gradual rollout
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_is_in_percentage_004
   */
  isInPercentage(userId, percentage) {
    // Use consistent hashing to ensure same user always gets same result
    const hash = crypto.createHash('md5').update(userId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const userPercentage = (hashValue % 100) + 1;
    return userPercentage <= percentage;
  }

  /**
   * Get all available feature flags
   * DomainMeaning: List all defined feature flags
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns array of flag names
   * RAG_Keywords: list flags, available features, flag inventory
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_all_flags_005
   */
  getAllFlags() {
    return Object.keys(this.flags);
  }

  /**
   * Set a flag value at runtime
   * DomainMeaning: Runtime flag override for testing
   * MisleadingNames: None
   * SideEffects: Modifies override state
   * Invariants: Override persists until cleared
   * RAG_Keywords: runtime override, flag toggle, dynamic configuration
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_set_flag_006
   */
  setFlag(flagName, value) {
    this.overrides[flagName] = value;
  }

  /**
   * Clear runtime overrides
   * DomainMeaning: Reset to environment-based configuration
   * MisleadingNames: None
   * SideEffects: Clears all overrides
   * Invariants: Returns to default behavior
   * RAG_Keywords: clear overrides, reset flags, restore defaults
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_clear_overrides_007
   */
  clearOverrides() {
    this.overrides = {};
  }

  /**
   * Get flag configuration details
   * DomainMeaning: Retrieve full flag configuration
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns flag object or null
   * RAG_Keywords: flag details, configuration info, flag metadata
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_flag_config_008
   */
  getFlagConfig(flagName) {
    return this.flags[flagName] || null;
  }

  /**
   * Express middleware for feature flags
   * DomainMeaning: Inject feature flags into request context
   * MisleadingNames: None
   * SideEffects: Modifies request object
   * Invariants: Adds featureFlags to req
   * RAG_Keywords: express middleware, request context, flag injection
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_middleware_009
   */
  middleware() {
    return (req, res, next) => {
      req.featureFlags = this;
      req.isFeatureEnabled = (flagName) => {
        if (req.user) {
          return this.isEnabledForUser(flagName, req.user);
        }
        return this.isEnabled(flagName);
      };
      next();
    };
  }
}

// Export singleton instance
module.exports = new FeatureFlags();