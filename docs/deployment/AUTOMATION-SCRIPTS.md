# 배포 자동화 스크립트 가이드

**작성일**: 2025년 09월 04일  
**버전**: v1.0  
**위치**: `/scripts/`

## 📚 목차

1. [개요](#개요)
2. [롤백 스크립트](#1-롤백-스크립트)
3. [백업 스크립트](#2-백업-스크립트)
4. [모니터링 스크립트](#3-모니터링-스크립트)
5. [사전 요구사항](#사전-요구사항)
6. [문제 해결](#문제-해결)

---

## 개요

배포 프로세스를 안전하고 효율적으로 관리하기 위한 자동화 스크립트 모음입니다.

### 스크립트 목록

| 스크립트 | 용도 | 실행 시점 |
|---------|------|----------|
| `rollback-deploy.sh` | 배포 실패 시 이전 버전으로 롤백 | 긴급 상황 |
| `backup-production.sh` | 프로덕션 데이터베이스 및 파일 백업 | 배포 전/정기적 |
| `monitor-logs.sh` | 로그 모니터링 및 시스템 상태 확인 | 상시 |

---

## 1. 롤백 스크립트

### 용도
배포 실패 시 신속하게 이전 버전으로 복원

### 사용법

```bash
# 기본 실행 (실제 롤백 수행)
./scripts/rollback-deploy.sh

# 시뮬레이션 모드 (변경사항 미리보기)
./scripts/rollback-deploy.sh --dry-run
```

### 동작 과정

1. **Git 태그 확인**: 현재 태그와 이전 태그 식별
2. **사용자 확인**: 롤백 진행 여부 확인
3. **백업 생성**: 현재 상태 백업
4. **Git 롤백**: 이전 태그로 체크아웃
5. **Cloud Run 롤백**: 이전 리비전으로 트래픽 전환
6. **Vercel 롤백**: 프론트엔드 이전 배포로 롤백
7. **검증**: 롤백 성공 여부 확인

### 주의사항

- 이전 태그가 반드시 존재해야 함
- 롤백 전 현재 상태가 자동 백업됨
- 백업 위치: `backups/rollback_YYYYMMDD_HHMMSS/`

### 롤백 후 체크리스트

- [ ] 애플리케이션 정상 작동 확인
- [ ] 에러 로그 모니터링
- [ ] 팀에게 롤백 공지
- [ ] 롤백 원인 분석

---

## 2. 백업 스크립트

### 용도
프로덕션 데이터베이스와 중요 파일 백업

### 사용법

```bash
# 전체 백업 (DB + 파일)
./scripts/backup-production.sh

# 데이터베이스만 백업
./scripts/backup-production.sh --db-only

# 파일만 백업
./scripts/backup-production.sh --files-only
```

### 백업 내용

#### 데이터베이스 백업
- MongoDB 전체 컬렉션
- 메타데이터 (타임스탬프, 크기 등)

#### 파일 백업
- 설정 파일 (`backend/config`, `frontend/src/config`)
- 환경 변수 파일 (민감정보 제거)
- 업로드 파일 (100MB 미만)

### 백업 관리

- **자동 압축**: tar.gz 형식으로 압축
- **자동 정리**: 최근 10개 백업만 유지
- **백업 위치**: `backups/backup_YYYYMMDD_HHMMSS.tar.gz`

### 백업 복원

```bash
# 1. 백업 파일 압축 해제
tar -xzf backups/backup_20250904_141632.tar.gz

# 2. MongoDB 복원
mongorestore --uri="mongodb://localhost:27017" \
  --drop \
  backups/backup_20250904_141632/mongodb

# 3. 파일 복원 (필요 시)
cp -r backups/backup_20250904_141632/config/* backend/config/
```

### 백업 스케줄 권장사항

- **일일 백업**: 매일 새벽 2시
- **배포 전 백업**: 모든 배포 직전
- **주간 백업**: 매주 일요일 전체 백업

---

## 3. 모니터링 스크립트

### 용도
실시간 로그 모니터링 및 시스템 상태 확인

### 사용법

```bash
# 로컬 로그 모니터링
./scripts/monitor-logs.sh --local

# Google Cloud 로그 모니터링
./scripts/monitor-logs.sh --cloud

# 에러 로그만 표시
./scripts/monitor-logs.sh --errors-only

# 실시간 로그 스트리밍
./scripts/monitor-logs.sh --follow

# 표시 라인 수 지정
./scripts/monitor-logs.sh --lines=100
```

### 모니터링 대상

#### 로컬 모드
- 애플리케이션 로그 (`backend/logs/*.log`)
- PM2 로그
- 시스템 프로세스 상태
- 로컬 서비스 헬스체크

#### 클라우드 모드
- Google Cloud Run 로그
- Vercel 배포 로그
- 클라우드 메트릭스
- 프로덕션 헬스체크

### 대시보드 정보

- **헬스체크 상태**: API 및 프론트엔드 상태
- **시스템 메트릭**: 디스크, 메모리, 로드
- **프로세스 상태**: Backend, Frontend, MongoDB

### 알람 설정 예시

```bash
# 에러 발생 시 알림
./scripts/monitor-logs.sh --cloud --errors-only --follow | \
  while read line; do
    if [[ "$line" == *"ERROR"* ]]; then
      # 슬랙 알림 전송
      curl -X POST $SLACK_WEBHOOK -d "{\"text\":\"Error: $line\"}"
    fi
  done
```

---

## 사전 요구사항

### 필수 도구

| 도구 | 용도 | 설치 명령 |
|-----|------|----------|
| Git | 버전 관리 | `apt install git` |
| Node.js | 애플리케이션 실행 | `nvm install 18` |
| MongoDB Tools | DB 백업/복원 | `apt install mongodb-database-tools` |
| gcloud CLI | Google Cloud 관리 | [설치 가이드](https://cloud.google.com/sdk/install) |
| Vercel CLI | Vercel 배포 관리 | `npm i -g vercel` |

### 환경 설정

```bash
# 1. Google Cloud 인증
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Vercel 인증
vercel login

# 3. MongoDB URI 설정
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/db"
```

---

## 문제 해결

### 롤백 스크립트 문제

#### "No previous tag found" 에러
```bash
# 태그 목록 확인
git tag -l

# 수동으로 이전 커밋으로 롤백
git checkout HEAD~1
```

#### Cloud Run 롤백 실패
```bash
# 리비전 목록 확인
gcloud run revisions list --service=hr-backend

# 수동으로 트래픽 전환
gcloud run services update-traffic hr-backend \
  --to-revisions=REVISION_NAME=100
```

### 백업 스크립트 문제

#### "mongodump not found" 에러
```bash
# MongoDB tools 설치
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.9.4.deb
sudo dpkg -i mongodb-database-tools-*.deb
```

#### 백업 공간 부족
```bash
# 오래된 백업 수동 삭제
ls -lt backups/ | tail -n +11 | awk '{print "backups/"$9}' | xargs rm -f

# 디스크 공간 확인
df -h
```

### 모니터링 스크립트 문제

#### PM2 로그 접근 실패
```bash
# PM2 재시작
pm2 kill
pm2 start ecosystem.config.js

# 로그 위치 확인
pm2 info app-name
```

#### Cloud 로그 접근 실패
```bash
# 권한 확인
gcloud projects get-iam-policy PROJECT_ID

# 로그 읽기 권한 부여
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your-email@domain.com" \
  --role="roles/logging.viewer"
```

---

## 자동화 권장사항

### Cron 작업 설정

```bash
# crontab -e 로 편집

# 매일 새벽 2시 백업
0 2 * * * /path/to/backup-production.sh >> /var/log/backup.log 2>&1

# 5분마다 헬스체크
*/5 * * * * /path/to/monitor-logs.sh --cloud --errors-only | grep ERROR && curl -X POST $ALERT_WEBHOOK

# 매주 일요일 전체 백업
0 3 * * 0 /path/to/backup-production.sh --full >> /var/log/backup-full.log 2>&1
```

### CI/CD 파이프라인 통합

```yaml
# GitHub Actions 예시
name: Deploy with Backup

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Backup before deploy
        run: ./scripts/backup-production.sh
        
      - name: Deploy
        run: |
          # 배포 명령
          
      - name: Health check
        run: ./scripts/monitor-logs.sh --cloud --lines=50
        
      - name: Rollback on failure
        if: failure()
        run: ./scripts/rollback-deploy.sh
```

---

## 연락처

문제 발생 시 연락처:
- 개발팀 리드: XXX-XXXX-XXXX
- 인프라 담당: XXX-XXXX-XXXX
- 긴급 상황: #emergency 슬랙 채널

---

**마지막 업데이트**: 2025년 09월 04일