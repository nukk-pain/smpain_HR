/**
 * Performance comparison test for monitoring services
 * Compares original vs modular implementation performance
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

// Performance test configuration
const TEST_ITERATIONS = 100;
const CONCURRENT_OPERATIONS = 10;

async function measurePerformance(service, serviceName, operations) {
  const results = {
    serviceName,
    totalTime: 0,
    operations: {}
  };

  console.log(`\n📊 Testing ${serviceName}...`);
  
  for (const [opName, operation] of Object.entries(operations)) {
    const times = [];
    
    // Warm-up
    await operation(service);
    
    // Measure
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      const start = process.hrtime.bigint();
      await operation(service);
      const end = process.hrtime.bigint();
      times.push(Number(end - start) / 1e6); // Convert to milliseconds
    }
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const p95 = times[Math.floor(times.length * 0.95)];
    const p99 = times[Math.floor(times.length * 0.99)];
    
    results.operations[opName] = {
      avg: avg.toFixed(3),
      median: median.toFixed(3),
      p95: p95.toFixed(3),
      p99: p99.toFixed(3),
      min: times[0].toFixed(3),
      max: times[times.length - 1].toFixed(3)
    };
    
    results.totalTime += avg * TEST_ITERATIONS;
    
    console.log(`  ✅ ${opName}: avg=${avg.toFixed(3)}ms, p95=${p95.toFixed(3)}ms`);
  }
  
  return results;
}

async function runPerformanceTests() {
  let client;
  
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'SM_nomu');
    
    // Define test operations
    const testOperations = {
      'Log Error': async (service) => {
        await service.logError(new Error(`Test error ${Date.now()}`), {
          userId: 'perf-test',
          action: 'performance-test',
          severity: ['info', 'warning', 'error'][Math.floor(Math.random() * 3)]
        });
      },
      
      'Log Audit': async (service) => {
        await service.logAuditTrail('PERF_TEST', {
          userId: 'perf-test',
          resourceType: 'test',
          resourceId: `test-${Date.now()}`
        });
      },
      
      'Get Health': async (service) => {
        await service.getSystemHealth();
      },
      
      'Get Analytics': async (service) => {
        await service.getErrorAnalytics({ 
          startDate: new Date(Date.now() - 3600000),
          endDate: new Date()
        });
      }
    };
    
    // Test concurrent operations
    const concurrentTest = {
      'Concurrent Errors': async (service) => {
        const promises = [];
        for (let i = 0; i < CONCURRENT_OPERATIONS; i++) {
          promises.push(
            service.logError(new Error(`Concurrent ${i}`), { 
              userId: 'concurrent-test' 
            })
          );
        }
        await Promise.all(promises);
      }
    };
    
    console.log('====================================');
    console.log('    MONITORING SERVICE PERFORMANCE');
    console.log('====================================');
    console.log(`Iterations: ${TEST_ITERATIONS}`);
    console.log(`Concurrent ops: ${CONCURRENT_OPERATIONS}`);
    
    // Test original service
    const OriginalService = require('../services/ErrorLoggingMonitoringService');
    const originalService = new OriginalService(db);
    const originalResults = await measurePerformance(
      originalService, 
      'Original Service',
      testOperations
    );
    
    // Test modular service  
    const ModularService = require('../services/ErrorLoggingMonitoringServiceModular');
    const modularService = new ModularService(db);
    await modularService.initialize();
    const modularResults = await measurePerformance(
      modularService,
      'Modular Service',
      testOperations
    );
    
    // Test unified service
    const UnifiedService = require('../services/monitoring');
    const unifiedService = new UnifiedService(db);
    const unifiedResults = await measurePerformance(
      unifiedService,
      'Unified Service', 
      testOperations
    );
    
    // Shutdown modular service properly
    await modularService.shutdown();
    
    // Print comparison
    console.log('\n====================================');
    console.log('         PERFORMANCE SUMMARY');
    console.log('====================================\n');
    
    // Create comparison table
    const operations = Object.keys(testOperations);
    
    console.log('Average Response Times (ms):');
    console.log('Operation            | Original | Modular | Unified | Winner');
    console.log('---------------------|----------|---------|---------|--------');
    
    for (const op of operations) {
      const orig = parseFloat(originalResults.operations[op].avg);
      const mod = parseFloat(modularResults.operations[op].avg);
      const uni = parseFloat(unifiedResults.operations[op].avg);
      
      const fastest = Math.min(orig, mod, uni);
      let winner = '';
      if (orig === fastest) winner = 'Original';
      else if (mod === fastest) winner = 'Modular';
      else winner = 'Unified';
      
      console.log(
        `${op.padEnd(20)} | ${orig.toFixed(3).padStart(8)} | ${mod.toFixed(3).padStart(7)} | ${uni.toFixed(3).padStart(7)} | ${winner}`
      );
    }
    
    // Calculate performance improvement/degradation
    console.log('\n📈 Performance Analysis:');
    
    let totalOriginal = 0;
    let totalModular = 0;
    let totalUnified = 0;
    
    for (const op of operations) {
      totalOriginal += parseFloat(originalResults.operations[op].avg);
      totalModular += parseFloat(modularResults.operations[op].avg);
      totalUnified += parseFloat(unifiedResults.operations[op].avg);
    }
    
    const modularImprovement = ((totalOriginal - totalModular) / totalOriginal * 100);
    const unifiedImprovement = ((totalOriginal - totalUnified) / totalOriginal * 100);
    
    console.log(`\nModular vs Original: ${modularImprovement > 0 ? '✅' : '❌'} ${Math.abs(modularImprovement).toFixed(2)}% ${modularImprovement > 0 ? 'faster' : 'slower'}`);
    console.log(`Unified vs Original: ${unifiedImprovement > 0 ? '✅' : '❌'} ${Math.abs(unifiedImprovement).toFixed(2)}% ${unifiedImprovement > 0 ? 'faster' : 'slower'}`);
    
    // Memory usage comparison (if we can measure it)
    console.log('\n💾 Memory Usage:');
    const memUsage = process.memoryUsage();
    console.log(`  Heap Used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n✅ Performance testing completed successfully!');
    
    // Return results for further analysis
    return {
      original: originalResults,
      modular: modularResults,
      unified: unifiedResults,
      analysis: {
        modularImprovement,
        unifiedImprovement,
        recommendation: modularImprovement > -5 ? 'safe to deploy' : 'needs optimization'
      }
    };
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run the tests
runPerformanceTests().then(results => {
  console.log('\n📋 Final Recommendation:');
  if (results.analysis.modularImprovement > -5) {
    console.log('✅ Modular service is ready for production!');
    console.log('   Performance is within acceptable range.');
  } else {
    console.log('⚠️ Modular service needs optimization.');
    console.log('   Performance degradation exceeds 5% threshold.');
  }
  process.exit(0);
});