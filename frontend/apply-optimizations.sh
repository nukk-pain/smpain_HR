#!/bin/bash

echo "🚀 Frontend 빌드 최적화 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. AG-Grid 버전 통일
echo -e "${YELLOW}1. AG-Grid 버전 통일 중...${NC}"
npm uninstall @ag-grid-community/core @ag-grid-community/client-side-row-model @ag-grid-community/csv-export @ag-grid-community/styles
npm install @ag-grid-community/core@34.0.0 @ag-grid-community/client-side-row-model@34.0.0 @ag-grid-community/csv-export@34.0.0 @ag-grid-community/styles@34.0.0

# 2. SWC 설치
echo -e "${YELLOW}2. SWC 플러그인 설치 중...${NC}"
npm install -D @vitejs/plugin-react-swc

# 3. 기존 vite.config.ts 백업
echo -e "${YELLOW}3. 기존 설정 백업 중...${NC}"
cp vite.config.ts vite.config.backup.ts

# 4. 최적화된 설정 적용
echo -e "${YELLOW}4. 최적화된 설정 적용 중...${NC}"
cp vite.config.optimized.ts vite.config.ts

# vite.config.ts의 첫 줄 수정 (react-swc 사용)
sed -i "s/import react from '@vitejs\/plugin-react'/import react from '@vitejs\/plugin-react-swc'/" vite.config.ts

# 5. 캐시 클리어
echo -e "${YELLOW}5. 빌드 캐시 클리어 중...${NC}"
rm -rf node_modules/.vite
rm -rf dist
rm -f .tsbuildinfo

# 6. tsconfig.json 최적화
echo -e "${YELLOW}6. TypeScript 설정 최적화 중...${NC}"
# tsconfig.json에 최적화 옵션 추가
if ! grep -q "incremental" tsconfig.json; then
  jq '.compilerOptions.incremental = true | .compilerOptions.tsBuildInfoFile = ".tsbuildinfo"' tsconfig.json > tsconfig.tmp.json
  mv tsconfig.tmp.json tsconfig.json
fi

# 7. 불필요한 패키지 확인
echo -e "${YELLOW}7. 사용하지 않는 패키지 확인 중...${NC}"
npx depcheck

# 8. 테스트 빌드
echo -e "${YELLOW}8. 최적화된 빌드 테스트 중...${NC}"
time npm run build

echo -e "${GREEN}✅ 최적화 완료!${NC}"
echo -e "${GREEN}빌드 시간을 확인해주세요.${NC}"
echo ""
echo "추가 최적화를 원하시면:"
echo "1. dist/stats.html 파일을 확인하여 번들 크기 분석"
echo "2. BUILD-OPTIMIZATION-PLAN.md 파일 참고"
echo ""
echo "원래 설정으로 되돌리려면:"
echo "  cp vite.config.backup.ts vite.config.ts"