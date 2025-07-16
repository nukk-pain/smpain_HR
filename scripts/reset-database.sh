#!/bin/bash

# HR 시스템 데이터베이스 초기화 스크립트
# 실행 방법: ./scripts/reset-database.sh

echo "🗄️ HR 시스템 데이터베이스 초기화 시작..."
echo "⚠️ 이 작업은 기존 데이터를 모두 삭제합니다!"
echo ""

# 확인 메시지
read -p "정말로 데이터베이스를 초기화하시겠습니까? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "❌ 초기화가 취소되었습니다."
    exit 1
fi

echo ""
echo "🔄 MongoDB에 연결하여 초기화 실행 중..."

# MongoDB 스크립트 실행
mongo SM_nomu ./scripts/reset-database.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 데이터베이스 초기화 완료!"
    echo "🔑 기본 로그인: admin / admin"
    echo "🌐 접속: http://localhost:3727"
else
    echo ""
    echo "❌ 초기화 중 오류가 발생했습니다."
    echo "💡 MongoDB가 실행 중인지 확인해주세요."
fi