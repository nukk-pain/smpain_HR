#!/bin/bash

echo "🚀 휴가 관리 시스템 빠른 테스트 스크립트"
echo "================================================"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 프로젝트 디렉토리 확인
echo -e "${YELLOW}📁 프로젝트 구조 확인...${NC}"
if [ -d "backend" ] && [ -d "frontend" ]; then
    echo -e "${GREEN}✅ 백엔드 및 프론트엔드 디렉토리 존재${NC}"
else
    echo -e "${RED}❌ 프로젝트 디렉토리 구조 문제${NC}"
    exit 1
fi

# 백엔드 의존성 확인
echo -e "${YELLOW}📦 백엔드 의존성 확인...${NC}"
cd backend
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ 백엔드 의존성 설치됨${NC}"
else
    echo -e "${RED}❌ 백엔드 의존성 문제${NC}"
    echo "다음 명령어로 설치하세요: cd backend && npm install"
fi

# 프론트엔드 의존성 확인
echo -e "${YELLOW}📦 프론트엔드 의존성 확인...${NC}"
cd ../frontend
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ 프론트엔드 의존성 설치됨${NC}"
else
    echo -e "${RED}❌ 프론트엔드 의존성 문제${NC}"
    echo "다음 명령어로 설치하세요: cd frontend && npm install"
fi

# 설정 파일 확인
echo -e "${YELLOW}🔧 설정 파일 확인...${NC}"
if [ -f "src/config/constants.ts" ]; then
    echo -e "${GREEN}✅ 설정 파일 존재${NC}"
else
    echo -e "${RED}❌ 설정 파일 없음${NC}"
fi

# TypeScript 컴파일 확인
echo -e "${YELLOW}🔍 TypeScript 컴파일 확인...${NC}"
if npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript 컴파일 성공${NC}"
else
    echo -e "${RED}❌ TypeScript 컴파일 에러${NC}"
    echo "상세 에러 확인: npx tsc --noEmit"
fi

cd ..

echo "================================================"
echo -e "${GREEN}🎯 테스트 완료! 다음 단계를 진행하세요:${NC}"
echo ""
echo -e "${YELLOW}1. 백엔드 서버 실행:${NC}"
echo "   cd backend && node server.js"
echo ""
echo -e "${YELLOW}2. 프론트엔드 서버 실행 (새 터미널):${NC}"
echo "   cd frontend && npm run dev"
echo ""
echo -e "${YELLOW}3. 브라우저에서 접속:${NC}"
echo "   http://localhost:3000"
echo ""
echo -e "${YELLOW}4. 로그인 정보:${NC}"
echo "   사용자명: admin"
echo "   비밀번호: admin"
echo ""
echo -e "${YELLOW}5. 테스트 가이드 참고:${NC}"
echo "   TEST_GUIDE.md 파일을 확인하세요"
echo ""
echo "================================================"