# 🎉 Leave Management V3 - UI 현대화 완성

## 🚀 Python Flask → Node.js Express + React 전환 완료!

모든 문제가 해결된 최종 완성 버전입니다.

## ⚡ 빠른 시작

### 🪟 Windows
```cmd
start.bat
```

### 🐧 Linux/WSL/macOS
```bash
./start-simple.sh
```

### 📋 준비사항
- **Node.js** (v16+) 설치
- **MongoDB** 실행 중 (localhost:27017)

### 🌐 접속 정보
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5444/api
- **로그인**: admin / admin

## 🎯 주요 기능

### 💼 급여 관리
- **AG Grid**: Excel같은 테이블 편집 경험
- **인센티브 계산**: 사용자별 공식 기반 자동 계산  
- **상여금/포상금**: 실시간 추가 및 월별 합계
- **매출 데이터**: 인센티브 자동 반영

### 🏖️ 휴가 관리
- 휴가 신청 및 승인 시스템
- 잔여 휴가 자동 계산
- 매니저/관리자 승인 워크플로우

### 👥 사용자 관리
- 역할 기반 접근 제어 (admin/manager/user)
- 사용자 생성/수정/비활성화
- 비밀번호 관리

## 👤 샘플 계정

| 계정 | 비밀번호 | 역할 | 권한 |
|------|----------|------|------|
| admin | admin | 관리자 | 모든 기능 |
| shin | password123 | 사용자 | 개인 데이터만 |
| jung | password123 | 사용자 | 개인 데이터만 |
| oh | password123 | 매니저 | 부서 관리 |
| kim | password123 | 사용자 | 개인 데이터만 |

## 🏗️ 기술 스택

### Frontend
- **React 19** + **TypeScript** - 최신 리액트
- **Material-UI** - 구글 머티리얼 디자인
- **AG Grid Community** - 엔터프라이즈급 데이터 그리드
- **Vite** - 빠른 빌드 도구

### Backend
- **Node.js** + **Express** - RESTful API 서버
- **MongoDB** - NoSQL 데이터베이스
- **bcryptjs** - 비밀번호 암호화
- **express-session** - 세션 기반 인증

## 📊 환경 설정

### 개발 환경
- MongoDB: `mongodb://localhost:27017`
- Database: `SM_nomu`

### 배포 환경
- MongoDB: `mongodb://192.168.0.30:27017`
- Database: `SM_nomu`

## 🔧 문제 해결

### MongoDB 연결 안됨
```bash
# Windows
net start MongoDB

# Linux/macOS
sudo systemctl start mongod
```

### 포트 사용 중
```bash
# 프로세스 확인 및 종료
netstat -ano | findstr :5444  # Windows
lsof -i :5444                 # Linux/macOS
```

### 수동 실행
```bash
# 백엔드 시작
cd backend
node server.js

# 프론트엔드 시작 (새 터미널)
cd frontend
npx vite
```

## 📁 프로젝트 구조

```
leave_management_v3/
├── 🚀 start-simple.sh        # Linux/WSL/macOS 실행 스크립트
├── 🪟 start.bat              # Windows 실행 스크립트
├── 🔧 .env                   # 환경 설정
├── 📝 .gitignore             # Git 제외 파일
├── 📚 README.md              # 이 문서
├── 🗄️ backend/               # Node.js Express 백엔드
│   ├── server.js             # MongoDB 서버
│   ├── package.json          # 백엔드 의존성
│   └── node_modules/         # 백엔드 패키지들
└── ⚛️ frontend/              # React 프론트엔드
    ├── src/components/
    │   ├── PayrollGrid.tsx   # AG Grid 급여 테이블
    │   ├── AuthProvider.tsx  # 인증 시스템
    │   └── Layout.tsx        # Material-UI 레이아웃
    ├── src/pages/            # 페이지 컴포넌트들
    ├── package.json          # 프론트엔드 의존성
    └── node_modules/         # 프론트엔드 패키지들
```

## ✨ 개선사항 요약

### Before (기존)
```
❌ Python Flask + SQLite
❌ 복잡한 가상환경 설정
❌ 바이너리 충돌 문제
❌ 서버사이드 템플릿
❌ 제한적인 UI 상호작용
```

### After (현재)
```
✅ Node.js Express + MongoDB
✅ 간단한 npm 설치
✅ 안정적인 NoSQL DB
✅ 현대적인 React SPA
✅ Excel같은 AG Grid 편집
```

---

🎯 **UI 현대화 완료! 이제 바로 사용 가능한 완성된 시스템입니다!** 🚀