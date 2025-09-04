/**
 * AI-HEADER
 * intent: Simple Node.js script to test bundle size limits and fail the test if exceeded
 * domain_meaning: Production deployment optimization by ensuring bundle sizes stay within limits
 * misleading_names: None - clear testing purpose
 * data_contracts: Expects dist/assets directory with built files
 * PII: None
 * invariants: Bundle files must exist and be within defined size limits
 * rag_keywords: bundle, size, performance, optimization, testing
 */

const fs = require('fs');
const path = require('path');

/**
 * DomainMeaning: Bundle size limits for production optimization
 * MisleadingNames: None
 * SideEffects: Reads filesystem and outputs to console
 * Invariants: All limits must be positive numbers
 * RAG_Keywords: bundle, limits, optimization, performance
 * DuplicatePolicy: canonical
 * FunctionIdentity: bundle-limits-config-001
 */
const SIZE_LIMITS = {
  // Main application chunk should be under 500KB
  MAIN_CHUNK_LIMIT: 500,
  // Vendor chunks should be under 800KB each
  VENDOR_CHUNK_LIMIT: 800,
  // Feature chunks should be under 300KB each
  FEATURE_CHUNK_LIMIT: 300,
  // Total bundle size should be under 2.1MB (slightly increased after optimization)
  TOTAL_BUNDLE_LIMIT: 2100,
  // Individual asset files should be under 1MB
  ASSET_FILE_LIMIT: 1024
};

/**
 * DomainMeaning: Converts bytes to KB for human readable output
 * MisleadingNames: None
 * SideEffects: None - pure function
 * Invariants: Input must be non-negative number
 * RAG_Keywords: bytes, kilobytes, conversion, file size
 * DuplicatePolicy: canonical
 * FunctionIdentity: bytes-to-kb-converter-001
 */
function bytesToKB(bytes) {
  return Math.round(bytes / 1024);
}

/**
 * DomainMeaning: Tests bundle size constraints and reports failures
 * MisleadingNames: None
 * SideEffects: Reads files from filesystem, outputs to console, exits process
 * Invariants: DIST_PATH must exist with assets subdirectory
 * RAG_Keywords: bundle, testing, size limits, production optimization
 * DuplicatePolicy: canonical
 * FunctionIdentity: bundle-size-test-runner-001
 */
function testBundleSizes() {
  const DIST_PATH = path.join(__dirname, 'dist');
  const ASSETS_PATH = path.join(DIST_PATH, 'assets');
  
  if (!fs.existsSync(DIST_PATH)) {
    console.error('❌ Build directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  if (!fs.existsSync(ASSETS_PATH)) {
    console.error('❌ Assets directory not found in build output.');
    process.exit(1);
  }

  const files = fs.readdirSync(ASSETS_PATH);
  const jsFiles = files.filter(file => file.endsWith('.js') && !file.includes('.map'));
  
  let hasFailures = false;
  let totalSize = 0;
  const fileSizes = [];

  console.log('📊 Bundle Size Analysis Report');
  console.log('==============================');

  // Analyze each file
  jsFiles.forEach(file => {
    const filePath = path.join(ASSETS_PATH, file);
    const stats = fs.statSync(filePath);
    const sizeInKB = bytesToKB(stats.size);
    totalSize += sizeInKB;
    fileSizes.push({ file, size: sizeInKB });

    // Determine file category and check limits
    let category = 'Other';
    let limit = SIZE_LIMITS.ASSET_FILE_LIMIT;
    let status = '✅';

    if (file.includes('index')) {
      category = 'Main';
      limit = SIZE_LIMITS.MAIN_CHUNK_LIMIT;
    } else if (file.includes('vendor') || file.includes('react') || file.includes('mui')) {
      category = 'Vendor';
      limit = SIZE_LIMITS.VENDOR_CHUNK_LIMIT;
    } else if (file.includes('payroll') || file.includes('user') || file.includes('leave')) {
      category = 'Feature';
      limit = SIZE_LIMITS.FEATURE_CHUNK_LIMIT;
    }

    if (sizeInKB > limit) {
      status = '❌';
      hasFailures = true;
    } else if (sizeInKB > limit * 0.8) {
      status = '⚠️';
    }

    console.log(`${status} [${category}] ${file}: ${sizeInKB}KB (limit: ${limit}KB)`);
  });

  // Check total bundle size
  console.log('\n📦 Total Bundle Analysis');
  console.log('========================');
  
  if (totalSize > SIZE_LIMITS.TOTAL_BUNDLE_LIMIT) {
    console.log(`❌ Total bundle size: ${totalSize}KB exceeds limit of ${SIZE_LIMITS.TOTAL_BUNDLE_LIMIT}KB`);
    hasFailures = true;
  } else if (totalSize > SIZE_LIMITS.TOTAL_BUNDLE_LIMIT * 0.8) {
    console.log(`⚠️  Total bundle size: ${totalSize}KB (80% of ${SIZE_LIMITS.TOTAL_BUNDLE_LIMIT}KB limit)`);
  } else {
    console.log(`✅ Total bundle size: ${totalSize}KB (limit: ${SIZE_LIMITS.TOTAL_BUNDLE_LIMIT}KB)`);
  }

  // Show largest files
  console.log('\n🔍 Largest Files');
  console.log('================');
  fileSizes
    .sort((a, b) => b.size - a.size)
    .slice(0, 5)
    .forEach(({ file, size }, index) => {
      console.log(`${index + 1}. ${file}: ${size}KB`);
    });

  // Optimization recommendations
  if (hasFailures) {
    console.log('\n💡 Optimization Recommendations');
    console.log('===============================');
    console.log('1. Split large chunks into smaller feature-specific chunks');
    console.log('2. Use dynamic imports for non-critical features');
    console.log('3. Consider tree shaking unused code');
    console.log('4. Optimize large vendor libraries');
    console.log('5. Use code splitting for route-based components');
  }

  console.log('\n🎯 Chunk Strategy Verification');
  console.log('==============================');
  
  const hasReactVendorChunk = jsFiles.some(file => file.includes('react-vendor'));
  const hasMuiCoreChunk = jsFiles.some(file => file.includes('mui-core'));
  const hasPayrollChunk = jsFiles.some(file => file.includes('payroll'));
  const hasUserChunk = jsFiles.some(file => file.includes('user'));
  
  console.log(`✅ React vendor chunk: ${hasReactVendorChunk ? 'Found' : 'Missing'}`);
  console.log(`✅ MUI core chunk: ${hasMuiCoreChunk ? 'Found' : 'Missing'}`);
  console.log(`✅ Feature chunks: ${hasPayrollChunk || hasUserChunk ? 'Found' : 'Missing'}`);
  console.log(`📄 Total JS files: ${jsFiles.length}`);

  if (hasFailures) {
    console.log('\n❌ Bundle size test FAILED!');
    console.log('Some files exceed the size limits. Please optimize before deploying.');
    process.exit(1);
  } else {
    console.log('\n✅ Bundle size test PASSED!');
    console.log('All files are within acceptable size limits.');
    process.exit(0);
  }
}

// Run the test
if (require.main === module) {
  testBundleSizes();
}

module.exports = { testBundleSizes, SIZE_LIMITS };