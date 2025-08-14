/*
 * AI-HEADER
 * Intent: Rollback mechanism for feature flag changes with state management
 * Domain Meaning: Safely revert feature flag configurations when issues are detected
 * Misleading Names: None
 * Data Contracts: Feature flag state snapshots and rollback history
 * PII: No PII data - feature configuration only
 * Invariants: Rollback must completely restore previous flag state
 * RAG Keywords: feature flag rollback, state management, recovery mechanism
 */

const crypto = require('crypto');
const featureFlags = require('../config/featureFlags');

/**
 * Feature Flag Rollback Manager
 * DomainMeaning: Manages feature flag state snapshots and rollback operations
 * MisleadingNames: None
 * SideEffects: Modifies feature flag state during rollback
 * Invariants: State snapshots must be immutable once created
 * RAG_Keywords: rollback manager, feature flag state, snapshot management
 * DuplicatePolicy: canonical - primary feature flag rollback
 * FunctionIdentity: hash_feature_flag_rollback_001
 */
class FeatureFlagRollback {
  constructor() {
    this.stateHistory = [];
    this.scheduledRollbacks = new Map();
    this.maxHistorySize = 50;
  }

  /**
   * Save current feature flag state
   * DomainMeaning: Creates immutable snapshot of current flag configuration
   * MisleadingNames: None
   * SideEffects: Adds entry to state history
   * Invariants: Snapshot must capture all flag states
   * RAG_Keywords: save state, snapshot creation, flag backup
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_save_state_002
   */
  saveState(description = '') {
    const stateId = this.generateStateId();
    const timestamp = new Date();
    
    // Capture current state of all flags
    const allFlags = featureFlags.getAllFlags();
    const flagStates = {};
    
    allFlags.forEach(flagName => {
      flagStates[flagName] = {
        enabled: featureFlags.isEnabled(flagName),
        config: featureFlags.getFlagConfig(flagName)
      };
    });
    
    // Also capture environment variables
    const envSnapshot = {};
    allFlags.forEach(flagName => {
      const config = featureFlags.getFlagConfig(flagName);
      if (config) {
        envSnapshot[config.envVar] = process.env[config.envVar];
        envSnapshot[config.groupsEnvVar] = process.env[config.groupsEnvVar];
        envSnapshot[config.percentageEnvVar] = process.env[config.percentageEnvVar];
      }
    });
    
    const stateSnapshot = {
      id: stateId,
      description,
      timestamp,
      flags: flagStates,
      environment: envSnapshot,
      metadata: {
        totalFlags: allFlags.length,
        enabledCount: Object.values(flagStates).filter(f => f.enabled).length,
        disabledCount: Object.values(flagStates).filter(f => !f.enabled).length
      }
    };
    
    this.stateHistory.push(stateSnapshot);
    
    // Trim history if it exceeds max size
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
    
    console.log(`📸 Feature flag state saved: ${stateId} - ${description}`);
    return stateId;
  }

  /**
   * Rollback to a previous state
   * DomainMeaning: Restores feature flags to a previously saved state
   * MisleadingNames: None
   * SideEffects: Modifies all feature flag states
   * Invariants: Must restore exact state from snapshot
   * RAG_Keywords: rollback execution, state restoration, flag recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_rollback_003
   */
  rollback(stateId) {
    const snapshot = this.stateHistory.find(s => s.id === stateId);
    
    if (!snapshot) {
      console.error(`❌ State not found: ${stateId}`);
      return {
        success: false,
        error: `State not found: ${stateId}`
      };
    }
    
    try {
      console.log(`🔄 Rolling back to state: ${stateId} - ${snapshot.description}`);
      
      // Clear all current overrides
      featureFlags.clearOverrides();
      
      // Restore environment variables
      Object.keys(snapshot.environment).forEach(key => {
        if (snapshot.environment[key] !== undefined) {
          process.env[key] = snapshot.environment[key];
        } else {
          delete process.env[key];
        }
      });
      
      // Restore flag states
      Object.keys(snapshot.flags).forEach(flagName => {
        const flagState = snapshot.flags[flagName];
        featureFlags.setFlag(flagName, flagState.enabled);
      });
      
      console.log(`✅ Successfully rolled back to state: ${stateId}`);
      
      return {
        success: true,
        stateId,
        description: snapshot.description,
        timestamp: snapshot.timestamp,
        restoredFlags: Object.keys(snapshot.flags).length
      };
      
    } catch (error) {
      console.error(`❌ Rollback failed for state ${stateId}:`, error);
      return {
        success: false,
        error: error.message,
        stateId
      };
    }
  }

  /**
   * Execute operation with automatic rollback on failure
   * DomainMeaning: Runs operation and automatically rolls back if it fails
   * MisleadingNames: None
   * SideEffects: May trigger rollback on operation failure
   * Invariants: Must rollback on any exception
   * RAG_Keywords: automatic rollback, failsafe execution, error recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_execute_with_rollback_004
   */
  async executeWithRollback(stateId, operation) {
    try {
      console.log(`🚀 Executing operation with rollback protection...`);
      const result = await operation();
      
      return {
        success: true,
        result,
        rolledBack: false
      };
      
    } catch (error) {
      console.error(`❌ Operation failed, triggering rollback:`, error.message);
      
      const rollbackResult = this.rollback(stateId);
      
      return {
        success: false,
        error: error.message,
        rolledBack: rollbackResult.success,
        rollbackDetails: rollbackResult
      };
    }
  }

  /**
   * Rollback with validation
   * DomainMeaning: Performs rollback and validates the restored state
   * MisleadingNames: None
   * SideEffects: Modifies feature flags and runs validation
   * Invariants: Must validate state after restoration
   * RAG_Keywords: validated rollback, state verification, safe recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_rollback_with_validation_005
   */
  rollbackWithValidation(stateId, validator) {
    const rollbackResult = this.rollback(stateId);
    
    if (!rollbackResult.success) {
      return {
        ...rollbackResult,
        validationPassed: false,
        validationError: 'Rollback failed'
      };
    }
    
    // Run validation on restored state
    const validationResult = validator();
    
    if (!validationResult.valid) {
      console.warn(`⚠️ Validation failed after rollback: ${validationResult.reason}`);
      
      // Try to find a safe state
      const safeState = this.findSafeState(validator);
      if (safeState) {
        console.log(`🔄 Rolling back to safe state: ${safeState.id}`);
        return this.rollback(safeState.id);
      }
    }
    
    return {
      ...rollbackResult,
      validationPassed: validationResult.valid,
      validationDetails: validationResult
    };
  }

  /**
   * Find a safe state based on validator
   * DomainMeaning: Searches history for a state that passes validation
   * MisleadingNames: None
   * SideEffects: Temporarily modifies flags during search
   * Invariants: Must restore original state if no safe state found
   * RAG_Keywords: safe state search, validation scan, fallback state
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_find_safe_state_006
   */
  findSafeState(validator) {
    // Save current state to restore if needed
    const currentStateId = this.saveState('Temporary for safe state search');
    
    // Search history from newest to oldest
    for (let i = this.stateHistory.length - 2; i >= 0; i--) {
      const state = this.stateHistory[i];
      
      // Try this state
      this.rollback(state.id);
      const validation = validator();
      
      if (validation.valid) {
        // Found a safe state, restore current and return safe state
        this.rollback(currentStateId);
        // Remove temporary state
        this.stateHistory = this.stateHistory.filter(s => s.id !== currentStateId);
        return state;
      }
    }
    
    // No safe state found, restore current
    this.rollback(currentStateId);
    // Remove temporary state
    this.stateHistory = this.stateHistory.filter(s => s.id !== currentStateId);
    return null;
  }

  /**
   * Schedule a rollback to occur after a delay
   * DomainMeaning: Sets up automatic rollback after specified time
   * MisleadingNames: None
   * SideEffects: Creates timer that will modify flags
   * Invariants: Must execute rollback after delay
   * RAG_Keywords: scheduled rollback, delayed recovery, timed reversion
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_schedule_rollback_007
   */
  scheduleRollback(stateId, delayMs, callback) {
    const rollbackId = this.generateStateId();
    
    console.log(`⏰ Scheduling rollback to ${stateId} in ${delayMs}ms`);
    
    const timeoutId = setTimeout(() => {
      const result = this.rollback(stateId);
      
      this.scheduledRollbacks.delete(rollbackId);
      
      if (callback) {
        callback(result);
      }
    }, delayMs);
    
    this.scheduledRollbacks.set(rollbackId, {
      stateId,
      timeoutId,
      scheduledAt: new Date(),
      executeAt: new Date(Date.now() + delayMs)
    });
    
    return rollbackId;
  }

  /**
   * Clear all scheduled rollbacks
   * DomainMeaning: Cancels all pending rollback operations
   * MisleadingNames: None
   * SideEffects: Clears all timers
   * Invariants: Must cancel all scheduled operations
   * RAG_Keywords: cancel rollback, clear schedule, abort recovery
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_clear_scheduled_008
   */
  clearScheduledRollbacks() {
    this.scheduledRollbacks.forEach((rollback, id) => {
      clearTimeout(rollback.timeoutId);
      console.log(`🚫 Cancelled scheduled rollback: ${id}`);
    });
    
    this.scheduledRollbacks.clear();
  }

  /**
   * Get rollback history
   * DomainMeaning: Returns list of all saved states
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns immutable history
   * RAG_Keywords: get history, state list, snapshot inventory
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_history_009
   */
  getHistory() {
    return [...this.stateHistory];
  }

  /**
   * Clean up old states
   * DomainMeaning: Removes old snapshots keeping only recent ones
   * MisleadingNames: None
   * SideEffects: Removes entries from history
   * Invariants: Must keep at least specified number of states
   * RAG_Keywords: cleanup history, remove old states, trim snapshots
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_cleanup_old_states_010
   */
  cleanupOldStates(keepCount) {
    if (this.stateHistory.length <= keepCount) {
      return;
    }
    
    const removeCount = this.stateHistory.length - keepCount;
    const removed = this.stateHistory.splice(0, removeCount);
    
    console.log(`🧹 Removed ${removed.length} old states from history`);
    return removed.length;
  }

  /**
   * Generate unique state ID
   * DomainMeaning: Creates unique identifier for state snapshots
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must generate unique IDs
   * RAG_Keywords: generate id, unique identifier, state id
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_generate_state_id_011
   */
  generateStateId() {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Get state by ID
   * DomainMeaning: Retrieves specific state snapshot
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Returns immutable snapshot
   * RAG_Keywords: get state, retrieve snapshot, find by id
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_get_state_012
   */
  getState(stateId) {
    return this.stateHistory.find(s => s.id === stateId);
  }

  /**
   * Compare two states
   * DomainMeaning: Identifies differences between two state snapshots
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must identify all differences
   * RAG_Keywords: compare states, diff snapshots, state changes
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_compare_states_013
   */
  compareStates(stateId1, stateId2) {
    const state1 = this.getState(stateId1);
    const state2 = this.getState(stateId2);
    
    if (!state1 || !state2) {
      return null;
    }
    
    const differences = {
      flagChanges: [],
      envChanges: []
    };
    
    // Compare flags
    Object.keys(state1.flags).forEach(flagName => {
      const flag1 = state1.flags[flagName];
      const flag2 = state2.flags[flagName];
      
      if (flag1.enabled !== flag2.enabled) {
        differences.flagChanges.push({
          flag: flagName,
          before: flag1.enabled,
          after: flag2.enabled
        });
      }
    });
    
    // Compare environment
    Object.keys(state1.environment).forEach(key => {
      if (state1.environment[key] !== state2.environment[key]) {
        differences.envChanges.push({
          variable: key,
          before: state1.environment[key],
          after: state2.environment[key]
        });
      }
    });
    
    return differences;
  }
}

module.exports = FeatureFlagRollback;