# 시놀로지 NAS 배포 가이드

시놀로지 NAS에서 HR System을 실행하는 방법을 설명합니다.

## 📋 목차
- [사전 준비사항](#사전-준비사항)
- [MongoDB 설치](#mongodb-설치)
- [Node.js 설치](#nodejs-설치)
- [프로젝트 배포](#프로젝트-배포)
- [환경 설정](#환경-설정)
- [서비스 실행](#서비스-실행)
- [자동 시작 설정](#자동-시작-설정)
- [포트 설정](#포트-설정)
- [문제 해결](#문제-해결)

## 🔧 사전 준비사항

### 시놀로지 DSM 요구사항
- DSM 7.0 이상
- 최소 2GB RAM 권장
- 최소 1GB 저장공간

### 필요한 패키지
1. **Docker** (MongoDB 실행용)
2. **Node.js v8** (시놀로지 패키지 센터)
3. **Web Station** (선택사항 - 프록시 설정용)

## 🍃 MongoDB 설치

### Docker를 이용한 MongoDB 설치

1. **DSM 패키지 센터에서 Docker 설치**
   ```
   패키지 센터 → Docker → 설치
   ```

2. **MongoDB Docker 이미지 다운로드**
   ```bash
   # SSH 또는 터미널에서 실행
   sudo docker pull mongo:5.0
   ```

3. **MongoDB 컨테이너 생성 및 실행**
   ```bash
   sudo docker run -d \
     --name mongodb \
     -p 27017:27017 \
     -v /volume1/docker/mongodb:/data/db \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password123 \
     --restart unless-stopped \
     mongo:5.0
   ```

4. **MongoDB 연결 테스트**
   ```bash
   sudo docker exec -it mongodb mongosh
   ```

## 🟢 Node.js 설치

### 시놀로지 패키지 센터 이용

1. **패키지 센터에서 Node.js 설치**
   ```
   패키지 센터 → Node.js v18 → 설치
   ```

2. **SSH 접속 활성화**
   ```
   제어판 → 터미널 및 SNMP → SSH 서비스 활성화
   ```

3. **Node.js 버전 확인**
   ```bash
   node --version
   npm --version
   ```

## 📁 프로젝트 배포

### 1. 프로젝트 파일 업로드

**방법 1: File Station 이용**
```
File Station → 새 폴더 생성 → HR
프로젝트 파일들을 /volume1/HR/로 업로드
```

**방법 2: SSH/SFTP 이용**
```bash
# SSH로 접속
ssh admin@[시놀로지IP]

# 프로젝트 디렉토리 생성
sudo mkdir -p /volume1/web/HR
cd /volume1/web/HR

# 파일 복사 (로컬에서 업로드 후)
```

### 2. 의존성 설치

```bash
# 백엔드 의존성 설치
cd /volume1/web/HR/backend
sudo npm install

# 프론트엔드 의존성 설치
cd /volume1/web/HR/frontend
sudo npm install
```

### 3. 프론트엔드 빌드

```bash
cd /volume1/web/HR/frontend
sudo npm run build
```

## ⚙️ 환경 설정

### 1. 백엔드 환경 설정

`backend/.env` 파일 생성:
```env
NODE_ENV=production
PORT=5445
MONGODB_URL=mongodb://localhost:27017
DB_NAME=SM_nomu
SESSION_SECRET=your-secret-key-here
```

### 2. 프론트엔드 환경 설정

`frontend/.env.production` 파일 생성:
```env
VITE_API_BASE_URL=http://[시놀로지IP]:5445/api
```

### 3. MongoDB 연결 설정

`backend/server.js`에서 MongoDB URL 수정:
```javascript
const MONGO_URL = process.env.NODE_ENV === 'production' 
  ? 'mongodb://admin:password123@localhost:27017' 
  : 'mongodb://localhost:27017';
```

## 🚀 서비스 실행

### 1. 백엔드 서버 실행

```bash
cd /volume1/web/HR/backend

# PM2를 사용한 프로세스 관리 (권장)
sudo npm install -g pm2
sudo pm2 start server.js --name "hr-backend"

# 또는 직접 실행
sudo node server.js &
```

### 2. 프론트엔드 서빙

**방법 1: 정적 파일 서빙**
```bash
cd /volume1/web/HR/frontend
sudo npm install -g serve
sudo pm2 start "serve -s dist -p 3727" --name "hr-frontend"
```

**방법 2: Web Station 이용**
```
Web Station → 웹 포털 → 생성
- 포털 유형: PHP
- 문서 루트: /volume1/web/HR/frontend/dist
- 포트: 3727
```

## 🔄 자동 시작 설정

### 1. PM2 자동 시작 설정

```bash
# PM2 스타트업 스크립트 생성
sudo pm2 startup
sudo pm2 save

# 부팅 시 자동 실행 설정
sudo systemctl enable pm2-root
```

### 2. 작업 스케줄러 이용

DSM에서 작업 스케줄러 설정:
```
제어판 → 작업 스케줄러 → 생성 → 사용자 정의 스크립트

트리거: 부팅
스크립트: 
#!/bin/bash
cd /volume1/web/HR/backend
pm2 start server.js --name "hr-backend"
cd /volume1/web/HR/frontend  
pm2 start "serve -s dist -p 3727" --name "hr-frontend"
```

## 🌐 포트 설정

### 1. 방화벽 설정

```
제어판 → 보안 → 방화벽 → 편집 규칙

포트 추가:
- 3727 (프론트엔드)
- 5445 (백엔드)
- 27017 (MongoDB, 내부용)
```

### 2. 포트 포워딩 (외부 접속용)

라우터 설정에서 포트 포워딩:
```
외부포트 → 시놀로지IP:내부포트
80 → [시놀로지IP]:3727
5445 → [시놀로지IP]:5445
```

### 3. 리버스 프록시 설정 (선택사항)

Web Station에서 리버스 프록시 설정:
```
Web Station → 웹 서비스 포털 → 리버스 프록시

소스:
- 프로토콜: HTTP
- 호스트 이름: *
- 포트: 80

대상:
- 프로토콜: HTTP  
- 호스트 이름: localhost
- 포트: 3727
```

## 📊 서비스 모니터링

### 1. PM2 모니터링

```bash
# 프로세스 상태 확인
sudo pm2 status

# 로그 확인
sudo pm2 logs

# 메모리/CPU 사용량 확인
sudo pm2 monit
```

### 2. MongoDB 모니터링

```bash
# MongoDB 컨테이너 상태 확인
sudo docker ps | grep mongodb

# MongoDB 로그 확인  
sudo docker logs mongodb

# MongoDB 접속 테스트
sudo docker exec -it mongodb mongosh --eval "db.runCommand('ping')"
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. "Permission denied" 오류
```bash
# 권한 설정
sudo chmod -R 755 /volume1/web/HR
sudo chown -R http:http /volume1/web/HR
```

#### 2. MongoDB 연결 실패
```bash
# MongoDB 컨테이너 재시작
sudo docker restart mongodb

# 연결 테스트
sudo docker exec -it mongodb mongosh
```

#### 3. Node.js 프로세스 충돌
```bash
# 기존 프로세스 종료
sudo pm2 delete all
sudo pkill -f node

# 프로세스 재시작
sudo pm2 start ecosystem.config.js
```

#### 4. 메모리 부족
```bash
# 스왑 메모리 추가
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### PM2 Ecosystem 설정

`ecosystem.config.js` 파일 생성:
```javascript
module.exports = {
  apps: [
    {
      name: 'hr-backend',
      script: './backend/server.js',
      cwd: '/volume1/web/HR',
      env: {
        NODE_ENV: 'production',
        PORT: 5445
      },
      max_memory_restart: '500M',
      instances: 1,
      autorestart: true
    },
    {
      name: 'hr-frontend',
      script: 'serve',
      args: '-s dist -p 3727',
      cwd: '/volume1/web/HR/frontend',
      max_memory_restart: '200M',
      instances: 1,
      autorestart: true
    }
  ]
};
```

### 실행 명령어
```bash
sudo pm2 start ecosystem.config.js
sudo pm2 save
```

## 📝 유지보수

### 정기 백업
```bash
# MongoDB 백업
sudo docker exec mongodb mongodump --out /data/backup/$(date +%Y%m%d)

# 애플리케이션 파일 백업
sudo tar -czf /volume1/backup/HR_$(date +%Y%m%d).tar.gz /volume1/web/HR
```

### 업데이트 절차
```bash
# 1. 서비스 중지
sudo pm2 stop all

# 2. 백업 생성
sudo cp -r /volume1/web/HR /volume1/backup/HR_backup

# 3. 새 버전 배포
# 파일 교체 후...

# 4. 의존성 업데이트
cd /volume1/web/HR/backend && sudo npm install
cd /volume1/web/HR/frontend && sudo npm install && sudo npm run build

# 5. 서비스 재시작
sudo pm2 restart all
```

## 🔗 접속 정보

배포 완료 후 접속:
- **프론트엔드**: `http://[시놀로지IP]:3727`
- **백엔드 API**: `http://[시놀로지IP]:5445/api`
- **기본 계정**: admin / admin

---

## 📞 지원

문제가 발생할 경우:
1. PM2 로그 확인: `sudo pm2 logs`
2. Docker 로그 확인: `sudo docker logs mongodb`  
3. 시스템 리소스 확인: `top`, `df -h`
4. 네트워크 연결 확인: `netstat -tlnp`

배포에 성공하면 시놀로지 NAS에서 완전한 HR System을 운영할 수 있습니다.