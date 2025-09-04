/**
 * Test script to verify the refactored monitoring service
 */

const { MongoClient } = require('mongodb');

async function testMonitoringService() {
  console.log('🧪 Testing refactored monitoring service...\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const DB_NAME = process.env.DB_NAME || 'SM_nomu_test';
    
    console.log('1️⃣ Connecting to MongoDB...');
    client = new MongoClient(MONGO_URL);
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB\n');
    
    // Test loading the monitoring service
    console.log('2️⃣ Loading MonitoringService...');
    const MonitoringService = require('./services/monitoring');
    const monitoringService = new MonitoringService(db);
    console.log('✅ MonitoringService loaded and initialized\n');
    
    // Test backward compatibility
    console.log('3️⃣ Testing backward compatibility...');
    
    // Test logError (original method)
    console.log('  - Testing logError()...');
    const errorId = await monitoringService.logError(
      new Error('Test error'),
      { userId: 'test-user', operation: 'test-operation' }
    );
    console.log(`    ✅ Error logged with ID: ${errorId}`);
    
    // Test logAuditTrail (original method)
    console.log('  - Testing logAuditTrail()...');
    const auditId = await monitoringService.logAuditTrail({
      action: 'test_action',
      category: 'test',
      userId: 'test-user',
      userName: 'Test User',
      targetId: 'test-target',
      metadata: { test: true }
    });
    console.log(`    ✅ Audit trail logged with ID: ${auditId}`);
    
    // Test getSystemHealth (original method)
    console.log('  - Testing getSystemHealth()...');
    const health = await monitoringService.getSystemHealth();
    console.log(`    ✅ System health: ${health.status} (score: ${health.healthScore})`);
    
    // Test getErrorAnalytics (original method)
    console.log('  - Testing getErrorAnalytics()...');
    const analytics = await monitoringService.getErrorAnalytics(1);
    console.log(`    ✅ Error analytics retrieved: ${analytics.summary.totalErrors} errors`);
    
    console.log('\n4️⃣ Testing individual services...');
    
    // Test ErrorLoggingService
    console.log('  - ErrorLoggingService...');
    const errorStats = await monitoringService.errorLogger.getErrorStats(1);
    console.log(`    ✅ Error stats: ${errorStats.length} categories`);
    
    // Test AuditTrailService
    console.log('  - AuditTrailService...');
    const auditTrails = await monitoringService.auditTrail.queryAuditTrails({}, { limit: 5 });
    console.log(`    ✅ Audit trails: ${auditTrails.length} records`);
    
    // Test AlertingService
    console.log('  - AlertingService...');
    const activeAlerts = await monitoringService.alerting.getActiveAlerts();
    console.log(`    ✅ Active alerts: ${activeAlerts.length} alerts`);
    
    // Test AnalyticsService
    console.log('  - AnalyticsService...');
    const alertStats = await monitoringService.analytics.getAlertStats(24);
    console.log(`    ✅ Alert stats retrieved for ${alertStats.timeRange.hours} hours`);
    
    // Test DataRetentionManager
    console.log('  - DataRetentionManager...');
    const retentionStats = await monitoringService.retentionManager.getRetentionStats();
    console.log(`    ✅ Retention stats: ${retentionStats.totalDocuments} total documents`);
    
    console.log('\n5️⃣ Testing collections...');
    
    // Verify collections exist
    const collections = ['error_logs', 'monitoring_data', 'alert_history'];
    for (const collectionName of collections) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`  - ${collectionName}: ${count} documents`);
    }
    
    console.log('\n✅ All tests passed! The refactored monitoring service is working correctly.');
    
    // Clean up test data
    console.log('\n6️⃣ Cleaning up test data...');
    await db.collection('error_logs').deleteMany({ 'context.operation': 'test-operation' });
    await db.collection('monitoring_data').deleteMany({ action: 'test_action' });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 MongoDB connection closed');
    }
  }
}

// Run the test
console.log('=' . repeat(60));
console.log('MONITORING SERVICE REFACTORING TEST');
console.log('=' . repeat(60) + '\n');

testMonitoringService().then(() => {
  console.log('\n' + '=' . repeat(60));
  console.log('TEST COMPLETED SUCCESSFULLY');
  console.log('=' . repeat(60));
  process.exit(0);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});