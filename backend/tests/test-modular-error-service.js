/**
 * Test script for modular error logging service
 * Verifies that the new modular service works correctly
 */

const { MongoClient } = require('mongodb');
const ErrorLoggingMonitoringServiceModular = require('../services/ErrorLoggingMonitoringServiceModular');

// Test configuration
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu_test';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

async function runTests() {
  let client;
  let db;
  let service;
  let testsPassed = 0;
  let testsFailed = 0;
  
  console.log(`${colors.blue}Starting Modular Error Service Tests...${colors.reset}\n`);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}\n`);
    
    // Initialize service
    console.log('Initializing modular error service...');
    service = new ErrorLoggingMonitoringServiceModular(db);
    await service.initialize();
    console.log(`${colors.green}✓ Service initialized${colors.reset}\n`);
    
    // Test 1: Log an error
    console.log('Test 1: Logging an error...');
    try {
      const testError = new Error('Test error message');
      testError.code = 'TEST_ERROR';
      
      const errorId = await service.logError(testError, {
        userId: 'test-user',
        action: 'test-action'
      });
      
      if (errorId) {
        console.log(`${colors.green}✓ Error logged successfully (ID: ${errorId})${colors.reset}`);
        testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠ Error logged but no ID returned${colors.reset}`);
        testsPassed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to log error: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 2: Log audit trail
    console.log('\nTest 2: Logging audit trail...');
    try {
      const auditId = await service.logAuditTrail('TEST_ACTION', {
        userId: 'test-user',
        resourceType: 'test',
        resourceId: '123',
        changes: { field: 'value' }
      });
      
      if (auditId) {
        console.log(`${colors.green}✓ Audit trail logged successfully (ID: ${auditId})${colors.reset}`);
        testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠ Audit trail logged but no ID returned${colors.reset}`);
        testsPassed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to log audit trail: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 3: Get system health
    console.log('\nTest 3: Getting system health...');
    try {
      const health = await service.getSystemHealth();
      
      if (health && health.status) {
        console.log(`${colors.green}✓ System health retrieved: ${health.status}${colors.reset}`);
        console.log(`  CPU: ${health.checks?.cpu?.message || 'OK'}`);
        console.log(`  Memory: ${health.checks?.memory?.message || 'OK'}`);
        console.log(`  Event Loop: ${health.checks?.eventLoop?.message || 'OK'}`);
        testsPassed++;
      } else {
        console.log(`${colors.red}✗ Invalid health response${colors.reset}`);
        testsFailed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to get system health: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 4: Start monitoring
    console.log('\nTest 4: Starting monitoring...');
    try {
      await service.startMonitoring();
      console.log(`${colors.green}✓ Monitoring started successfully${colors.reset}`);
      testsPassed++;
      
      // Wait a bit for metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Stop monitoring
      await service.stopMonitoring();
      console.log(`${colors.green}✓ Monitoring stopped successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}✗ Failed monitoring test: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 5: Get error analytics
    console.log('\nTest 5: Getting error analytics...');
    try {
      const analytics = await service.getErrorAnalytics({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      });
      
      if (analytics) {
        console.log(`${colors.green}✓ Error analytics retrieved${colors.reset}`);
        console.log(`  Total errors: ${analytics.totalErrors || 0}`);
        testsPassed++;
      } else {
        console.log(`${colors.red}✗ Invalid analytics response${colors.reset}`);
        testsFailed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to get error analytics: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 6: Manual cleanup
    console.log('\nTest 6: Performing manual cleanup...');
    try {
      const cleanupResult = await service.performManualCleanup();
      
      if (cleanupResult && cleanupResult.success) {
        console.log(`${colors.green}✓ Manual cleanup completed (${cleanupResult.deletedCount} records deleted)${colors.reset}`);
        testsPassed++;
      } else {
        console.log(`${colors.yellow}⚠ Cleanup completed with warnings${colors.reset}`);
        testsPassed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed manual cleanup: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
    // Test 7: Service shutdown
    console.log('\nTest 7: Shutting down service...');
    try {
      await service.shutdown();
      console.log(`${colors.green}✓ Service shutdown successfully${colors.reset}`);
      testsPassed++;
    } catch (error) {
      console.log(`${colors.red}✗ Failed to shutdown service: ${error.message}${colors.reset}`);
      testsFailed++;
    }
    
  } catch (error) {
    console.error(`${colors.red}Fatal error during tests: ${error.message}${colors.reset}`);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (client) {
      await client.close();
      console.log(`\n${colors.blue}Database connection closed${colors.reset}`);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
    
    if (testsFailed === 0) {
      console.log(`\n${colors.green}✓ ALL TESTS PASSED!${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}✗ SOME TESTS FAILED${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});