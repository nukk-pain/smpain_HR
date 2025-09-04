/**
 * Comparison test between original and modular error logging services
 * Measures performance and functionality differences
 */

const { MongoClient } = require('mongodb');
const OriginalService = require('../services/monitoring');
const ModularService = require('../services/ErrorLoggingMonitoringServiceModular');

// Test configuration
const MONGO_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'SM_nomu_test';
const NUM_ITERATIONS = 100;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

async function measurePerformance(service, testName, operation) {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  await operation();
  
  const endTime = process.hrtime.bigint();
  const endMemory = process.memoryUsage();
  
  return {
    name: testName,
    duration: Number(endTime - startTime) / 1000000, // Convert to milliseconds
    memoryDelta: {
      heapUsed: (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024, // Convert to MB
      rss: (endMemory.rss - startMemory.rss) / 1024 / 1024
    }
  };
}

async function runComparisonTests() {
  let client;
  let db;
  let originalService;
  let modularService;
  
  console.log(`${colors.blue}Starting Service Comparison Tests...${colors.reset}\n`);
  
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGO_URL);
    await client.connect();
    db = client.db(DB_NAME);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}\n`);
    
    // Initialize services
    console.log('Initializing services...');
    originalService = new OriginalService(db);
    modularService = new ModularService(db);
    
    await originalService.initialize();
    console.log(`${colors.green}✓ Original service initialized${colors.reset}`);
    
    await modularService.initialize();
    console.log(`${colors.green}✓ Modular service initialized${colors.reset}\n`);
    
    // Performance comparison results
    const results = {
      original: [],
      modular: []
    };
    
    // Test 1: Error logging performance
    console.log(`${colors.magenta}Test 1: Error Logging Performance (${NUM_ITERATIONS} iterations)${colors.reset}`);
    
    // Original service
    const originalErrorTest = await measurePerformance(
      originalService,
      'Error Logging',
      async () => {
        for (let i = 0; i < NUM_ITERATIONS; i++) {
          const error = new Error(`Test error ${i}`);
          await originalService.logError(error, { iteration: i });
        }
      }
    );
    results.original.push(originalErrorTest);
    console.log(`  Original: ${originalErrorTest.duration.toFixed(2)}ms`);
    
    // Modular service
    const modularErrorTest = await measurePerformance(
      modularService,
      'Error Logging',
      async () => {
        for (let i = 0; i < NUM_ITERATIONS; i++) {
          const error = new Error(`Test error ${i}`);
          await modularService.logError(error, { iteration: i });
        }
      }
    );
    results.modular.push(modularErrorTest);
    console.log(`  Modular:  ${modularErrorTest.duration.toFixed(2)}ms`);
    
    const errorSpeedup = ((originalErrorTest.duration - modularErrorTest.duration) / originalErrorTest.duration * 100).toFixed(1);
    if (errorSpeedup > 0) {
      console.log(`  ${colors.green}✓ Modular is ${errorSpeedup}% faster${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original is ${Math.abs(errorSpeedup)}% faster${colors.reset}\n`);
    }
    
    // Test 2: System health check performance
    console.log(`${colors.magenta}Test 2: System Health Check Performance${colors.reset}`);
    
    // Original service
    const originalHealthTest = await measurePerformance(
      originalService,
      'System Health',
      async () => {
        for (let i = 0; i < 10; i++) {
          await originalService.getSystemHealth();
        }
      }
    );
    results.original.push(originalHealthTest);
    console.log(`  Original: ${originalHealthTest.duration.toFixed(2)}ms`);
    
    // Modular service
    const modularHealthTest = await measurePerformance(
      modularService,
      'System Health',
      async () => {
        for (let i = 0; i < 10; i++) {
          await modularService.getSystemHealth();
        }
      }
    );
    results.modular.push(modularHealthTest);
    console.log(`  Modular:  ${modularHealthTest.duration.toFixed(2)}ms`);
    
    const healthSpeedup = ((originalHealthTest.duration - modularHealthTest.duration) / originalHealthTest.duration * 100).toFixed(1);
    if (healthSpeedup > 0) {
      console.log(`  ${colors.green}✓ Modular is ${healthSpeedup}% faster${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original is ${Math.abs(healthSpeedup)}% faster${colors.reset}\n`);
    }
    
    // Test 3: Analytics query performance
    console.log(`${colors.magenta}Test 3: Analytics Query Performance${colors.reset}`);
    
    const analyticsOptions = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    };
    
    // Original service
    const originalAnalyticsTest = await measurePerformance(
      originalService,
      'Analytics',
      async () => {
        await originalService.getErrorAnalytics(analyticsOptions);
      }
    );
    results.original.push(originalAnalyticsTest);
    console.log(`  Original: ${originalAnalyticsTest.duration.toFixed(2)}ms`);
    
    // Modular service
    const modularAnalyticsTest = await measurePerformance(
      modularService,
      'Analytics',
      async () => {
        await modularService.getErrorAnalytics(analyticsOptions);
      }
    );
    results.modular.push(modularAnalyticsTest);
    console.log(`  Modular:  ${modularAnalyticsTest.duration.toFixed(2)}ms`);
    
    const analyticsSpeedup = ((originalAnalyticsTest.duration - modularAnalyticsTest.duration) / originalAnalyticsTest.duration * 100).toFixed(1);
    if (analyticsSpeedup > 0) {
      console.log(`  ${colors.green}✓ Modular is ${analyticsSpeedup}% faster${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original is ${Math.abs(analyticsSpeedup)}% faster${colors.reset}\n`);
    }
    
    // Test 4: Memory usage comparison
    console.log(`${colors.magenta}Test 4: Memory Usage Comparison${colors.reset}`);
    
    const originalMemory = results.original.reduce((sum, test) => sum + test.memoryDelta.heapUsed, 0);
    const modularMemory = results.modular.reduce((sum, test) => sum + test.memoryDelta.heapUsed, 0);
    
    console.log(`  Original: ${originalMemory.toFixed(2)} MB heap used`);
    console.log(`  Modular:  ${modularMemory.toFixed(2)} MB heap used`);
    
    const memoryImprovement = ((originalMemory - modularMemory) / originalMemory * 100).toFixed(1);
    if (memoryImprovement > 0) {
      console.log(`  ${colors.green}✓ Modular uses ${memoryImprovement}% less memory${colors.reset}\n`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original uses ${Math.abs(memoryImprovement)}% less memory${colors.reset}\n`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    
    const totalOriginalTime = results.original.reduce((sum, test) => sum + test.duration, 0);
    const totalModularTime = results.modular.reduce((sum, test) => sum + test.duration, 0);
    
    console.log(`\nTotal execution time:`);
    console.log(`  Original: ${totalOriginalTime.toFixed(2)}ms`);
    console.log(`  Modular:  ${totalModularTime.toFixed(2)}ms`);
    
    const overallSpeedup = ((totalOriginalTime - totalModularTime) / totalOriginalTime * 100).toFixed(1);
    
    console.log('\nConclusion:');
    if (overallSpeedup > 0) {
      console.log(`  ${colors.green}✓ Modular service is ${overallSpeedup}% faster overall${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original service is ${Math.abs(overallSpeedup)}% faster overall${colors.reset}`);
    }
    
    if (memoryImprovement > 0) {
      console.log(`  ${colors.green}✓ Modular service uses ${memoryImprovement}% less memory${colors.reset}`);
    } else {
      console.log(`  ${colors.yellow}⚠ Original service uses ${Math.abs(memoryImprovement)}% less memory${colors.reset}`);
    }
    
    // Cleanup services
    console.log('\nShutting down services...');
    await originalService.shutdown();
    await modularService.shutdown();
    console.log(`${colors.green}✓ Services shut down${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Fatal error during tests: ${error.message}${colors.reset}`);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (client) {
      await client.close();
      console.log(`\n${colors.blue}Database connection closed${colors.reset}`);
    }
  }
}

// Run comparison tests
runComparisonTests().catch(error => {
  console.error(`${colors.red}Unhandled error: ${error.message}${colors.reset}`);
  process.exit(1);
});