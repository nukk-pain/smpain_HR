/*
 * AI-HEADER
 * Intent: Test for feature flag rollback mechanism
 * Domain Meaning: Ensures feature flags can be safely rolled back when issues occur
 * Misleading Names: None
 * Data Contracts: Feature flag rollback configuration and state management
 * PII: No PII data - feature flag configuration only
 * Invariants: Rollback must restore previous feature flag state completely
 * RAG Keywords: feature flag rollback test, flag recovery, state restoration
 */

const FeatureFlagRollback = require('../../services/featureFlagRollback');
const featureFlags = require('../../config/featureFlags');

describe('Feature Flag Rollback Mechanism', () => {
  let rollbackManager;

  beforeEach(() => {
    rollbackManager = new FeatureFlagRollback();
    featureFlags.clearOverrides();
  });

  test('should have rollback manager implementation', () => {
    expect(rollbackManager).toBeDefined();
    expect(rollbackManager.saveState).toBeDefined();
    expect(rollbackManager.rollback).toBeDefined();
    expect(rollbackManager.getHistory).toBeDefined();
  });

  test('should save current feature flag state', () => {
    // Set some flags
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    featureFlags.setFlag('LEGACY_UPLOAD', false);
    
    // Save state
    const stateId = rollbackManager.saveState('Before deployment');
    
    expect(stateId).toBeDefined();
    expect(typeof stateId).toBe('string');
    
    // Verify state was saved
    const history = rollbackManager.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toHaveProperty('id', stateId);
    expect(history[0]).toHaveProperty('description', 'Before deployment');
  });

  test('should rollback to previous state', () => {
    // Initial state
    featureFlags.setFlag('PREVIEW_UPLOAD', false);
    featureFlags.setFlag('LEGACY_UPLOAD', true);
    
    // Save initial state
    const stateId = rollbackManager.saveState('Initial state');
    
    // Change flags
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    featureFlags.setFlag('LEGACY_UPLOAD', false);
    
    // Verify changes
    expect(featureFlags.isEnabled('PREVIEW_UPLOAD')).toBe(true);
    expect(featureFlags.isEnabled('LEGACY_UPLOAD')).toBe(false);
    
    // Rollback
    const result = rollbackManager.rollback(stateId);
    
    expect(result.success).toBe(true);
    expect(featureFlags.isEnabled('PREVIEW_UPLOAD')).toBe(false);
    expect(featureFlags.isEnabled('LEGACY_UPLOAD')).toBe(true);
  });

  test('should support automatic rollback on error', async () => {
    // Save current state
    const stateId = rollbackManager.saveState('Before risky operation');
    
    // Simulate a deployment with error detection
    const deployment = async () => {
      featureFlags.setFlag('PREVIEW_UPLOAD', true);
      
      // Simulate error detection
      throw new Error('High error rate detected');
    };
    
    // Execute with automatic rollback
    const result = await rollbackManager.executeWithRollback(stateId, deployment);
    
    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('High error rate detected');
  });

  test('should maintain rollback history', () => {
    // Create multiple states
    const state1 = rollbackManager.saveState('State 1');
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    
    const state2 = rollbackManager.saveState('State 2');
    featureFlags.setFlag('LEGACY_UPLOAD', false);
    
    const state3 = rollbackManager.saveState('State 3');
    
    // Check history
    const history = rollbackManager.getHistory();
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe(state1);
    expect(history[1].id).toBe(state2);
    expect(history[2].id).toBe(state3);
  });

  test('should support rollback with validation', () => {
    // Save initial state
    const stateId = rollbackManager.saveState('Safe state');
    
    // Change to potentially problematic state
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    featureFlags.setFlag('LEGACY_UPLOAD', false);
    
    // Define validation function
    const validator = () => {
      // Check if both features are disabled (problematic)
      if (!featureFlags.isEnabled('PREVIEW_UPLOAD') && !featureFlags.isEnabled('LEGACY_UPLOAD')) {
        return { valid: false, reason: 'No upload method available' };
      }
      return { valid: true };
    };
    
    // Rollback with validation
    const result = rollbackManager.rollbackWithValidation(stateId, validator);
    
    expect(result.success).toBe(true);
    expect(result.validationPassed).toBe(true);
  });

  test('should handle rollback to non-existent state', () => {
    const result = rollbackManager.rollback('non-existent-id');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('State not found');
  });

  test('should support scheduled rollback', (done) => {
    // Save initial state
    const stateId = rollbackManager.saveState('Initial');
    
    // Change state
    featureFlags.setFlag('PREVIEW_UPLOAD', true);
    
    // Schedule rollback after 100ms
    rollbackManager.scheduleRollback(stateId, 100, (result) => {
      expect(result.success).toBe(true);
      expect(featureFlags.isEnabled('PREVIEW_UPLOAD')).toBe(false);
      done();
    });
  });

  test('should clean up old states', () => {
    // Create multiple states
    for (let i = 0; i < 10; i++) {
      rollbackManager.saveState(`State ${i}`);
    }
    
    expect(rollbackManager.getHistory()).toHaveLength(10);
    
    // Clean up old states (keep last 5)
    rollbackManager.cleanupOldStates(5);
    
    const history = rollbackManager.getHistory();
    expect(history).toHaveLength(5);
    expect(history[0].description).toBe('State 5');
  });

  afterEach(() => {
    // Clear any scheduled rollbacks
    rollbackManager.clearScheduledRollbacks();
  });
});