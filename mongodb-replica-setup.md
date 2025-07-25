# MongoDB Replica Set 설정 가이드

## 1. 단일 서버에서 Replica Set 구성 (개발용)

### MongoDB 설정 파일 수정
```yaml
# /etc/mongod.conf 또는 mongod.conf
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

replication:
  replSetName: "hrapp"

processManagement:
  fork: true
  pidFilePath: /var/run/mongodb/mongod.pid
```

### Replica Set 초기화
```bash
# MongoDB 재시작
sudo systemctl restart mongod

# MongoDB Shell 접속
mongosh

# Replica Set 초기화
rs.initiate({
  _id: "hrapp",
  members: [
    { _id: 0, host: "127.0.0.1:27017" }
  ]
})

# 상태 확인
rs.status()
```

## 2. 프로덕션용 3노드 구성

### 각 서버 설정
```yaml
# 서버1 (Primary)
replication:
  replSetName: "hrapp"
net:
  port: 27017
  bindIp: 0.0.0.0

# 서버2 (Secondary)
replication:
  replSetName: "hrapp"
net:
  port: 27017
  bindIp: 0.0.0.0

# 서버3 (Arbiter - 최소 리소스)
replication:
  replSetName: "hrapp"
net:
  port: 27017
  bindIp: 0.0.0.0
```

### Replica Set 구성
```javascript
rs.initiate({
  _id: "hrapp",
  members: [
    { _id: 0, host: "server1:27017", priority: 2 },
    { _id: 1, host: "server2:27017", priority: 1 },
    { _id: 2, host: "server3:27017", arbiterOnly: true }
  ]
})
```

## 3. 애플리케이션 연결 문자열 변경

### 현재 (Standalone)
```javascript
mongodb://localhost:27017/hr
```

### 변경 후 (Replica Set)
```javascript
mongodb://127.0.0.1:27017/hr?replicaSet=hrapp
```

## 4. 장점 확인

### 트랜잭션 테스트
```javascript
const session = db.client.startSession();
await session.withTransaction(async () => {
  // 이제 정상 작동!
  await db.collection('users').updateOne(..., { session });
  await db.collection('leaveRequests').insertOne(..., { session });
});
```

### 장애 복구 테스트
```bash
# Primary 서버 중단 시 자동으로 Secondary가 승격
sudo systemctl stop mongod
# → 다른 노드가 자동으로 Primary가 됨
```

## 권장사항
- **개발환경**: 단일 노드 Replica Set
- **운영환경**: 3노드 Replica Set (Primary 1 + Secondary 1 + Arbiter 1)
- **고가용성 필요**: 3노드 모두 데이터 노드