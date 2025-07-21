#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 ChatGPT Codex 환경 설정 스크립트 시작...${NC}"
echo "================================================"

# 1. Docker를 이용한 MongoDB 설치 및 실행
echo -e "${YELLOW}🐳 Docker를 사용하여 MongoDB (Codex용)를 설정합니다...${NC}"
if [ ! "$(docker ps -q -f name=mongodb_codex)" ]; then
    if [ "$(docker ps -aq -f status=exited -f name=mongodb_codex)" ]; then
        echo "기존에 중지된 'mongodb_codex' 컨테이너를 다시 시작합니다."
        docker start mongodb_codex
    else
        echo "'mongodb_codex' 컨테이너를 새로 생성하고 실행합니다."
        docker run -d --name mongodb_codex -p 27018:27017 -v ~/mongodb_codex_data:/data/db mongo
    fi
else
    echo "'mongodb_codex' 컨테이너가 이미 실행 중입니다."
fi
echo -e "${GREEN}✅ MongoDB 준비 완료 (포트: 27018)${NC}"
echo "------------------------------------------------"

# 2. 백엔드 설정
echo -e "${YELLOW}⚙️  백엔드 서버 의존성을 설치합니다...${NC}"
cd backend
if [ -d "node_modules" ]; then
    echo "이미 node_modules가 존재하여 'npm install'을 건너뜁니다."
else
    npm install
fi
echo -e "${GREEN}✅ 백엔드 설정 완료${NC}"
echo "------------------------------------------------"

# 3. 프론트엔드 설정
echo -e "${YELLOW}⚛️  프론트엔드 서버 의존성을 설치합니다...${NC}"
cd ../frontend
if [ -d "node_modules" ]; then
    echo "이미 node_modules가 존재하여 'npm install'을 건너뜁니다."
else
    npm install
fi
echo -e "${GREEN}✅ 프론트엔드 설정 완료${NC}"
echo "------------------------------------------------"

# 4. 데이터베이스 초기화 (선택적)
cd ..
if [ -f "scripts/reset-database.sh" ]; then
    read -p "데이터베이스를 초기화하시겠습니까? (y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo -e "${YELLOW}🗄️  데이터베이스를 초기화합니다...${NC}"
        ./scripts/reset-database.sh
    else
        echo "데이터베이스 초기화를 건너뜁니다."
    fi
    echo "------------------------------------------------"
fi


# 5. 서버 실행
echo -e "${YELLOW}🚀 서버를 실행합니다...${NC}"

# 백엔드 서버 실행
echo "백엔드 서버를 백그라운드에서 실행합니다."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 프론트엔드 서버 실행
echo "프론트엔드 개발 서버를 실행합니다."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}✅ 모든 서버가 성공적으로 실행되었습니다!${NC}"
echo "================================================"
echo -e "🔗 ${YELLOW}프론트엔드 접속 주소:${NC} http://localhost:3727"
echo -e "🔗 ${YELLOW}백엔드 API 주소:${NC} http://localhost:5455/api"
echo -e "🔗 ${YELLOW}MongoDB 접속 주소:${NC} mongodb://localhost:27018"
echo ""
echo -e "${RED}중지하려면 Ctrl + C 를 누르세요.${NC}"

# 자식 프로세스들이 종료될 때까지 대기
wait $BACKEND_PID
wait $FRONTEND_PID
