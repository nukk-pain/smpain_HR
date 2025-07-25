const fs = require('fs');
const path = require('path');

function analyzeFrontendAPIs() {
  console.log('🔍 Frontend API 호출 분석 시작...\n');
  
  const frontendCalls = [];
  const srcDir = path.join(__dirname, '../frontend/src');
  
  // 모든 TypeScript/JavaScript 파일 찾기
  function findSourceFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) {
      console.log(`⚠️ 디렉토리를 찾을 수 없습니다: ${dir}`);
      return files;
    }
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findSourceFiles(fullPath));
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const sourceFiles = findSourceFiles(srcDir);
  console.log(`📁 총 ${sourceFiles.length}개 파일 검사 중...\n`);
  
  // API 서비스 메소드 분석
  console.log('🔧 API 서비스 메소드 분석:');
  const apiServiceFile = path.join(srcDir, 'services/api.ts');
  
  if (fs.existsSync(apiServiceFile)) {
    const content = fs.readFileSync(apiServiceFile, 'utf8');
    
    // async 메소드 찾기
    const methodRegex = /async\s+(\w+)\s*\([^)]*\)[^{]*{[^}]*this\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = methodRegex.exec(content)) !== null) {
      const methodName = match[1];
      const httpMethod = match[2].toUpperCase();
      let endpoint = match[3];
      
      // 동적 경로 처리
      if (endpoint.includes('${')) {
        endpoint = endpoint.replace(/\$\{[^}]+\}/g, ':param');
      }
      
      frontendCalls.push({
        type: 'apiService',
        methodName,
        httpMethod,
        endpoint,
        file: 'services/api.ts'
      });
      
      console.log(`  ${methodName}() -> ${httpMethod} ${endpoint}`);
    }
  }
  
  // 직접 API 호출 찾기
  console.log('\n🌐 직접 API 호출 분석:');
  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(srcDir, file);
    
    // apiService.method() 호출 찾기
    const apiCallRegex = /apiService\.(\w+)\s*\(/g;
    let match;
    const fileCalls = [];
    
    while ((match = apiCallRegex.exec(content)) !== null) {
      const methodName = match[1];
      fileCalls.push(methodName);
    }
    
    if (fileCalls.length > 0) {
      console.log(`  📁 ${relativePath}:`);
      const methodCounts = {};
      fileCalls.forEach(method => {
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });
      
      Object.entries(methodCounts).forEach(([method, count]) => {
        console.log(`    ${method}() (${count}회)`);
      });
      
      frontendCalls.push({
        type: 'usage',
        file: relativePath,
        methods: Object.keys(methodCounts)
      });
    }
  }
  
  // 결과 저장
  fs.writeFileSync(
    path.join(__dirname, '../analysis/frontend-apis.json'),
    JSON.stringify(frontendCalls, null, 2)
  );
  
  console.log(`\n✅ Frontend API 호출 분석 완료 (analysis/frontend-apis.json 저장)`);
  console.log(`📊 총 API 서비스 메소드: ${frontendCalls.filter(c => c.type === 'apiService').length}개`);
  
  return frontendCalls;
}

if (require.main === module) {
  analyzeFrontendAPIs();
}

module.exports = { analyzeFrontendAPIs };