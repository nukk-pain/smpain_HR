# MongoDB Atlas to Local Docker Migration Guide

## 개요
MongoDB Atlas에서 로컬 Docker MongoDB로 데이터를 복사하는 방법을 정리합니다. 이를 통해 개발 환경을 프로덕션과 유사하게 구성할 수 있습니다.

## 방법 비교

### 방법 1: MongoDB Compass Export/Import (소량 데이터 추천) ⭐
**장점:**
- GUI 기반으로 매우 직관적이고 쉬움
- JSON/CSV 형식 지원
- 데이터 미리보기 가능
- 설치만 하면 바로 사용 가능
- 컬렉션별 선택적 마이그레이션 용이

**단점:**
- 대용량 데이터(1GB 이상)에 비효율적
- 인덱스 별도 생성 필요
- 일부 데이터 타입 변환 문제 가능

### 방법 2: mongodump/mongorestore (대량 데이터 추천)
**장점:**
- MongoDB 공식 도구로 안정적
- 모든 데이터 타입과 인덱스 보존
- 선택적 컬렉션 백업 가능
- 압축 지원으로 전송 속도 향상

**단점:**
- 커맨드라인 기반
- MongoDB Tools 별도 설치 필요

### 방법 3: Direct Connection Copy (mongomirror)
**장점:**
- 실시간 동기화 가능
- 다운타임 없음

**단점:**
- 설정이 복잡
- 네트워크 의존성 높음

## 방법 1: MongoDB Compass GUI 사용 (소량 데이터에 최적)

### 1단계: MongoDB Compass 설치
1. [MongoDB Compass 다운로드 페이지](https://www.mongodb.com/try/download/compass) 방문
2. OS에 맞는 버전 다운로드 및 설치
3. 설치 완료 후 실행

### 2단계: 로컬 Docker MongoDB 준비

#### Docker MongoDB 설정
```bash
# docker-compose.yml 생성
cat << 'EOF' > docker-compose.mongodb.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: hr-mongodb-local
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your_secure_password
      MONGO_INITDB_DATABASE: SM_nomu
    volumes:
      - mongodb_data:/data/db
      - ./mongodb-backup:/backup
    networks:
      - hr-network

volumes:
  mongodb_data:

networks:
  hr-network:
    driver: bridge
EOF

# MongoDB 컨테이너 시작
docker-compose -f docker-compose.mongodb.yml up -d

# 컨테이너 실행 확인
docker ps | grep hr-mongodb-local
```

### 3단계: MongoDB Compass에서 Atlas 연결

1. **Compass 실행 후 새 연결 생성**
   - "New Connection" 클릭
   
2. **Atlas Connection String 입력**
   ```
   mongodb+srv://username:password@cluster.mongodb.net/SM_nomu
   ```
   - 실제 username, password, cluster 정보로 교체
   - "Connect" 버튼 클릭

3. **연결 성공 확인**
   - 왼쪽 패널에 데이터베이스 목록 표시
   - SM_nomu 데이터베이스 클릭하여 컬렉션 확인

### 4단계: Atlas에서 데이터 Export

#### 최신 MongoDB Compass Export 방법 (2024)

1. **컬렉션 선택**
   - 왼쪽 패널에서 SM_nomu 데이터베이스 확장
   - Export할 컬렉션 클릭하여 상세 뷰로 이동

2. **Export 실행 (두 가지 방법)**
   
   **방법 A: 쿼리 바 우클릭 (권장)**
   - 컬렉션 뷰 상단의 쿼리 바(Query Bar) 또는 주변 빈 공간에서 **우클릭**
   - 드롭다운 메뉴에서 **"Export full collection..."** 선택
   - 필터를 적용했다면 **"Export query results..."** 선택
   
   **방법 B: 메뉴 버튼 사용**
   - 컬렉션 뷰에서 Export 버튼 찾기
   - 일부 버전에서는 "ADD DATA" 버튼 옆에 있을 수 있음

3. **Export 설정**
   - **Export File Type**: JSON (추천)
     - CSV는 타입 정보 손실 가능
   - **Field Selection**:
     - "All Fields" 선택 (모든 필드 포함)
     - 또는 "Select fields in table"로 필드 선택
   - **Export Options**:
     - ✅ Export with full extended JSON types (데이터 타입 보존)
   - **File Path**: 원하는 위치 선택 (예: `./mongodb-exports/users.json`)
   - "Export" 클릭

4. **필드 누락 문제 해결**
   - Compass가 일부 필드를 자동 감지 못하는 경우가 있음
   - Export 다이얼로그에서 **"Add Field"** 버튼으로 수동 추가
   - 또는 Query Bar의 Project 필드 사용하여 명시적 지정

5. **모든 컬렉션 반복**
   ```
   필수 컬렉션 목록:
   - users
   - leave_requests
   - leave_balances
   - departments
   - payroll
   - payroll_settings (있는 경우)
   ```

### ⚠️ Export 버튼이 안 보이는 경우

최신 MongoDB Compass에서는 Export 메뉴 위치가 변경되었습니다:

1. **쿼리 바 우클릭이 가장 확실한 방법**
   - 컬렉션 문서 목록 위의 Filter 입력창 영역에서 우클릭
   - "Export full collection..." 메뉴 선택

2. **대안: mongoexport 명령 사용**
   ```bash
   # WSL 또는 터미널에서 실행
   mongoexport --uri="mongodb+srv://username:password@cluster.mongodb.net/SM_nomu" \
     --collection=users \
     --out=users.json \
     --jsonArray
   ```

### 5단계: 로컬 Docker MongoDB 연결

1. **Compass에서 새 연결 추가**
   - "New Connection" 클릭
   
2. **로컬 Docker Connection String 입력**
   ```
   mongodb://admin:your_secure_password@localhost:27017/?authSource=admin
   ```
   
3. **연결 후 데이터베이스 생성**
   - 왼쪽 패널에서 "Create Database" 클릭
   - Database Name: `SM_nomu`
   - Collection Name: `temp` (임시, 나중에 삭제)
   - "Create Database" 클릭

### 6단계: 로컬 MongoDB로 데이터 Import

1. **각 컬렉션 Import**
   - SM_nomu 데이터베이스 선택
   - "Create Collection" 또는 기존 컬렉션 선택
   
2. **Import 실행**
   - 컬렉션 클릭 후 "Add Data" → "Import File" 선택
   - 또는 상단 메뉴 "Collection" → "Import Data"
   
3. **Import 설정**
   - 이전에 export한 JSON 파일 선택
   - **Import Options**:
     - Input File Type: JSON
     - ✅ Stop on errors (에러 시 중단)
   - "Import" 클릭

4. **데이터 검증**
   - Documents 탭에서 데이터 확인
   - 우측 상단 document count 확인
   - 몇 개 문서를 열어 필드 확인

### 7단계: 인덱스 재생성 (중요!)

Compass는 인덱스를 자동으로 복사하지 않으므로 수동 생성 필요:

1. **Atlas에서 인덱스 확인**
   - Atlas 연결에서 각 컬렉션의 "Indexes" 탭 확인
   - 인덱스 정보 메모 또는 스크린샷

2. **로컬 MongoDB에 인덱스 생성**
   - 로컬 연결에서 해당 컬렉션의 "Indexes" 탭
   - "Create Index" 클릭
   - Atlas와 동일한 필드와 옵션 설정
   
   **주요 인덱스 예시:**
   ```javascript
   // users 컬렉션
   { email: 1 } - unique: true
   { employeeId: 1 } - unique: true
   
   // leave_requests 컬렉션
   { userId: 1, status: 1 }
   { createdAt: -1 }
   
   // payroll 컬렉션
   { userId: 1, month: 1, year: 1 }
   ```

### 8단계: 애플리케이션 연결 테스트

```bash
# .env.development 수정
MONGODB_URI=mongodb://admin:your_secure_password@localhost:27017/SM_nomu?authSource=admin

# 백엔드 재시작
cd backend
npm run dev

# 연결 확인
```

## 방법 2: mongodump/mongorestore (대량 데이터용)

### 사전 준비

#### MongoDB Tools 설치 (로컬에 필요)
```bash
# Ubuntu/WSL
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-database-tools

# macOS
brew tap mongodb/brew
brew install mongodb-database-tools

# Windows
# MongoDB Database Tools 다운로드: https://www.mongodb.com/try/download/database-tools
```

#### 백업 실행
```bash
# 백업 디렉토리 생성
mkdir -p ./mongodb-backup

# Atlas에서 백업 (URI는 환경변수로 관리)
export ATLAS_URI="mongodb+srv://username:password@cluster.mongodb.net/SM_nomu"

# 전체 데이터베이스 백업
mongodump --uri="$ATLAS_URI" \
  --out=./mongodb-backup \
  --gzip

# 특정 컬렉션만 백업 (옵션)
mongodump --uri="$ATLAS_URI" \
  --collection=users \
  --out=./mongodb-backup \
  --gzip
```

### 3. 로컬 Docker MongoDB로 복원

```bash
# Docker 컨테이너 내부에서 복원
docker exec -it hr-mongodb-local bash

# 컨테이너 내부에서 실행
mongorestore --host localhost:27017 \
  --username admin \
  --password your_secure_password \
  --authenticationDatabase admin \
  --db SM_nomu \
  --gzip \
  /backup/SM_nomu

# 또는 호스트에서 직접 실행
mongorestore --host localhost:27017 \
  --username admin \
  --password your_secure_password \
  --authenticationDatabase admin \
  --db SM_nomu \
  --gzip \
  ./mongodb-backup/SM_nomu
```

### 4. 환경 변수 설정

#### .env.development 업데이트
```env
# Atlas (기존)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/SM_nomu

# Local Docker MongoDB
MONGODB_URI=mongodb://admin:your_secure_password@localhost:27017/SM_nomu?authSource=admin
```

### 5. 데이터 검증

```bash
# MongoDB Shell로 연결
docker exec -it hr-mongodb-local mongosh \
  --username admin \
  --password your_secure_password \
  --authenticationDatabase admin

# 데이터베이스 확인
use SM_nomu
show collections
db.users.countDocuments()
db.leave_requests.countDocuments()
```

## 자동화 스크립트

### sync-mongodb.sh
```bash
#!/bin/bash

# MongoDB 동기화 스크립트
set -e

echo "🔄 Starting MongoDB Atlas to Local sync..."

# 환경 변수 로드
source .env.production

# 백업 디렉토리 준비
BACKUP_DIR="./mongodb-backup/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Atlas에서 백업
echo "📥 Backing up from Atlas..."
mongodump --uri="$MONGODB_URI" \
  --out="$BACKUP_DIR" \
  --gzip

# 로컬 Docker MongoDB로 복원
echo "📤 Restoring to local Docker..."
mongorestore --host localhost:27017 \
  --username admin \
  --password your_secure_password \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  "$BACKUP_DIR"

echo "✅ Sync completed successfully!"

# 선택: 오래된 백업 삭제 (7일 이상)
find ./mongodb-backup -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
```

## 보안 고려사항

1. **비밀번호 관리**
   - 절대 스크립트에 하드코딩하지 않기
   - 환경 변수 또는 시크릿 매니저 사용
   - `.gitignore`에 `.env` 파일 추가 확인

2. **네트워크 보안**
   - Docker MongoDB는 개발 환경에서만 사용
   - 프로덕션 데이터는 마스킹 고려
   - VPN 사용 권장

3. **데이터 보호**
   - 백업 파일 암호화
   - 백업 디렉토리 권한 설정 (chmod 700)
   - 정기적인 백업 파일 삭제

## MongoDB Compass 팁과 트릭

### 빠른 Export/Import 스크립트

모든 컬렉션을 한 번에 export/import하려면:

```javascript
// export-all.js (Compass의 MongoDB Shell에서 실행)
const collections = db.getCollectionNames();
collections.forEach(col => {
  print(`Exporting ${col}...`);
  // Compass GUI에서 수동으로 export 필요
});
```

### Compass 단축키
- `Ctrl+K`: 빠른 연결 전환
- `Ctrl+Shift+D`: 데이터베이스 목록
- `F5`: 새로고침

### 대량 Import 최적화
- Import 전 인덱스 생성 비활성화
- Import 후 인덱스 재생성
- 큰 파일은 분할하여 import

### 실시간 동기화 (개발 중 지속적 동기화)
```yaml
# docker-compose에 추가
services:
  mongo-sync:
    image: mongo:7.0
    command: >
      sh -c "
      while true; do
        mongodump --uri='$$ATLAS_URI' --archive | 
        mongorestore --host=mongodb:27017 --archive --drop
        sleep 3600
      done
      "
    environment:
      ATLAS_URI: ${MONGODB_URI}
    depends_on:
      - mongodb
```

## 트러블슈팅

### MongoDB Compass 관련 문제

#### Export 시 메모리 부족
- 작은 batch size로 export
- 컬렉션을 날짜나 ID 범위로 필터링 후 부분 export

#### Import 실패
- JSON 형식 검증: `jq . export.json` 명령으로 확인
- 특수 문자 이스케이프 확인
- Extended JSON 형식 사용 권장

#### 연결 타임아웃
- Atlas: Network Access에서 현재 IP 추가
- 로컬: Docker 컨테이너 실행 상태 확인
  ```bash
  docker logs hr-mongodb-local
  ```

### 연결 문제
- Atlas 화이트리스트에 IP 추가 확인
- Docker 네트워크 설정 확인
- 방화벽 규칙 확인

### 데이터 타입 문제 (mongodump/mongorestore)
- ObjectId 변환 문제: `--preserveUUIDs` 옵션 사용
- Date 타입 문제: `--maintainInsertionOrder` 옵션 사용

### 성능 문제
- `--numParallelCollections` 옵션으로 병렬 처리
- `--gzip` 옵션으로 압축 전송
- 대용량 데이터는 컬렉션별 분할 백업

## 검증 체크리스트

### MongoDB Compass 방법
- [ ] Compass 설치 및 실행
- [ ] Atlas 연결 성공
- [ ] Docker MongoDB 컨테이너 실행
- [ ] 로컬 MongoDB 연결 성공
- [ ] 모든 컬렉션 Export 완료
- [ ] 모든 컬렉션 Import 완료
- [ ] 문서 수 일치 확인 (Atlas vs Local)
- [ ] 인덱스 수동 생성 완료
- [ ] 샘플 쿼리 테스트
- [ ] 애플리케이션 연결 테스트

### mongodump/mongorestore 방법
- [ ] Docker MongoDB 컨테이너 정상 실행
- [ ] Atlas 백업 완료
- [ ] 로컬 복원 완료
- [ ] 데이터 수 일치 확인
- [ ] 애플리케이션 연결 테스트
- [ ] 인덱스 복원 확인
- [ ] 권한 설정 확인

## 참고 자료

- [MongoDB Database Tools Documentation](https://docs.mongodb.com/database-tools/)
- [Docker MongoDB Official Image](https://hub.docker.com/_/mongo)
- [MongoDB Atlas Export/Import Guide](https://docs.atlas.mongodb.com/import-export-data/)