# MongoDB 인증 정보

## 데이터베이스 연결 정보

### 개발 환경
- **호스트**: localhost
- **포트**: 27017
- **데이터베이스**: SM_nomu
- **인증**: 없음

### 배포 환경 (Synology Docker)
- **호스트**: localhost
- **포트**: 27018
- **데이터베이스**: SM_nomu
- **컨테이너 이름**: mongo-hr

## MongoDB 사용자 계정

### 애플리케이션 사용자
- **사용자명**: `hr_app_user`
- **비밀번호**: `HrSecure2025`
- **권한**: `readWrite` (SM_nomu 데이터베이스)
- **생성일**: 2025-07-16
- **용도**: HR 시스템 애플리케이션 전용

### 사용자 생성 명령어
```javascript
// Docker 컨테이너 내부에서 실행
use SM_nomu
db.createUser({
  user: "hr_app_user",
  pwd: "Hr2025Secure",
  roles: [
    { role: "readWrite", db: "SM_nomu" }
  ]
})
```

### 연결 테스트
```bash
# Docker 컨테이너를 통한 연결 테스트
docker run -it --rm --network host mongo:latest mongo --host localhost --port 27018 -u hr_app_user -p 'Hr2025Secure' --authenticationDatabase SM_nomu
```

## 환경 변수 설정

### ecosystem.config.js
```javascript
env: {
  NODE_ENV: 'production',
  MONGODB_USER: 'hr_app_user',
  MONGODB_PASSWORD: 'Hr2025Secure',
  DB_NAME: 'SM_nomu',
  // ...
}
```

### 연결 문자열
```
mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu
```

## 보안 주의사항

1. **비밀번호 관리**
   - 이 파일은 `.gitignore`에 추가하여 버전 관리에서 제외
   - 프로덕션 환경에서는 환경 변수로 관리
   - 정기적인 비밀번호 변경 권장

2. **접근 제한**
   - 애플리케이션 전용 계정으로 최소 권한 부여
   - 관리자 권한 분리 유지

3. **백업**
   - 인증 정보는 안전한 곳에 별도 백업
   - 팀원과 공유 시 안전한 채널 사용

---

**⚠️ 주의**: 이 파일은 민감한 정보를 포함하고 있습니다. 공개 저장소에 커밋하지 마세요!