# 1단계: MongoDB Atlas 개발 환경 설정 계획

## 개요
개발 단계의 프로젝트를 MongoDB Atlas로 전환합니다. 현재 데이터가 없는 상태이므로 새로운 Atlas 환경을 설정하고 개발을 진행합니다.

## 사전 준비 사항

### 1. 프로젝트 환경 확인
- [ ] 현재 MongoDB 버전 확인
- [ ] 필요한 컬렉션 구조 문서화
- [ ] 현재 연결 설정 확인

### 2. MongoDB Atlas 계정 설정
- [ ] MongoDB Atlas 계정 생성
- [ ] 조직(Organization) 생성
- [ ] 프로젝트 생성: "HR-Management-Dev" (개발용)
- [ ] 프로젝트 생성: "HR-Management-Prod" (향후 운영용)

## Atlas 클러스터 설정

### 1. 클러스터 생성
```
클러스터 사양:
- Tier: M0 (무료 티어로 시작)
- Provider: Google Cloud Platform
- Region: asia-northeast3 (서울)
- Cluster Name: hr-cluster-dev
```

### 2. 보안 설정
#### 데이터베이스 사용자 생성
```
개발용 임시 설정:
Username: hr_app_user
Password: HrDev2025Temp!
권한: readWrite@SM_nomu

⚠️ 주의: 운영 배포 시 반드시 변경 필요
```

#### 네트워크 접근 설정
- 개발 단계: 0.0.0.0/0 (모든 IP 허용)
- 운영 배포 시: Cloud Run 아웃바운드 IP만 허용하도록 변경

### 3. 연결 문자열 획득
```
개발용:
mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.xxxxx.mongodb.net/SM_nomu?retryWrites=true&w=majority
```

## 초기 데이터베이스 설정

### 1. 데이터베이스 및 컬렉션 생성
개발 단계이므로 데이터 마이그레이션은 필요 없습니다. Atlas에서 자동으로 데이터베이스와 컬렉션이 생성됩니다.

### 2. 초기 데이터 설정 (선택사항)
```bash
# 개발용 초기 데이터가 필요한 경우
node scripts/resetDatabase.js
```

### 3. 인덱스 생성
```javascript
// 필수 인덱스 목록
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ employeeId: 1 }, { unique: true })
db.leave_requests.createIndex({ userId: 1, createdAt: -1 })
db.leave_requests.createIndex({ status: 1, approvedBy: 1 })
db.payroll.createIndex({ userId: 1, month: 1, year: 1 })
db.sessions.createIndex({ expires: 1 }, { expireAfterSeconds: 0 })
```

## 코드 변경 사항

### 1. 환경 변수 업데이트
```bash
# .env.development
MONGODB_URI=mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.xxxxx.mongodb.net/SM_nomu?retryWrites=true&w=majority

# .env.production (운영 배포 시 설정)
# MONGODB_URI는 운영 배포 단계에서 안전한 비밀번호로 설정
```

### 2. 연결 코드 수정 (backend/models/index.js)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Atlas는 replica set이 기본 제공되므로 추가 옵션 불필요
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Atlas 권장 설정
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB Atlas connection error:', error);
    process.exit(1);
  }
};
```

### 3. 세션 저장소 설정 업데이트
```javascript
// backend/config/session.js
const MongoStore = require('connect-mongo');

const sessionConfig = {
  // ... 기존 설정
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    touchAfter: 24 * 3600, // lazy session update
    crypto: {
      secret: process.env.SESSION_SECRET
    }
  })
};
```

## 테스트 계획

### 1. 연결 테스트
```bash
# MongoDB 연결 테스트 스크립트
node scripts/testAtlasConnection.js
```

### 2. 성능 테스트
- [ ] 읽기 작업 응답 시간 측정
- [ ] 쓰기 작업 응답 시간 측정
- [ ] 동시 접속 테스트
- [ ] 대용량 데이터 조회 테스트

### 3. 기능 테스트
- [ ] 로그인/로그아웃 정상 작동
- [ ] 휴가 신청/조회 기능
- [ ] 급여 데이터 조회
- [ ] 엑셀 업로드/다운로드
- [ ] 세션 유지 확인

## 롤백 계획

### 즉시 롤백 (문제 발생 시)
1. 환경 변수를 원래 로컬 MongoDB로 복원
2. 서비스 재시작
3. 문제 분석 및 해결

개발 단계이므로 데이터 손실에 대한 우려는 없습니다.

## 모니터링 설정

### 1. Atlas 모니터링 대시보드 설정
- [ ] 알림 설정 (연결 실패, 높은 사용률)
- [ ] 성능 메트릭 기준선 설정
- [ ] 백업 스케줄 설정 (매일 자동 백업)

### 2. 애플리케이션 로깅 강화
```javascript
// 연결 상태 모니터링
mongoose.connection.on('connected', () => {
  console.log('MongoDB Atlas connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB Atlas error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB Atlas disconnected');
});
```

## 일정

### Day 1: Atlas 설정 및 연결
- Atlas 계정 및 클러스터 생성
- 임시 비밀번호로 사용자 생성
- 개발 환경 연결 테스트
- 환경 변수 업데이트
- 연결 코드 수정

### Day 2: 개발 환경 검증
- 모든 기능 테스트
- 성능 확인
- 문서화

## 운영 배포 시 추가 단계

### 보안 강화
1. **새로운 강력한 비밀번호 생성**
   - 최소 16자 이상
   - 대소문자, 숫자, 특수문자 포함
   - 안전한 비밀번호 관리 도구 사용

2. **프로덕션 클러스터 생성**
   - 별도의 프로덕션 환경 구성
   - M10 이상 티어 검토

3. **네트워크 보안 설정**
   - IP 화이트리스트를 Cloud Run IP로 제한
   - VPC Peering 검토

4. **환경 변수 보안**
   - Google Secret Manager 사용
   - 환경별 비밀번호 분리

## 체크리스트

### 개발 환경 설정
- [ ] Atlas 클러스터 생성 및 설정
- [ ] 임시 비밀번호로 사용자 생성
- [ ] 연결 테스트 완료
- [ ] 환경 변수 업데이트

### 개발 환경 검증
- [ ] 인덱스 생성 확인
- [ ] 기능 테스트 통과
- [ ] 성능 확인

### 마이그레이션 후
- [ ] 모든 기능 정상 작동 확인
- [ ] 모니터링 알림 설정
- [ ] 백업 스케줄 설정
- [ ] 문서 업데이트 완료

## 예상 문제 및 해결 방안

### 1. 네트워크 레이턴시
- **문제**: 로컬 대비 응답 시간 증가
- **해결**: 
  - 연결 풀 크기 최적화
  - 쿼리 최적화
  - 인덱스 추가

### 2. 연결 제한
- **문제**: M0 티어의 연결 수 제한 (100개)
- **해결**: 
  - 연결 풀 설정 조정
  - 필요시 M10 티어로 업그레이드

### 3. 인증 문제
- **문제**: SCRAM 인증 실패
- **해결**: 
  - 사용자 권한 재확인
  - 연결 문자열 검증
  - IP 화이트리스트 확인

## 성공 기준
- ✓ Atlas 연결이 안정적으로 유지됨
- ✓ 모든 개발 기능이 정상 작동함
- ✓ 응답 시간이 개발에 지장 없는 수준
- ✓ 운영 배포를 위한 보안 강화 계획 수립됨