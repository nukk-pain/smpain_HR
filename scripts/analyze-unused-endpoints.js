const fs = require('fs');
const path = require('path');

function analyzeUnusedEndpoints() {
  console.log('🔍 Analyzing unused backend endpoints...\n');
  
  // Load the consistency report
  const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/api-consistency-report.json'), 'utf8'));
  
  // Filter unused backend endpoints
  const unusedEndpoints = report.mismatches.filter(m => m.type === 'UNUSED_BACKEND');
  
  // Group by file
  const byFile = {};
  unusedEndpoints.forEach(endpoint => {
    if (!byFile[endpoint.backendFile]) {
      byFile[endpoint.backendFile] = [];
    }
    byFile[endpoint.backendFile].push(endpoint.backendEndpoint);
  });
  
  // Analyze patterns
  const patterns = {
    debug: [],
    trailing_slash: [],
    truly_unused: [],
    potentially_needed: []
  };
  
  unusedEndpoints.forEach(endpoint => {
    const ep = endpoint.backendEndpoint;
    
    if (ep.includes('/debug/')) {
      patterns.debug.push(ep);
    } else if (ep.endsWith('/')) {
      // Check if non-slash version exists
      const nonSlashVersion = ep.replace(/\/$/, '');
      const hasNonSlash = report.matches.some(m => m.backendEndpoint === nonSlashVersion);
      if (hasNonSlash) {
        patterns.trailing_slash.push(ep);
      } else {
        patterns.truly_unused.push(ep);
      }
    } else {
      // Check if it's a critical endpoint
      if (ep.includes('bonus') || ep.includes('sales') || ep.includes('payroll-upload')) {
        patterns.potentially_needed.push(ep);
      } else {
        patterns.truly_unused.push(ep);
      }
    }
  });
  
  console.log('📊 Unused Endpoint Analysis:\n');
  console.log(`Total unused endpoints: ${unusedEndpoints.length}\n`);
  
  console.log('🔧 Debug Endpoints (can be removed in production):');
  patterns.debug.forEach(ep => console.log(`  - ${ep}`));
  
  console.log('\n📐 Trailing Slash Duplicates (likely false positives):');
  patterns.trailing_slash.forEach(ep => console.log(`  - ${ep}`));
  
  console.log('\n⚠️  Potentially Needed (missing frontend implementation):');
  patterns.potentially_needed.forEach(ep => console.log(`  - ${ep}`));
  
  console.log('\n🗑️  Truly Unused (safe to remove or document):');
  patterns.truly_unused.forEach(ep => console.log(`  - ${ep}`));
  
  // Generate recommendations
  console.log('\n📋 Recommendations:\n');
  console.log('1. Debug Endpoints:');
  console.log('   - Keep for development, but ensure they\'re disabled in production');
  console.log('   - Add environment check: if (process.env.NODE_ENV === "development")');
  
  console.log('\n2. Bonus & Sales Endpoints:');
  console.log('   - These appear to be complete CRUD APIs');
  console.log('   - Consider implementing frontend features or removing if not needed');
  
  console.log('\n3. Payroll Upload Endpoints:');
  console.log('   - Seems to be a file upload feature');
  console.log('   - Verify if this feature is planned or can be removed');
  
  console.log('\n4. Leave Management Endpoints:');
  console.log('   - Many duplicate routes exist (old vs new implementations)');
  console.log('   - Consider consolidating leave routes');
  
  // Save analysis
  const analysis = {
    summary: {
      total: unusedEndpoints.length,
      debug: patterns.debug.length,
      trailing_slash: patterns.trailing_slash.length,
      potentially_needed: patterns.potentially_needed.length,
      truly_unused: patterns.truly_unused.length
    },
    patterns,
    byFile,
    recommendations: [
      'Remove or protect debug endpoints',
      'Implement frontend for bonus management',
      'Implement frontend for sales data entry',
      'Consolidate duplicate leave routes',
      'Document or remove payroll upload feature'
    ],
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../analysis/unused-endpoints-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  console.log('\n✅ Analysis saved to analysis/unused-endpoints-analysis.json');
  
  return analysis;
}

if (require.main === module) {
  analyzeUnusedEndpoints();
}

module.exports = { analyzeUnusedEndpoints };