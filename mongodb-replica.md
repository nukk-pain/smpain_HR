# 시놀로지 MongoDB 3노드 Replica Set 구성 가이드

## 환경 정보
- 시놀로지 NAS (4GB RAM)
- 기본 포트: 27018 (27017은 다른 서비스에서 사용 중)
- 포트 구성: Primary(27018), Secondary(27019), Arbiter(27020)

## 1. 기존 환경 정리

```bash
# 기존 mongo-hr 컨테이너 중지 및 제거
docker stop mongo-hr
docker rm mongo-hr

# 기존 데이터 정리 (필요시)
rm -rf /volume1/docker/mongo_hr_data/*
```

## 2. 디렉토리 구조 및 보안 설정

```bash
cd /volume1/docker/mongo_hr_data
mkdir -p node1 node2 node3

# 키 파일 생성 (Replica Set 인증용)
openssl rand -base64 756 > keyfile
chmod 400 keyfile
chown 999:999 keyfile

# 권한 설정
chown -R 999:999 node1 node2 node3
```

## 3. Docker Compose 파일 생성

`/volume1/docker/mongo_hr_data/docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongo-hr-primary:
    image: mongo:7.0
    container_name: mongo-hr-primary
    hostname: mongo1
    restart: always
    ports:
      - "27018:27017"
    volumes:
      - ./node1:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 1
    networks:
      - mongo-net

  mongo-hr-secondary:
    image: mongo:7.0
    container_name: mongo-hr-secondary
    hostname: mongo2
    restart: always
    ports:
      - "27019:27017"
    volumes:
      - ./node2:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.5
    networks:
      - mongo-net

  mongo-hr-arbiter:
    image: mongo:7.0
    container_name: mongo-hr-arbiter
    hostname: mongo3
    restart: always
    ports:
      - "27020:27017"
    volumes:
      - ./node3:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.25 --nojournal
    networks:
      - mongo-net

networks:
  mongo-net:
    driver: bridge
```

## 4. 파일 생성 명령어

```bash
cd /volume1/docker/mongo_hr_data

# Docker Compose 파일 생성
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  mongo-hr-primary:
    image: mongo:7.0
    container_name: mongo-hr-primary
    hostname: mongo1
    restart: always
    ports:
      - "27018:27017"
    volumes:
      - ./node1:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 1
    networks:
      - mongo-net

  mongo-hr-secondary:
    image: mongo:7.0
    container_name: mongo-hr-secondary
    hostname: mongo2
    restart: always
    ports:
      - "27019:27017"
    volumes:
      - ./node2:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.5
    networks:
      - mongo-net

  mongo-hr-arbiter:
    image: mongo:7.0
    container_name: mongo-hr-arbiter
    hostname: mongo3
    restart: always
    ports:
      - "27020:27017"
    volumes:
      - ./node3:/data/db
      - ./keyfile:/data/keyfile:ro
    command: mongod --replSet hrapp --keyFile /data/keyfile --auth --bind_ip_all --wiredTigerCacheSizeGB 0.25 --nojournal
    networks:
      - mongo-net

networks:
  mongo-net:
    driver: bridge
EOF
```

## 5. 컨테이너 시작 및 확인

```bash
# 문법 검증
docker-compose config

# 컨테이너 시작
docker-compose up -d

# 상태 확인
docker ps | grep mongo-hr

# 로그 확인
docker logs mongo-hr-primary
```

## 6. Replica Set 초기화

```bash
# Primary 노드에 접속
docker exec -it mongo-hr-primary mongosh

# MongoDB Shell에서 실행
```

MongoDB Shell에서:
```javascript
// Replica Set init (idempotent 처리)
try {
  rs.initiate({
    _id: "hrapp",
    members: [
      { _id: 0, host: "mongo-hr-primary:27017", priority: 2 },
      { _id: 1, host: "mongo-hr-secondary:27017", priority: 1 },
      { _id: 2, host: "mongo-hr-arbiter:27017", arbiterOnly: true }
    ]
  });
} catch (e) {
  if (!/already initialized/i.test(e.message)) { throw e; }
}
sleep(5000);
rs.status();

// admin 사용자
let adb = db.getSiblingDB("admin");
adb.createUser({
  user: "admin",
  pwd: "Hr2025AdminSecure",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "dbAdminAnyDatabase", db: "admin" },
    { role: "clusterAdmin", db: "admin" }
  ]
});

// 애플리케이션 사용자
let appdb = db.getSiblingDB("SM_nomu");
appdb.createUser({
  user: "hr_app_user",
  pwd: "Hr2025Secure",
  roles: [
    { role: "readWrite", db: "SM_nomu" },
    { role: "dbAdmin", db: "SM_nomu" }
  ]
});

```

## 7. HR 애플리케이션 연결 설정

### 연결 문자열 변경

`/mnt/d/my_programs/HR/backend/server.js`:
```javascript
// 기존
const mongoUrl = 'mongodb://localhost:27017/SM_nomu';

// 변경 후 (시놀로지 IP로 교체)
const mongoUrl = 'mongodb://hr_app_user:Hr2025Secure@시놀로지IP:27018,시놀로지IP:27019,시놀로지IP:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu';
```

### 환경변수로 설정 (권장)
```bash
export MONGODB_URL="mongodb://hr_app_user:Hr2025Secure@시놀로지IP:27018,시놀로지IP:27019,시놀로지IP:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu"
```

## 8. 상태 확인 및 테스트

```bash
# 포트 확인
docker ps | grep mongo-hr

# Replica Set 상태 확인
docker exec mongo-hr-primary mongosh --eval "
  use admin
  db.auth('admin', 'Hr2025AdminSecure')
  rs.status().members.forEach(m => print(m.name + ': ' + m.stateStr))
"

# HR 데이터베이스 연결 테스트
docker exec mongo-hr-primary mongosh --eval "
  use SM_nomu
  db.auth('hr_app_user', 'Hr2025Secure')
  db.runCommand('ping')
"
```

## 9. 시놀로지 방화벽 설정

DSM 제어판에서:
1. **보안** → **방화벽**
2. 포트 **27018, 27019, 27020** 허용
3. 특정 IP만 허용 (보안 강화)

## 10. 백업 설정

```bash
# 백업 스크립트 생성
cat > /volume1/docker/mongo_hr_data/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/volume1/backup/mongodb/$DATE"
mkdir -p $BACKUP_DIR

docker exec mongo-hr-primary mongodump \
  --port 27017 \
  --authenticationDatabase admin \
  --username admin \
  --password Hr2025AdminSecure \
  --out /tmp/backup

docker cp mongo-hr-primary:/tmp/backup $BACKUP_DIR
docker exec mongo-hr-primary rm -rf /tmp/backup

# 15일 이상 된 백업 삭제
find /volume1/backup/mongodb -type d -mtime +15 -exec rm -rf {} \;
EOF

chmod +x /volume1/docker/mongo_hr_data/backup.sh

# 크론탭 등록 (매일 새벽 2시)
echo "0 2 * * * /volume1/docker/mongo_hr_data/backup.sh" | crontab -
```

## 11. 자동 시작 설정

```bash
# 시놀로지 부팅 시 자동 시작
echo "cd /volume1/docker/mongo_hr_data && docker-compose up -d" >> /etc/rc.local
```

## 12. 트러블슈팅

### 일반적인 문제들

1. **권한 오류**
```bash
chown -R 999:999 /volume1/docker/mongo_hr_data/node*
chmod 400 /volume1/docker/mongo_hr_data/keyfile
```

2. **메모리 부족**
```bash
# 캐시 사이즈 줄이기
--wiredTigerCacheSizeGB 0.5
```

3. **연결 실패**
```bash
# 네트워크 확인
docker network ls
docker exec mongo-hr-primary ping mongo2
```

### 상태 모니터링 명령어

```bash
# 메모리 사용량
docker stats --no-stream

# Replica Set 상태
docker exec mongo-hr-primary mongosh --eval "
  use admin
  db.auth('admin', 'Hr2025AdminSecure')
  rs.status()
"

# 로그 확인
docker logs mongo-hr-primary --tail 50
```

## 13. 성능 최적화 (4GB RAM 환경)

### 메모리 할당
- **Primary**: 1GB WiredTiger Cache
- **Secondary**: 0.5GB WiredTiger Cache  
- **Arbiter**: 0.25GB WiredTiger Cache + nojournal

### 시스템 최적화
```bash
# 메모리 정리 (매일 새벽 3시)
echo "0 3 * * * echo 3 > /proc/sys/vm/drop_caches" | crontab -
```

## 14. 장점 확인

### 트랜잭션 테스트
```javascript
const session = db.getMongo().startSession();
await session.withTransaction(async () => {
  // 이제 정상 작동!
  await db.users.updateOne({}, {$set: {lastLogin: new Date()}}, {session});
  await db.leaveRequests.insertOne({...}, {session});
});
```

### 고가용성 테스트
```bash
# Primary 서버 중단 시 자동으로 Secondary가 승격
docker stop mongo-hr-primary
# → Secondary가 자동으로 Primary가 됨

# 복구
docker start mongo-hr-primary
# → 자동으로 Secondary로 재참여
```

## 권장사항
- **개발환경**: 단일 노드 Replica Set
- **운영환경**: 3노드 Replica Set (Primary 1 + Secondary 1 + Arbiter 1)
- **고가용성 필요**: 3노드 모두 데이터 노드 (Arbiter 대신 Secondary 3개)
- **백업**: 매일 자동 백업 및 주기적인 복원 테스트