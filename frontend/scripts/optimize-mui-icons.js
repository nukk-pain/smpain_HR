#!/usr/bin/env node

/**
 * MUI Icons 자동 최적화 스크립트
 * 
 * 이 스크립트는:
 * 1. 모든 .tsx, .ts 파일에서 MUI 아이콘 import를 찾습니다
 * 2. 번들 import를 개별 import로 변경합니다
 * 3. 백업 파일을 생성합니다
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

// 개별 import 패턴 정규식
const bundleImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@mui\/icons-material['"]/g;
const individualImportRegex = /import\s+(\w+)\s+from\s+['"]@mui\/icons-material\/\w+['"]/;

// 파일 처리 통계
let totalFiles = 0;
let modifiedFiles = 0;
let totalImports = 0;

console.log(`${colors.blue}${colors.bright}🔍 MUI Icons 최적화 시작...${colors.reset}\n`);

// src 디렉토리의 모든 TypeScript 파일 찾기
const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*']
});

console.log(`📁 총 ${files.length}개 파일 검사 중...\n`);

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let newContent = content;
  
  // 번들 import 찾기
  const matches = [...content.matchAll(bundleImportRegex)];
  
  if (matches.length > 0) {
    totalFiles++;
    console.log(`${colors.yellow}📄 ${filePath}${colors.reset}`);
    
    matches.forEach(match => {
      const fullImport = match[0];
      const icons = match[1].split(',').map(icon => icon.trim());
      
      // 이미 개별 import인지 확인
      const hasIndividualImports = icons.some(icon => {
        const individualPattern = new RegExp(
          `import\\s+${icon}\\s+from\\s+['"]@mui/icons-material/${icon.replace(/Icon$/, '')}['"]`
        );
        return individualPattern.test(content);
      });
      
      if (!hasIndividualImports) {
        // 새로운 import 문 생성
        const newImports = icons.map(icon => {
          const iconName = icon.replace(/Icon$/, '');
          totalImports++;
          return `import ${icon} from '@mui/icons-material/${iconName}';`;
        }).join('\n');
        
        // 기존 import 문 교체
        newContent = newContent.replace(fullImport, newImports);
        modified = true;
        
        console.log(`  ✏️  ${icons.length}개 아이콘 변환:`);
        icons.forEach(icon => {
          console.log(`     - ${icon}`);
        });
      }
    });
    
    if (modified) {
      // 백업 파일 생성
      const backupPath = filePath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, content);
      }
      
      // 수정된 내용 저장
      fs.writeFileSync(filePath, newContent);
      modifiedFiles++;
      console.log(`  ${colors.green}✅ 저장 완료${colors.reset}\n`);
    } else {
      console.log(`  ℹ️  이미 최적화됨\n`);
    }
  }
});

// 결과 출력
console.log(`${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.green}${colors.bright}✨ 최적화 완료!${colors.reset}\n`);
console.log(`📊 통계:`);
console.log(`   • 검사한 파일: ${files.length}개`);
console.log(`   • 수정한 파일: ${modifiedFiles}개`);
console.log(`   • 최적화한 import: ${totalImports}개`);

if (modifiedFiles > 0) {
  console.log(`\n💡 팁:`);
  console.log(`   • 백업 파일이 생성되었습니다 (*.backup)`);
  console.log(`   • 되돌리려면: git checkout -- src/`);
  console.log(`   • 백업 제거: find src -name "*.backup" -delete`);
  
  // 예상 개선 효과
  const estimatedReduction = totalImports * 2; // 각 아이콘당 약 2KB 절감
  console.log(`\n📉 예상 번들 크기 감소: ~${estimatedReduction}KB`);
}

// package.json에 스크립트 추가 제안
if (modifiedFiles > 0) {
  console.log(`\n${colors.yellow}📝 package.json에 다음 스크립트 추가를 권장합니다:${colors.reset}`);
  console.log(`   "scripts": {`);
  console.log(`     "optimize:icons": "node scripts/optimize-mui-icons.js",`);
  console.log(`     "clean:backups": "find src -name '*.backup' -delete"`);
  console.log(`   }`);
}

process.exit(0);