const fs = require('fs');
const path = require('path');

function analyzeBackendAPIs() {
  console.log('🔍 Backend API 분석 시작...\n');
  
  const backendRoutes = [];
  const routesDir = path.join(__dirname, '../backend/routes');
  
  // 모든 라우트 파일 찾기
  function findRouteFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findRouteFiles(fullPath));
      } else if (item.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const routeFiles = findRouteFiles(routesDir);
  
  // 각 파일에서 API 엔드포인트 추출
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(path.join(__dirname, '../backend'), file);
    
    // router.METHOD 패턴 찾기
    const routeRegex = /router\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g;
    let match;
    
    console.log(`📁 ${relativePath}:`);
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      
      // 서버의 라우트 등록 확인 (app.use('/api/...'))
      let apiPrefix = '';
      if (file.includes('routes/auth')) apiPrefix = '/api/auth';
      else if (file.includes('routes/users')) apiPrefix = '/api/users';
      else if (file.includes('routes/leave')) apiPrefix = '/api/leave';
      else if (file.includes('routes/departments')) apiPrefix = '/api/departments';
      else if (file.includes('routes/positions')) apiPrefix = '/api/positions';
      else if (file.includes('routes/payroll')) apiPrefix = '/api/payroll';
      else if (file.includes('routes/bonus')) apiPrefix = '/api/bonus';
      else if (file.includes('routes/sales')) apiPrefix = '/api/sales';
      else if (file.includes('routes/upload')) apiPrefix = '/api/payroll-upload';
      else if (file.includes('routes/reports')) apiPrefix = '/api/reports';
      else if (file.includes('routes/admin')) apiPrefix = '/api/admin';
      
      const fullEndpoint = apiPrefix + endpoint;
      
      backendRoutes.push({
        method,
        endpoint: fullEndpoint,
        file: relativePath,
        routePattern: endpoint
      });
      
      console.log(`  ${method} ${fullEndpoint}`);
    }
    console.log('');
  }
  
  // 결과 요약
  console.log('📊 Backend API 요약:');
  const methodCounts = {};
  backendRoutes.forEach(route => {
    methodCounts[route.method] = (methodCounts[route.method] || 0) + 1;
  });
  
  Object.entries(methodCounts).forEach(([method, count]) => {
    console.log(`  ${method}: ${count}개`);
  });
  
  console.log(`\n총 API 엔드포인트: ${backendRoutes.length}개`);
  
  // JSON 파일로 저장
  fs.writeFileSync(
    path.join(__dirname, '../analysis/backend-apis.json'),
    JSON.stringify(backendRoutes, null, 2)
  );
  
  console.log('✅ Backend API 분석 완료 (analysis/backend-apis.json 저장)');
  
  return backendRoutes;
}

// analysis 디렉토리 생성
if (!fs.existsSync(path.join(__dirname, '../analysis'))) {
  fs.mkdirSync(path.join(__dirname, '../analysis'));
}

if (require.main === module) {
  analyzeBackendAPIs();
}

module.exports = { analyzeBackendAPIs };