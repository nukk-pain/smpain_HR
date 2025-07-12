# 🏢 HR 관리 시스템 - 통합 인사/급여 관리

## 🚀 Node.js Express + React TypeScript 기반 현대적 HR 시스템

최신 기술 스택으로 구축된 완전한 인사관리 솔루션입니다.

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
- **Node.js** (v18+) 설치
- **MongoDB** 실행 중 (localhost:27017)

### 🌐 접속 정보
- **프론트엔드**: http://localhost:3727
- **백엔드 API**: http://localhost:5445/api
- **기본 계정**: admin / admin

## 🎯 주요 기능

### 💼 급여 관리
- **AG Grid**: Excel같은 테이블 편집 경험
- **인센티브 계산**: 사용자별 공식 기반 자동 계산  
- **상여금/포상금**: 실시간 추가 및 월별 합계
- **매출 데이터**: 인센티브 자동 반영

### 🏖️ 휴가 관리
- **휴가 신청/승인**: 연차, 병가, 개인휴가, 경조사 지원
- **자동 계산**: 근속연수 기반 연차 할당 (1년차 11일, 2년차+ 15일+α)
- **캘린더 뷰**: 월별 팀 휴가 현황 시각화
- **팀 현황**: 부서별 휴가 통계 및 분석
- **승인 워크플로우**: 매니저→관리자 단계별 승인

### 👥 사용자 관리
- **권한 시스템**: 세분화된 권한 관리 (users, leave, payroll, reports 등)
- **부서 관리**: 조직도 및 부서별 직원 관리
- **직책 관리**: 직책별 권한 및 역할 정의
- **사용자 생성/수정**: 계정 관리 및 비밀번호 재설정

### 📊 대시보드 & 분석
- **통합 대시보드**: 관리자용 시스템 전체 현황
- **개인 대시보드**: 개인별 휴가/급여 정보
- **시스템 상태**: 서버 성능 및 데이터베이스 모니터링
- **실시간 알림**: 시스템 상태 및 중요 이벤트 알림

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
- **React 19** + **TypeScript** - 최신 리액트 with 타입 안전성
- **Material-UI v7** - 구글 머티리얼 디자인 시스템
- **AG Grid Community** - 엔터프라이즈급 데이터 그리드
- **Vite 7** - 초고속 빌드 및 HMR
- **date-fns** - 날짜 처리 라이브러리
- **Recharts** - 차트 및 데이터 시각화

### Backend
- **Node.js 18+** + **Express** - 모듈화된 RESTful API
- **MongoDB** - NoSQL 데이터베이스 with 인덱싱
- **bcryptjs** - 보안 강화된 비밀번호 암호화
- **express-session** - 세션 기반 인증 시스템
- **multer** - 파일 업로드 처리
- **joi** - API 입력값 검증

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
netstat -ano | findstr :5445  # Windows (Backend)
netstat -ano | findstr :3727  # Windows (Frontend)
lsof -i :5445                 # Linux/macOS (Backend)
lsof -i :3727                 # Linux/macOS (Frontend)
```

### 수동 실행
```bash
# 백엔드 시작
cd backend
npm start  # 또는 node server.js

# 프론트엔드 시작 (새 터미널)
cd frontend
npm run dev  # 개발 서버
npm run build  # 프로덕션 빌드
```

## 📁 프로젝트 구조

```
HR/  (leave_management_v3 → HR로 리브랜딩)
├── 🚀 start-simple.sh        # Linux/WSL/macOS 실행 스크립트
├── 🪟 start.bat              # Windows 실행 스크립트
├── 📚 README.md              # 이 문서
├── 📚 README2.md             # 시놀로지 배포 가이드
├── 📚 CLAUDE.md              # 개발 가이드 및 아키텍처
├── 🗄️ backend/               # Node.js Express 백엔드
│   ├── server.js             # 메인 서버 (257줄, 모듈화됨)
│   ├── routes/               # API 라우트 모듈
│   │   ├── auth.js           # 인증 API
│   │   ├── users.js          # 사용자 관리 API
│   │   └── leave.js          # 휴가 관리 API
│   ├── middleware/           # 미들웨어
│   │   └── errorHandler.js   # 에러 처리
│   └── package.json          # hr-backend 의존성
└── ⚛️ frontend/              # React TypeScript 프론트엔드
    ├── src/
    │   ├── components/       # 재사용 컴포넌트
    │   │   ├── AuthProvider.tsx     # 인증 컨텍스트
    │   │   ├── Layout.tsx           # 메인 레이아웃
    │   │   ├── UnifiedDashboard.tsx # 관리자 대시보드
    │   │   ├── LeaveCalendar.tsx    # 휴가 캘린더
    │   │   ├── TeamLeaveStatus.tsx  # 팀 휴가 현황
    │   │   └── DepartmentManagement.tsx # 부서 관리
    │   ├── pages/            # 페이지 컴포넌트
    │   ├── services/         # API 서비스
    │   ├── types/            # TypeScript 타입 정의
    │   ├── config/           # 설정 상수
    │   └── utils/            # 유틸리티 함수
    ├── vite.config.ts        # Vite 설정 (포트: 3727)
    └── package.json          # hr-frontend 의존성
```

## 🚀 최신 업데이트 (v1.0.0)

### ✅ 완료된 주요 개선사항

#### 🏗️ 아키텍처 현대화
- **모듈화**: 5,155줄 단일 파일 → 257줄 모듈화된 서버
- **타입 안전성**: JavaScript → TypeScript 전환
- **빌드 시스템**: TypeScript 컴파일 최적화
- **포트 변경**: 백엔드 5445, 프론트엔드 3727

#### 🎨 UI/UX 개선
- **Material-UI v7**: 최신 디자인 시스템 적용
- **반응형 디자인**: 모바일/태블릿 최적화
- **다크모드 지원**: 사용자 환경 설정
- **접근성**: WCAG 2.1 가이드라인 준수

#### 🔐 보안 강화
- **세션 관리**: 안전한 세션 기반 인증
- **권한 시스템**: 세분화된 역할 기반 접근 제어
- **입력 검증**: joi 라이브러리 기반 API 검증
- **에러 처리**: 구조화된 에러 핸들링

#### 📊 새로운 기능
- **통합 대시보드**: 실시간 시스템 상태 모니터링
- **부서 관리**: 조직도 및 직책 관리
- **휴가 캘린더**: 시각적 휴가 현황 관리
- **팀 현황**: 부서별 휴가 통계 및 분석

### 🔧 개발자 경험 개선
- **타입 안전성**: 전체 프로젝트 TypeScript 적용
- **코드 품질**: ESLint + Prettier 설정
- **빌드 최적화**: Vite 7 + Terser 적용
- **개발 도구**: 소스맵 및 HMR 지원

---

🎯 **프로덕션 준비 완료! 엔터프라이즈급 HR 관리 시스템** 🚀

> **프로젝트 리브랜딩**: `leave_management_v3` → `HR` 시스템으로 확장
> 
> **최신 커밋**: TypeScript 빌드 오류 수정 및 의존성 업데이트 완료