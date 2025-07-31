# 현재 이슈: MongoDB URI Secret 버전 문제

## 문제 상황
- Cloud Build 배포가 step 3에서 실패
- 에러: `Secret projects/429401177957/secrets/mongodb-uri/versions/latest was not found`
- `mongodb-uri` secret은 존재하지만 버전이 없음 (0 items)
- `session-secret` secret은 정상적으로 version 1이 존재

## 해결 방법

### 1. mongodb-uri secret에 버전 추가
```bash
echo 'mongodb+srv://hr_app_user:HrDev2025Temp!@hr-cluster-dev.sp0ckpk.mongodb.net/SM_nomu?retryWrites=true&w=majority&appName=hr-cluster-dev' | gcloud secrets versions add mongodb-uri --data-file=-
```

### 2. 두 secret 버전 확인
```bash
gcloud secrets versions list mongodb-uri
gcloud secrets versions list session-secret
```

### 3. 빌드 재시도
```bash
gcloud builds submit --config cloudbuild.yaml
```

## 현재 상태
- ✅ Google Cloud 프로젝트 설정 완료
- ✅ API 활성화 완료
- ✅ session-secret 생성 및 권한 설정 완료
- ❌ mongodb-uri secret 버전 누락 (수정 필요)
- ❌ Cloud Run 배포 대기 중

## 다음 단계
1. mongodb-uri secret 버전 추가
2. Cloud Build 재실행
3. 배포 성공 후 프론트엔드 Vercel 배포로 진행