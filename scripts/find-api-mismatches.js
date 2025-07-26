const fs = require('fs');
const path = require('path');

function findAPIMismatches() {
  console.log('🔍 Backend-Frontend API 불일치 검색 시작...\n');
  
  // 분석 결과 로드
  const backendAPIs = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/backend-apis.json'), 'utf8'));
  const frontendAPIs = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/frontend-apis.json'), 'utf8'));
  
  const mismatches = [];
  const matches = [];
  
  // Backend API를 맵으로 변환 (빠른 검색을 위해)
  const backendMap = {};
  backendAPIs.forEach(api => {
    const key = `${api.method} ${api.endpoint}`;
    backendMap[key] = api;
  });
  
  console.log('🔴 불일치 발견:');
  
  // Frontend API 서비스 메소드와 Backend 매칭
  const apiServiceMethods = frontendAPIs.filter(api => api.type === 'apiService');
  
  apiServiceMethods.forEach(frontendAPI => {
    const expectedKey = `${frontendAPI.httpMethod} /api${frontendAPI.endpoint}`;
    const alternateKey1 = `${frontendAPI.httpMethod} ${frontendAPI.endpoint}`;
    const alternateKey2 = `${frontendAPI.httpMethod} /api${frontendAPI.endpoint.replace(':param', ':id')}`;
    
    const backendMatch = backendMap[expectedKey] || 
                        backendMap[alternateKey1] || 
                        backendMap[alternateKey2];
    
    if (!backendMatch) {
      // 유사한 엔드포인트 찾기
      const similarEndpoints = backendAPIs.filter(api => {
        const frontendPath = frontendAPI.endpoint.replace(/:\w+/g, ':id');
        const backendPath = api.endpoint.replace(/\/api/, '').replace(/:\w+/g, ':id');
        
        return api.method === frontendAPI.httpMethod && 
               (backendPath.includes(frontendPath.split('/')[1]) || 
                frontendPath.includes(backendPath.split('/')[1]));
      });
      
      mismatches.push({
        type: 'MISSING_BACKEND',
        severity: 'HIGH',
        frontendMethod: frontendAPI.methodName,
        expectedEndpoint: expectedKey,
        frontendFile: frontendAPI.file,
        similarEndpoints: similarEndpoints.map(e => `${e.method} ${e.endpoint}`)
      });
      
      console.log(`  ❌ ${frontendAPI.methodName}() 호출: ${expectedKey}`);
      if (similarEndpoints.length > 0) {
        console.log(`    💡 유사한 엔드포인트: ${similarEndpoints.map(e => `${e.method} ${e.endpoint}`).join(', ')}`);
      }
    } else {
      matches.push({
        frontendMethod: frontendAPI.methodName,
        backendEndpoint: expectedKey,
        backendFile: backendMatch.file
      });
    }
  });
  
  console.log('\n🟡 Backend에만 존재하는 API:');
  
  // Backend에만 있는 API 찾기
  const frontendEndpoints = new Set();
  apiServiceMethods.forEach(api => {
    frontendEndpoints.add(`${api.httpMethod} /api${api.endpoint}`);
    frontendEndpoints.add(`${api.httpMethod} /api${api.endpoint.replace(':param', ':id')}`);
  });
  
  backendAPIs.forEach(api => {
    const key = `${api.method} ${api.endpoint}`;
    if (!frontendEndpoints.has(key)) {
      mismatches.push({
        type: 'UNUSED_BACKEND',
        severity: 'MEDIUM',
        backendEndpoint: key,
        backendFile: api.file
      });
      
      console.log(`  ⚠️ 사용되지 않는 API: ${key} (${api.file})`);
    }
  });
  
  console.log('\n🔍 특별 케이스 검사:');
  
  // 특별 케이스들 검사
  const specialCases = [
    {
      frontend: 'getLeaveRequests',
      backend: 'GET /api/leave/',
      note: '휴가 신청 목록 조회'
    },
    {
      frontend: 'getLeaveBalance',
      backend: 'GET /api/leave/balance/:userId?',
      note: '휴가 잔여일수 조회'
    },
    {
      frontend: 'getEmployeeLeaveLog',
      backend: 'GET /api/leave/:employeeId/log',
      note: '직원 휴가 이력 조회'
    }
  ];
  
  specialCases.forEach(special => {
    const frontendExists = apiServiceMethods.find(api => api.methodName === special.frontend);
    const backendExists = backendAPIs.find(api => api.endpoint.includes(special.backend.split(' ')[1].replace('/api', '')));
    
    if (frontendExists && !backendExists) {
      console.log(`  ❌ ${special.note}: Frontend 메소드는 있으나 Backend 엔드포인트 없음`);
      mismatches.push({
        type: 'SPECIAL_CASE_MISSING',
        severity: 'HIGH',
        description: special.note,
        frontend: special.frontend,
        expectedBackend: special.backend
      });
    } else if (frontendExists && backendExists) {
      console.log(`  ✅ ${special.note}: 정상 매칭`);
    }
  });
  
  // 결과 요약
  console.log('\n📊 분석 결과 요약:');
  console.log(`  ✅ 매칭된 API: ${matches.length}개`);
  console.log(`  ❌ 불일치 발견: ${mismatches.length}개`);
  
  const severityCounts = {};
  mismatches.forEach(m => {
    severityCounts[m.severity] = (severityCounts[m.severity] || 0) + 1;
  });
  
  Object.entries(severityCounts).forEach(([severity, count]) => {
    const emoji = severity === 'HIGH' ? '🔴' : severity === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`  ${emoji} ${severity}: ${count}개`);
  });
  
  // 결과 저장
  const report = {
    summary: {
      totalBackendAPIs: backendAPIs.length,
      totalFrontendMethods: apiServiceMethods.length,
      matches: matches.length,
      mismatches: mismatches.length,
      severityBreakdown: severityCounts
    },
    matches,
    mismatches,
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../analysis/api-consistency-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n✅ API 일관성 분석 완료 (analysis/api-consistency-report.json 저장)');
  
  return report;
}

if (require.main === module) {
  findAPIMismatches();
}

module.exports = { findAPIMismatches };