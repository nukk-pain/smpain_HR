/*
 * AI-HEADER
 * Intent: API endpoints for feature flag management and rollback control
 * Domain Meaning: Administrative interface for feature flag operations
 * Misleading Names: None
 * Data Contracts: API request/response formats for flag management
 * PII: No PII data - administrative operations only
 * Invariants: Must authenticate admin users, must validate operations
 * RAG Keywords: feature flag API, rollback endpoints, admin management
 */

const express = require('express');
const router = express.Router();
const featureFlags = require('../config/featureFlags');
const healthMonitor = require('../services/FeatureFlagHealthMonitor');
const FeatureFlagRollback = require('../services/featureFlagRollback');
const { requireAuth, requirePermission, requireAdmin } = require('../middleware/permissions');

// Initialize rollback service
const rollbackService = new FeatureFlagRollback();

/**
 * Middleware to ensure only admins can manage feature flags
 * DomainMeaning: Restrict feature flag management to administrators
 * MisleadingNames: None
 * SideEffects: May reject request with 403
 * Invariants: Must verify admin role
 * RAG_Keywords: admin authorization, role check, access control
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_admin_only_001
 */
const adminOnly = [requireAuth, requirePermission('admin:manage')];

/**
 * GET /api/feature-flags
 * DomainMeaning: List all feature flags and their current status
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns all flags
 * RAG_Keywords: list flags, get status, feature inventory
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_flags_002
 */
router.get('/', adminOnly, (req, res) => {
  try {
    const flags = {};
    
    for (const flagName of featureFlags.getAllFlags()) {
      const config = featureFlags.getFlagConfig(flagName);
      flags[flagName] = {
        name: config.name,
        description: config.description,
        enabled: featureFlags.isEnabled(flagName),
        enabledForUser: featureFlags.isEnabledForUser(flagName, req.user),
        config: {
          default: config.default,
          envVar: config.envVar,
          currentEnvValue: process.env[config.envVar] || null
        }
      };
    }
    
    res.json({
      success: true,
      flags,
      totalFlags: Object.keys(flags).length
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags'
    });
  }
});

/**
 * GET /api/feature-flags/health
 * DomainMeaning: Get health status of all feature flags
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns current health metrics
 * RAG_Keywords: health status, metrics report, monitoring data
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_health_003
 */
router.get('/health', adminOnly, (req, res) => {
  try {
    const healthStatus = healthMonitor.getHealthStatus();
    
    res.json({
      success: true,
      ...healthStatus
    });
  } catch (error) {
    console.error('Error fetching health status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch health status'
    });
  }
});

/**
 * POST /api/feature-flags/:flagName/toggle
 * DomainMeaning: Toggle a feature flag on or off
 * MisleadingNames: None
 * SideEffects: Changes feature flag state
 * Invariants: Must validate flag exists
 * RAG_Keywords: toggle flag, enable disable, switch feature
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_toggle_flag_004
 */
router.post('/:flagName/toggle', adminOnly, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { enabled } = req.body;
    
    if (!featureFlags.getFlagConfig(flagName)) {
      return res.status(404).json({
        success: false,
        error: `Feature flag ${flagName} not found`
      });
    }
    
    // Save state before change
    const stateId = rollbackService.saveState(`Manual toggle of ${flagName} by ${req.user.username}`);
    
    // Toggle the flag
    featureFlags.setFlag(flagName, enabled);
    
    // Reset health metrics when manually toggled
    healthMonitor.healthMetrics.set(flagName, healthMonitor.createMetricEntry());
    
    res.json({
      success: true,
      message: `Feature ${flagName} ${enabled ? 'enabled' : 'disabled'}`,
      flagName,
      enabled,
      stateId
    });
  } catch (error) {
    console.error('Error toggling feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle feature flag'
    });
  }
});

/**
 * POST /api/feature-flags/:flagName/rollback
 * DomainMeaning: Manually trigger rollback for a feature
 * MisleadingNames: None
 * SideEffects: Disables feature and records rollback
 * Invariants: Must validate flag exists
 * RAG_Keywords: manual rollback, force disable, admin rollback
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_manual_rollback_005
 */
router.post('/:flagName/rollback', adminOnly, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { reason } = req.body;
    
    if (!featureFlags.getFlagConfig(flagName)) {
      return res.status(404).json({
        success: false,
        error: `Feature flag ${flagName} not found`
      });
    }
    
    const result = await healthMonitor.manualRollback(
      flagName, 
      reason || `Manual rollback by ${req.user.username}`
    );
    
    res.json({
      success: true,
      message: `Feature ${flagName} rolled back`,
      ...result
    });
  } catch (error) {
    console.error('Error rolling back feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollback feature flag'
    });
  }
});

/**
 * POST /api/feature-flags/:flagName/restore
 * DomainMeaning: Restore a rolled back feature
 * MisleadingNames: None
 * SideEffects: Re-enables feature after rollback
 * Invariants: Must check cooldown period
 * RAG_Keywords: restore feature, re-enable, recovery
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_restore_feature_006
 */
router.post('/:flagName/restore', adminOnly, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { force } = req.body;
    
    if (!featureFlags.getFlagConfig(flagName)) {
      return res.status(404).json({
        success: false,
        error: `Feature flag ${flagName} not found`
      });
    }
    
    const result = await healthMonitor.restoreFeature(flagName, force);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error restoring feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore feature flag'
    });
  }
});

/**
 * GET /api/feature-flags/rollback-history
 * DomainMeaning: Get rollback history for all features
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns historical data
 * RAG_Keywords: rollback history, audit log, event history
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_rollback_history_007
 */
router.get('/rollback-history', adminOnly, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const history = {
      stateHistory: rollbackService.getHistory().slice(-limit),
      rollbackEvents: healthMonitor.rollbackHistory.slice(-limit)
    };
    
    res.json({
      success: true,
      history,
      totalStates: rollbackService.getHistory().length,
      totalRollbacks: healthMonitor.rollbackHistory.length
    });
  } catch (error) {
    console.error('Error fetching rollback history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rollback history'
    });
  }
});

/**
 * POST /api/feature-flags/rollback-to-state/:stateId
 * DomainMeaning: Rollback to a specific saved state
 * MisleadingNames: None
 * SideEffects: Restores all flags to saved state
 * Invariants: Must validate state exists
 * RAG_Keywords: state rollback, restore snapshot, historical state
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_rollback_to_state_008
 */
router.post('/rollback-to-state/:stateId', adminOnly, (req, res) => {
  try {
    const { stateId } = req.params;
    
    const result = rollbackService.rollback(stateId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Reset health metrics after state rollback
    for (const flagName of featureFlags.getAllFlags()) {
      healthMonitor.healthMetrics.set(flagName, healthMonitor.createMetricEntry());
    }
    
    res.json({
      success: true,
      message: 'Successfully rolled back to saved state',
      ...result
    });
  } catch (error) {
    console.error('Error rolling back to state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollback to state'
    });
  }
});

/**
 * POST /api/feature-flags/save-state
 * DomainMeaning: Save current feature flag state
 * MisleadingNames: None
 * SideEffects: Creates new state snapshot
 * Invariants: Must capture all flags
 * RAG_Keywords: save state, create snapshot, backup flags
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_save_state_009
 */
router.post('/save-state', adminOnly, (req, res) => {
  try {
    const { description } = req.body;
    
    const stateId = rollbackService.saveState(
      description || `Manual save by ${req.user.username}`
    );
    
    res.json({
      success: true,
      message: 'Feature flag state saved',
      stateId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save state'
    });
  }
});

/**
 * POST /api/feature-flags/:flagName/record-usage
 * DomainMeaning: Record feature usage for health monitoring
 * MisleadingNames: None
 * SideEffects: Updates health metrics
 * Invariants: Must record all usage
 * RAG_Keywords: usage tracking, health recording, metric update
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_record_usage_010
 */
router.post('/:flagName/record-usage', requireAuth, async (req, res) => {
  try {
    const { flagName } = req.params;
    const { success = true, errorDetails } = req.body;
    
    await healthMonitor.recordUsage(flagName, success, errorDetails);
    
    res.json({
      success: true,
      message: 'Usage recorded'
    });
  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record usage'
    });
  }
});

/**
 * GET /api/feature-flags/states
 * DomainMeaning: List all saved states
 * MisleadingNames: None
 * SideEffects: None
 * Invariants: Returns all states
 * RAG_Keywords: list states, saved snapshots, state inventory
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_get_states_011
 */
router.get('/states', adminOnly, (req, res) => {
  try {
    const states = rollbackService.getHistory();
    
    res.json({
      success: true,
      states,
      total: states.length
    });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch states'
    });
  }
});

/**
 * POST /api/feature-flags/cleanup-states
 * DomainMeaning: Remove old saved states
 * MisleadingNames: None
 * SideEffects: Deletes old states
 * Invariants: Must keep minimum number
 * RAG_Keywords: cleanup states, remove old, maintenance
 * DuplicatePolicy: canonical
 * FunctionIdentity: hash_cleanup_states_012
 */
router.post('/cleanup-states', adminOnly, (req, res) => {
  try {
    const { keepCount = 10 } = req.body;
    
    const removedCount = rollbackService.cleanupOldStates(keepCount);
    
    res.json({
      success: true,
      message: `Cleaned up ${removedCount || 0} old states`,
      remainingStates: rollbackService.getHistory().length
    });
  } catch (error) {
    console.error('Error cleaning up states:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup states'
    });
  }
});

module.exports = router;