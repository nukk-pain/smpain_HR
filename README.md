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
- **MongoDB** 실행 중 (localhost:27017, 인증 없음)
- **PM2** (프로덕션 배포시): `npm install -g pm2`
- **serve** (프론트엔드 정적 배포): `npm install -g serve`

### 🌐 접속 정보
- **프론트엔드**: http://localhost:3727
- **백엔드 API**: http://localhost:5455/api
- **기본 계정**: admin / admin

### 🐳 PM2로 실행 (프로덕션)
```bash
# PM2 ecosystem 파일로 실행
pm2 start ecosystem.config.js

# 로그 확인
pm2 logs

# 상태 확인
pm2 status

# 중지
pm2 stop ecosystem.config.js
```

## 🎯 주요 기능

### 💼 급여 관리
- **AG Grid**: Excel같은 테이블 편집 경험
- **인센티브 계산**: 사용자별 공식 기반 자동 계산  
- **상여금/포상금**: 실시간 추가 및 월별 합계
- **매출 데이터**: 인센티브 자동 반영

### 🏖️ 휴가 관리 ⭐ **NEW**
- **휴가 신청/승인**: 연차, 병가, 개인휴가, 경조사 지원
- **한국 근로기준법 준수**: 입사월 기준 정확한 연차 계산 (1개월 개근 시 1일)
- **전체 직원 달력**: 모든 직원의 휴가 현황 통합 뷰
- **관리 모드**: admin/manager용 예외 날짜 설정 기능
- **동시 휴가 제한**: 기본 1명, 예외 날짜는 복수 허용 (2~10명 설정 가능)
- **실시간 캘린더**: 휴가 신청 즉시 달력 반영
- **부서별 필터링**: 특정 부서 휴가 현황만 선별 조회
- **승인 워크플로우**: 매니저→관리자 단계별 승인

### 👥 사용자 관리 ⭐ **UPDATED**
- **역할 기반 접근 제어**: admin(전체 관리) → manager(직원 관리) → user(개인)
- **개인정보 보호**: 사번, 급여 정보는 admin만 조회 가능
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
- MongoDB: `mongodb://localhost:27017` (인증 없음)
- Database: `SM_nomu`
- 백엔드 포트: 5455
- 프론트엔드 포트: 3727

### 프로덕션 환경 (Synology NAS)
- MongoDB: `mongodb://localhost:27017` (인증 없음)
- Database: `SM_nomu`
- 배포 경로: `/volume1/web/HR`
- PM2 ecosystem 사용
- 로그 경로: `/root/.pm2/logs/`

### 환경 변수
```bash
# 프로덕션 환경에서 설정 가능
NODE_ENV=production
PORT=5455
MONGODB_URL=mongodb://localhost:27017
DB_NAME=SM_nomu
SESSION_SECRET=hr-synology-secret-2025
```

## 🗄️ 데이터베이스 관리

### 🔄 데이터베이스 초기화 (admin만 남기기)
```bash
# 방법 1: 빠른 초기화 (추천)
./scripts/quick-reset.sh

# 방법 2: MongoDB 스크립트 파일
mongo SM_nomu scripts/simple-reset.js

# 방법 3: 한 줄 명령어
mongo SM_nomu --eval "
db.leaveRequests.drop();
db.leaveExceptions.drop();
db.leaveAdjustments.drop();
db.monthly_payments.drop();
db.bonuses.drop();
db.sales_data.drop();
db.departments.drop();
db.positions.drop();
db.users.deleteMany({username: {\$ne: 'admin'}});
print('✅ 초기화 완료!');
"
```

### 📊 데이터베이스 상태 확인
```bash
# MongoDB 접속
mongo SM_nomu

# 컬렉션 목록 확인
show collections

# 사용자 목록 확인
db.users.find({}, {username: 1, name: 1, role: 1})

# 휴가 신청 수 확인
db.leaveRequests.countDocuments()
```

### 🔧 문제 해결

#### MongoDB 연결 안됨
```bash
# Windows
net start MongoDB

# Linux/macOS
sudo systemctl start mongod
```

#### 포트 사용 중
```bash
# 프로세스 확인 및 종료
netstat -ano | findstr :5455  # Windows (Backend)
netstat -ano | findstr :3727  # Windows (Frontend)
lsof -i :5455                 # Linux/macOS (Backend)
lsof -i :3727                 # Linux/macOS (Frontend)
```

#### 데이터베이스 권한 문제
```bash
# MongoDB 재시작 (권한 없음 모드)
mongod --noauth

# 또는 기본 설정으로 실행
mongod --config /etc/mongod.conf
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
npx serve -s dist -p 3727  # 프로덕션 정적 서빙
```

### 🚀 프로덕션 배포 (Synology NAS)

#### **전체 배포 절차**
```bash
# Step 1: 준비 및 빌드
cd /mnt/d/my_programs/HR/frontend
npm run build

# Step 2: 프로덕션 서버로 파일 복사 (예: Synology NAS)
# 전체 프로젝트를 /volume1/web/HR/ 경로로 복사

# Step 3: 기존 서비스 중지 (재배포시)
pm2 delete ecosystem.config.js  # 또는 pm2 stop all

# Step 4: PM2로 서비스 시작 ⭐ 핵심!
pm2 start ecosystem.config.js

# Step 5: 부팅시 자동 시작 설정 (최초 1회만)
pm2 startup
pm2 save
```

#### **배포 상태 확인**
```bash
# 서비스 상태 확인
pm2 status

# 실시간 로그 확인
pm2 logs

# 개별 서비스 로그 확인
pm2 logs hr-backend
pm2 logs hr-frontend

# 웹 브라우저 테스트
# http://[서버IP]:3727
```

#### **⚠️ 배포 전 체크리스트**
- [ ] MongoDB 서비스 실행 중 (`mongodb://localhost:27017`)
- [ ] Node.js 18+ 설치됨
- [ ] PM2 글로벌 설치됨 (`npm install -g pm2`)
- [ ] 포트 5455(백엔드), 3727(프론트엔드) 사용 가능
- [ ] `/volume1/web/HR/start-frontend.sh` 파일 존재
- [ ] 프론트엔드 빌드 완료 (`npm run build`)

#### **빠른 재배포 (코드 변경시)**
```bash
# 1단계: 빌드
cd frontend && npm run build

# 2단계: 재시작
pm2 restart ecosystem.config.js

# 또는 개별 재시작
pm2 restart hr-backend
pm2 restart hr-frontend
```

## 📁 프로젝트 구조

```
HR/  (leave_management_v3 → HR로 리브랜딩)
├── 🚀 start-simple.sh        # Linux/WSL/macOS 실행 스크립트
├── 🪟 start.bat              # Windows 실행 스크립트
├── 📚 README.md              # 이 문서
├── 📚 README2.md             # 시놀로지 배포 가이드
├── 📚 CLAUDE.md              # 개발 가이드 및 아키텍처
├── ⚙️ ecosystem.config.js    # PM2 배포 설정
├── 🛠️ scripts/              # 유틸리티 스크립트 ⭐ NEW
│   ├── quick-reset.sh        # 빠른 DB 초기화 (추천)
│   ├── simple-reset.js       # MongoDB 초기화 스크립트
│   └── reset-database.mjs    # Node.js 초기화 스크립트
├── 🗄️ backend/               # Node.js Express 백엔드
│   ├── server.js             # 메인 서버 (257줄, 모듈화됨)
│   ├── routes/               # API 라우트 모듈
│   │   ├── auth.js           # 인증 API
│   │   ├── users.js          # 사용자 관리 API
│   │   ├── leave.js          # 휴가 관리 API (예외 설정 포함) ⭐ UPDATED
│   │   ├── payroll.js        # 급여 관리 API
│   │   ├── departments.js    # 부서 관리 API
│   │   ├── bonus.js          # 상여금 관리 API
│   │   ├── sales.js          # 매출 데이터 API
│   │   ├── upload.js         # 파일 업로드 API
│   │   ├── reports.js        # 보고서 API
│   │   └── admin.js          # 관리자 전용 API
│   ├── middleware/           # 미들웨어
│   │   ├── errorHandler.js   # 에러 처리 및 인증
│   │   ├── security.js       # 보안 헤더
│   │   └── validation.js     # 입력 검증
│   └── package.json          # hr-backend 의존성
└── ⚛️ frontend/              # React TypeScript 프론트엔드
    ├── src/
    │   ├── components/       # 재사용 컴포넌트
    │   │   ├── AuthProvider.tsx        # 인증 컨텍스트
    │   │   ├── Layout.tsx              # 메인 레이아웃
    │   │   ├── UnifiedDashboard.tsx    # 관리자 대시보드
    │   │   ├── UserDashboard.tsx       # 개인 대시보드
    │   │   ├── LeaveCalendar.tsx       # 휴가 캘린더 (관리 모드 포함) ⭐ UPDATED
    │   │   ├── TeamLeaveStatus.tsx     # 팀 휴가 현황
    │   │   ├── UserManagement.tsx      # 사용자 관리
    │   │   └── DepartmentManagement.tsx # 부서 관리
    │   ├── pages/            # 페이지 컴포넌트
    │   │   ├── Dashboard.tsx           # 대시보드 라우터
    │   │   ├── LeaveManagement.tsx     # 휴가 관리 페이지
    │   │   ├── EmployeeLeaveManagement.tsx # 직원 휴가 관리 ⭐ NEW
    │   │   ├── PayrollManagement.tsx   # 급여 관리 페이지
    │   │   └── Login.tsx               # 로그인 페이지
    │   ├── services/         # API 서비스
    │   ├── types/            # TypeScript 타입 정의
    │   ├── config/           # 설정 상수
    │   └── utils/            # 유틸리티 함수
    ├── vite.config.ts        # Vite 설정 (포트: 3727)
    └── package.json          # hr-frontend 의존성
```

## 🚀 최신 업데이트 (v1.1.0) ⭐ **NEW**

### ✅ 완료된 주요 개선사항

#### 🏖️ 휴가 관리 시스템 대폭 개선 (2025-07-16)
- **한국 근로기준법 준수**: 정확한 연차 계산 로직 (입사일 기준 1개월 개근 시 1일)
- **전체 직원 달력 뷰**: 개인/팀 구분 없이 모든 직원 휴가 현황 통합 표시
- **관리 모드**: admin/manager 전용 예외 날짜 설정 기능
- **동시 휴가 제한 완화**: 특정 날짜에 복수 휴가 허용 (연말연시, 특별 행사일 등)
- **실시간 달력 반영**: 휴가 신청 즉시 캘린더에 표시 (대기/승인/거부 상태별)
- **CSS Grid 달력**: 표준 7x6 달력 그리드 뷰로 UI 개선
- **차세대 carry-over 시스템**: 수동 조정 기반으로 전환, 자동 계산 비활성화

#### 👥 사용자 관리 강화
- **역할별 메뉴 분리**: 매니저용 "내 휴가 관리" vs "직원 휴가 관리" 분리
- **개인정보 보호**: 사번, 급여 정보 admin 전용 표시
- **권한 기반 UI**: 역할에 따른 동적 메뉴 및 기능 제한

#### 🏗️ 아키텍처 현대화 (기존)
- **모듈화**: 5,155줄 단일 파일 → 257줄 모듈화된 서버
- **타입 안전성**: JavaScript → TypeScript 전환
- **빌드 시스템**: TypeScript 컴파일 최적화
- **포트 변경**: 백엔드 5455, 프론트엔드 3727
- **PM2 배포**: ecosystem.config.js로 프로덕션 배포 자동화
- **MongoDB 최적화**: 인증 없는 로컬 연결로 단순화

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

## 🗄️ 데이터베이스 구조

### MongoDB 컬렉션 (SM_nomu)
- **`users`**: 사용자 계정 및 권한 정보
- **`leaveRequests`**: 휴가 신청 및 승인 데이터
- **`leaveExceptions`**: ⭐ **NEW** 예외 날짜 설정 (복수 휴가 허용)
- **`leaveAdjustments`**: 연차 수동 조정 기록
- **`monthly_payments`**: 급여 데이터
- **`bonuses`**: 상여금/포상금 기록
- **`sales_data`**: 매출 데이터 (인센티브 계산용)
- **`departments`**: 부서 정보
- **`positions`**: 직책 정보

### 새로운 leaveExceptions 컬렉션
```javascript
{
  _id: ObjectId,
  date: "2024-12-25",           // YYYY-MM-DD 형식
  maxConcurrentLeaves: 3,       // 동시 허용 휴가자 수
  reason: "크리스마스",         // 설정 사유
  createdBy: ObjectId,          // 설정한 관리자
  createdAt: Date,
  updatedAt: Date
}
```

---

🎯 **프로덕션 준비 완료! 엔터프라이즈급 HR 관리 시스템** 🚀

> **프로젝트 리브랜딩**: `leave_management_v3` → `HR` 시스템으로 확장
> 
> **최신 커밋**: v1.1.0 - 휴가 관리 시스템 대폭 개선 및 관리 모드 추가