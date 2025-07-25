const fs = require('fs');
const path = require('path');

function protectDebugEndpoints() {
  console.log('🔒 Adding production protection to debug endpoints...\n');
  
  const filePath = path.join(__dirname, '../backend/routes/users.js');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find debug endpoints and add protection
  const debugEndpoints = [
    '/debug/permissions',
    '/debug/fix-admin', 
    '/debug/login-admin',
    '/debug/fix-employee-ids'
  ];
  
  let modified = false;
  
  debugEndpoints.forEach(endpoint => {
    // Look for the route definition
    const routeRegex = new RegExp(`router\\.(get|post)\\('${endpoint}'`, 'g');
    
    if (content.includes(`'${endpoint}'`)) {
      console.log(`✅ Found debug endpoint: ${endpoint}`);
      
      // Check if already protected
      const lineIndex = content.indexOf(`'${endpoint}'`);
      const lineStart = content.lastIndexOf('\n', lineIndex);
      const lineEnd = content.indexOf('\n', lineIndex);
      const line = content.substring(lineStart, lineEnd);
      
      if (!line.includes('NODE_ENV')) {
        console.log(`  🔧 Adding production protection...`);
        // Add comment above the route
        const protectionComment = `\n  // Debug endpoint - only available in development`;
        const envCheck = `\n  if (process.env.NODE_ENV === 'production') {\n    return router;\n  }`;
        
        // For now, just log what we would do
        console.log(`  📝 Would add protection for: ${endpoint}`);
        modified = true;
      } else {
        console.log(`  ✓ Already protected`);
      }
    }
  });
  
  if (modified) {
    console.log('\n⚠️  Manual modification recommended:');
    console.log('Add this check before debug endpoints in routes/users.js:\n');
    console.log(`  // Protect debug endpoints in production
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Debug endpoints - only available in development
  if (!isProduction) {
    router.get('/debug/permissions', ...);
    router.post('/debug/fix-admin', ...);
    router.post('/debug/login-admin', ...);
    router.post('/debug/fix-employee-ids', ...);
  }`);
  }
  
  console.log('\n📋 Additional Recommendations:');
  console.log('1. Set NODE_ENV in production: NODE_ENV=production');
  console.log('2. Consider moving debug endpoints to a separate file');
  console.log('3. Add rate limiting to prevent abuse');
  console.log('4. Log all debug endpoint usage');
}

if (require.main === module) {
  protectDebugEndpoints();
}

module.exports = { protectDebugEndpoints };