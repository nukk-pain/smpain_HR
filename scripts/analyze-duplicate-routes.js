const fs = require('fs');
const path = require('path');

function analyzeDuplicateRoutes() {
  console.log('🔍 Analyzing duplicate and conflicting routes...\n');
  
  // Load backend APIs
  const backendAPIs = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/backend-apis.json'), 'utf8'));
  
  // Group by endpoint pattern
  const routePatterns = {};
  backendAPIs.forEach(api => {
    // Normalize the endpoint to find duplicates
    const normalizedEndpoint = api.endpoint
      .replace(/\/:[\w]+/g, '/:param') // Replace all params with :param
      .replace(/\/$/, ''); // Remove trailing slash
    
    const key = `${api.method} ${normalizedEndpoint}`;
    
    if (!routePatterns[key]) {
      routePatterns[key] = [];
    }
    
    routePatterns[key].push({
      original: `${api.method} ${api.endpoint}`,
      file: api.file,
      routePattern: api.routePattern
    });
  });
  
  // Find duplicates
  const duplicates = {};
  const conflicts = {};
  
  Object.entries(routePatterns).forEach(([pattern, routes]) => {
    if (routes.length > 1) {
      // Check if they're from different files
      const files = [...new Set(routes.map(r => r.file))];
      
      if (files.length > 1) {
        conflicts[pattern] = routes;
      } else {
        duplicates[pattern] = routes;
      }
    }
  });
  
  console.log('🔄 Duplicate Routes (same file):');
  Object.entries(duplicates).forEach(([pattern, routes]) => {
    console.log(`\n${pattern}:`);
    routes.forEach(route => {
      console.log(`  - ${route.original} in ${route.file}`);
    });
  });
  
  console.log('\n⚠️  Conflicting Routes (different files):');
  Object.entries(conflicts).forEach(([pattern, routes]) => {
    console.log(`\n${pattern}:`);
    routes.forEach(route => {
      console.log(`  - ${route.original} in ${route.file}`);
    });
  });
  
  // Analyze leave routes specifically
  console.log('\n🍃 Leave Route Analysis:');
  const leaveRoutes = backendAPIs.filter(api => api.endpoint.includes('/leave'));
  
  // Group by functionality
  const leaveFunctionality = {
    requests: [],
    balance: [],
    approval: [],
    cancellation: [],
    calendar: [],
    exceptions: [],
    other: []
  };
  
  leaveRoutes.forEach(route => {
    const endpoint = route.endpoint;
    if (endpoint.includes('balance')) {
      leaveFunctionality.balance.push(route);
    } else if (endpoint.includes('approve') || endpoint.includes('approval')) {
      leaveFunctionality.approval.push(route);
    } else if (endpoint.includes('cancel')) {
      leaveFunctionality.cancellation.push(route);
    } else if (endpoint.includes('calendar') || endpoint.includes('team')) {
      leaveFunctionality.calendar.push(route);
    } else if (endpoint.includes('exception')) {
      leaveFunctionality.exceptions.push(route);
    } else if (route.file.includes('leaveRequests')) {
      leaveFunctionality.requests.push(route);
    } else {
      leaveFunctionality.other.push(route);
    }
  });
  
  console.log('\nLeave routes by functionality:');
  Object.entries(leaveFunctionality).forEach(([func, routes]) => {
    if (routes.length > 0) {
      console.log(`\n${func.toUpperCase()} (${routes.length} routes):`);
      routes.forEach(route => {
        console.log(`  - ${route.method} ${route.endpoint} (${route.file})`);
      });
    }
  });
  
  // Generate recommendations
  console.log('\n📋 Recommendations:');
  console.log('\n1. Consolidate Leave Routes:');
  console.log('   - leaveBalance.js and leaveBalance-old.js should be merged');
  console.log('   - Multiple POST /api/leave/ routes exist in different files');
  console.log('   - Consider creating a single leave router with sub-routers');
  
  console.log('\n2. Remove Duplicate Endpoints:');
  console.log('   - Check if trailing slash variants are needed');
  console.log('   - Consolidate parameter naming (:id vs :param vs specific names)');
  
  console.log('\n3. Clean Up Old Implementations:');
  console.log('   - Files with "-old" suffix should be reviewed and removed');
  console.log('   - Unused approval routes should be consolidated');
  
  // Save analysis
  const analysis = {
    duplicates: Object.keys(duplicates).length,
    conflicts: Object.keys(conflicts).length,
    leaveRoutes: leaveRoutes.length,
    duplicateDetails: duplicates,
    conflictDetails: conflicts,
    leaveFunctionality,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../analysis/duplicate-routes-analysis.json'),
    JSON.stringify(analysis, null, 2)
  );
  
  console.log('\n✅ Analysis saved to analysis/duplicate-routes-analysis.json');
}

if (require.main === module) {
  analyzeDuplicateRoutes();
}

module.exports = { analyzeDuplicateRoutes };