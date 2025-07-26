const fs = require('fs');
const path = require('path');

function fixAPIInconsistencies() {
  console.log('🔧 API 불일치 수정 계획 생성...\n');
  
  // 분석 결과 로드
  const report = JSON.parse(fs.readFileSync(path.join(__dirname, '../analysis/api-consistency-report.json'), 'utf8'));
  
  console.log('🎯 주요 불일치 패턴 분석:');
  
  const fixes = [];
  
  // 1. 경로 끝 슬래시 불일치 (가장 흔한 문제)
  console.log('\n1️⃣ 경로 끝 슬래시 불일치:');
  const slashMismatches = [
    { frontend: 'getUsers', frontendPath: '/users', backendPath: '/users/' },
    { frontend: 'createUser', frontendPath: '/users', backendPath: '/users/' },
    { frontend: 'getDepartments', frontendPath: '/departments', backendPath: '/departments/' },
    { frontend: 'createDepartment', frontendPath: '/departments', backendPath: '/departments/' },
    { frontend: 'getPositions', frontendPath: '/positions', backendPath: '/positions/' },
    { frontend: 'createPosition', frontendPath: '/positions', backendPath: '/positions/' }
  ];
  
  slashMismatches.forEach(mismatch => {
    console.log(`  • ${mismatch.frontend}(): ${mismatch.frontendPath} ↔ ${mismatch.backendPath}`);
    fixes.push({
      type: 'TRAILING_SLASH',
      priority: 'HIGH',
      frontend: mismatch.frontend,
      solution: `Frontend API 서비스에서 '${mismatch.frontendPath}'를 '${mismatch.backendPath}'로 수정`,
      files: ['frontend/src/services/api.ts']
    });
  });
  
  // 2. 파라미터 이름 불일치
  console.log('\n2️⃣ 파라미터 이름 불일치:');
  const paramMismatches = [
    { frontend: 'getMonthlyPayments', frontendParam: ':param', backendParam: ':year_month' },
    { frontend: 'getSalesData', frontendParam: ':param', backendParam: ':year_month' },
    { frontend: 'getPayrollStats', frontendParam: ':param', backendParam: ':yearMonth' },
    { frontend: 'getPayrollReport', frontendParam: ':param', backendParam: ':year_month' }
  ];
  
  paramMismatches.forEach(mismatch => {
    console.log(`  • ${mismatch.frontend}(): ${mismatch.frontendParam} ↔ ${mismatch.backendParam}`);
    fixes.push({
      type: 'PARAMETER_NAME',
      priority: 'MEDIUM',
      frontend: mismatch.frontend,
      solution: `파라미터 이름 통일: ${mismatch.backendParam} 사용`,
      files: ['frontend/src/services/api.ts', 'backend API 문서 업데이트']
    });
  });
  
  // 3. 누락된 백엔드 엔드포인트
  console.log('\n3️⃣ 누락된 백엔드 엔드포인트:');
  const missingEndpoints = [
    { 
      frontend: 'getOrganizationChart', 
      endpoint: 'GET /api/organization-chart',
      note: 'server.js에 직접 정의되어 있을 수 있음'
    },
    { 
      frontend: 'getAvailablePermissions', 
      endpoint: 'GET /api/permissions',
      note: 'server.js에 직접 정의되어 있을 수 있음'
    },
    {
      frontend: 'activateUser',
      endpoint: 'POST /api/users/:id/activate',
      note: '백엔드에 구현 필요'
    },
    {
      frontend: 'resetUserPassword',
      endpoint: 'POST /api/users/:id/reset-password',
      note: '백엔드에 구현 필요'
    }
  ];
  
  missingEndpoints.forEach(missing => {
    console.log(`  • ${missing.frontend}(): ${missing.endpoint} - ${missing.note}`);
    fixes.push({
      type: 'MISSING_BACKEND',
      priority: 'HIGH',
      frontend: missing.frontend,
      solution: `백엔드 엔드포인트 구현: ${missing.endpoint}`,
      files: ['backend/routes/users.js 또는 해당 라우트 파일'],
      note: missing.note
    });
  });
  
  // 4. 휴가 관련 API 정리
  console.log('\n4️⃣ 휴가 관련 API 경로 혼재:');
  const leaveAPIs = [
    {
      issue: 'createLeaveRequest: POST /api/leave vs POST /api/leave/',
      solution: 'Backend 라우트를 POST /api/leave/로 통일'
    },
    {
      issue: 'getLeaveBalance: 실제 경로 확인 필요',
      solution: 'GET /api/leave/balance/:userId? 엔드포인트 확인'
    },
    {
      issue: '휴가 취소 관련 API 경로 불일치', 
      solution: 'leaveCancellation.js 라우트 경로 재정의 필요'
    }
  ];
  
  leaveAPIs.forEach(api => {
    console.log(`  • ${api.issue}`);
    console.log(`    해결책: ${api.solution}`);
    fixes.push({
      type: 'LEAVE_API_CLEANUP',
      priority: 'HIGH',
      issue: api.issue,
      solution: api.solution,
      files: ['backend/routes/leave/ 하위 파일들']
    });
  });
  
  // 5. 수정 우선순위별 정리
  console.log('\n📋 수정 우선순위별 정리:');
  
  const highPriority = fixes.filter(f => f.priority === 'HIGH');
  const mediumPriority = fixes.filter(f => f.priority === 'MEDIUM');
  
  console.log(`\n🔴 HIGH 우선순위 (${highPriority.length}개):`);
  highPriority.forEach((fix, index) => {
    console.log(`  ${index + 1}. [${fix.type}] ${fix.solution}`);
  });
  
  console.log(`\n🟡 MEDIUM 우선순위 (${mediumPriority.length}개):`);
  mediumPriority.forEach((fix, index) => {
    console.log(`  ${index + 1}. [${fix.type}] ${fix.solution}`);
  });
  
  // 6. 자동 수정 스크립트 생성 계획
  console.log('\n🤖 자동 수정 가능한 항목:');
  const autoFixable = fixes.filter(f => f.type === 'TRAILING_SLASH');
  console.log(`  • 경로 끝 슬래시 수정: ${autoFixable.length}개`);
  console.log(`  • 파라미터 이름 통일: 부분적으로 가능`);
  
  // 결과 저장
  const fixPlan = {
    summary: {
      totalFixes: fixes.length,
      highPriority: highPriority.length,
      mediumPriority: mediumPriority.length,
      autoFixable: autoFixable.length
    },
    fixes,
    recommendations: [
      '1. 경로 끝 슬래시 통일 (Backend 기준으로 통일)',
      '2. 누락된 백엔드 엔드포인트 구현',
      '3. 휴가 관련 API 라우트 정리',
      '4. 파라미터 이름 표준화',
      '5. 사용되지 않는 API 정리'
    ],
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../analysis/api-fix-plan.json'),
    JSON.stringify(fixPlan, null, 2)
  );
  
  console.log('\n✅ API 불일치 수정 계획 생성 완료 (analysis/api-fix-plan.json 저장)');
  
  return fixPlan;
}

if (require.main === module) {
  fixAPIInconsistencies();
}

module.exports = { fixAPIInconsistencies };