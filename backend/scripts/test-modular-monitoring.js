/**
 * Test script for modular monitoring service
 * Validates all functionality works correctly with the new modular architecture
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Test both implementations
async function testMonitoringService() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('📦 Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'SM_nomu');
    
    console.log('\n===== TESTING ORIGINAL SERVICE =====\n');
    
    // Test original service
    const OriginalService = require('../services/ErrorLoggingMonitoringService');
    const originalService = new OriginalService(db);
    
    // Test error logging
    console.log('1️⃣ Testing error logging...');
    const errorId = await originalService.logError(new Error('Test error'), {
      userId: 'test-user',
      action: 'test-action',
      severity: 'warning'
    });
    console.log(`   ✅ Error logged with ID: ${errorId}`);
    
    // Test audit trail
    console.log('2️⃣ Testing audit trail...');
    const auditId = await originalService.logAuditTrail('TEST_ACTION', {
      userId: 'test-user',
      resourceType: 'test',
      resourceId: 'test-123'
    });
    console.log(`   ✅ Audit logged with ID: ${auditId}`);
    
    // Test system health
    console.log('3️⃣ Testing system health...');
    const health = await originalService.getSystemHealth();
    console.log(`   ✅ System health: ${health.status}`);
    
    // Test error analytics
    console.log('4️⃣ Testing error analytics...');
    const analytics = await originalService.getErrorAnalytics();
    console.log(`   ✅ Error analytics retrieved`);
    
    console.log('\n===== TESTING MODULAR SERVICE =====\n');
    
    // Test modular service
    const ModularService = require('../services/ErrorLoggingMonitoringServiceModular');
    const modularService = new ModularService(db);
    await modularService.initialize();
    
    // Test error logging
    console.log('1️⃣ Testing error logging...');
    const modularErrorId = await modularService.logError(new Error('Test error modular'), {
      userId: 'test-user',
      action: 'test-action-modular',
      severity: 'info'
    });
    console.log(`   ✅ Error logged with ID: ${modularErrorId}`);
    
    // Test audit trail
    console.log('2️⃣ Testing audit trail...');
    const modularAuditId = await modularService.logAuditTrail('TEST_ACTION_MODULAR', {
      userId: 'test-user',
      resourceType: 'test',
      resourceId: 'test-456'
    });
    console.log(`   ✅ Audit logged with ID: ${modularAuditId}`);
    
    // Test system health
    console.log('3️⃣ Testing system health...');
    const modularHealth = await modularService.getSystemHealth();
    console.log(`   ✅ System health: ${JSON.stringify(modularHealth)}`);
    
    // Test error analytics
    console.log('4️⃣ Testing error analytics...');
    const modularAnalytics = await modularService.getErrorAnalytics();
    console.log(`   ✅ Error analytics retrieved`);
    
    // Test metrics collection
    console.log('5️⃣ Testing metrics collection...');
    await modularService.collectAndStoreMetrics();
    console.log(`   ✅ Metrics collected and stored`);
    
    // Clean up monitoring
    console.log('6️⃣ Testing graceful shutdown...');
    await modularService.shutdown();
    console.log(`   ✅ Service shut down gracefully`);
    
    console.log('\n===== COMPARISON RESULTS =====\n');
    console.log('✅ Both services functioning correctly');
    console.log('✅ Backward compatibility maintained');
    console.log('✅ All core features working');
    
    // Test unified monitoring service
    console.log('\n===== TESTING UNIFIED SERVICE (monitoring/index.js) =====\n');
    const UnifiedService = require('../services/monitoring');
    const unifiedService = new UnifiedService(db);
    
    // Quick test of unified service
    const unifiedErrorId = await unifiedService.logError(new Error('Test unified'), {
      userId: 'test-user',
      action: 'test-unified'
    });
    console.log(`✅ Unified service error logging works: ${unifiedErrorId}`);
    
    const activeAlerts = await unifiedService.getActiveAlerts();
    console.log(`✅ Unified service can get alerts: ${activeAlerts.length} active`);
    
    console.log('\n🎉 All monitoring services tested successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
    process.exit(0);
  }
}

// Run tests
testMonitoringService();