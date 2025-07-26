# 시놀로지 MongoDB 관리 스크립트

시놀로지 Docker 환경에서 HR 시스템의 MongoDB를 관리하기 위한 스크립트입니다.

## 📋 스크립트 목록

### 1. `checkDatabase.js`
데이터베이스 상태를 확인하는 스크립트입니다.

```bash
node scripts/synology/checkDatabase.js
```

**기능:**
- MongoDB 연결 상태 확인
- 컬렉션별 문서 수 확인
- 사용자 통계 (역할별, 활성 상태)
- 휴가 신청 통계
- 부서별 인원 현황
- 최근 활동 내역
- Admin 계정 존재 여부

### 2. `createAdmin.js`
Admin 계정을 생성하거나 비밀번호를 재설정합니다.

```bash
node scripts/synology/createAdmin.js
```

**기능:**
- 새 admin 계정 생성
- 기존 admin 계정 비밀번호 재설정
- 기본 로그인 정보: admin / admin

### 3. `resetDatabase.js`
데이터베이스를 초기 상태로 리셋합니다.

```bash
node scripts/synology/resetDatabase.js
```

**기능:**
- 모든 휴가 데이터 삭제
- 모든 급여 데이터 삭제
- admin을 제외한 모든 사용자 삭제
- admin 비밀번호를 'admin'으로 재설정
- 부서, 직급 데이터 삭제

⚠️ **주의**: 이 스크립트는 모든 데이터를 삭제합니다!

## 🔧 연결 설정

모든 스크립트는 다음 연결 정보를 사용합니다:

```javascript
// 시놀로지 Docker MongoDB (Direct Primary 연결)
const url = 'mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu';
```

- **호스트**: localhost
- **포트**: 27018 (Primary 노드로 직접 연결)
- **연결 방식**: Direct (단일 노드 연결)
- **사용자**: hr_app_user
- **비밀번호**: Hr2025Secure
- **데이터베이스**: SM_nomu

> **참고**: Replica Set은 Docker 내부에서 작동하지만, 외부 클라이언트는 Primary 노드(27018)로만 연결합니다.

## 🚨 문제 해결

### 연결 오류가 발생하는 경우

1. **Docker 컨테이너 확인**
   ```bash
   docker ps | grep mongo-hr
   ```

2. **포트 확인**
   ```bash
   netstat -an | grep 27018
   ```

3. **Docker 로그 확인**
   ```bash
   docker logs mongo-hr
   ```

4. **방화벽 설정**
   - 시놀로지 DSM → 제어판 → 보안 → 방화벽
   - 포트 27018 허용 확인

### Replica Set 상태 확인

현재 모든 스크립트는 Primary 노드로 직접 연결합니다:

```bash
# Replica Set 상태 확인
docker exec mongo-hr-primary mongosh --eval "rs.status()"

# 노드별 상태 확인
docker ps | grep mongo-hr
```

## 📝 사용 예시

### 1. 초기 설정
```bash
# 1. 데이터베이스 상태 확인
node scripts/synology/checkDatabase.js

# 2. Admin 계정 생성
node scripts/synology/createAdmin.js

# 3. 시스템 사용 시작
```

### 2. 문제 발생 시 초기화
```bash
# 1. 백업 권장 (선택사항)
docker exec mongo-hr mongodump --out /tmp/backup

# 2. 데이터베이스 초기화
node scripts/synology/resetDatabase.js

# 3. 상태 확인
node scripts/synology/checkDatabase.js
```

## 🔒 보안 주의사항

1. 이 스크립트들은 관리자만 실행해야 합니다
2. 프로덕션 환경에서는 신중하게 사용하세요
3. 중요한 작업 전에는 반드시 백업을 수행하세요
4. 인증 정보는 환경 변수로 관리하는 것을 권장합니다

## 📚 관련 문서

- [MongoDB 설정 가이드](../docs/setup/MONGODB_SETUP.md)
- [배포 가이드](../docs/setup/DEPLOYMENT.md)