# 프로젝트 경량화 방안

## 현재 프로젝트 크기 분석

**전체 프로젝트 크기: 1.4GB**

### 디렉토리별 크기 분석
- `gcloud auth login/` : **924MB** ⚠️ (가장 큰 문제)
- `frontend/` : 240MB
  - `node_modules/` : 237MB
- `backend/` : 185MB  
  - `node_modules/` : 184MB
- `.git/` : 3.6MB
- `node_modules/` (루트) : 3.1MB
- 기타 파일들 : 1MB 미만

## 즉시 실행 가능한 경량화 방안

### 1. 🚨 최우선 조치 (924MB 절약)
```bash
# Google Cloud SDK 잘못 설치된 디렉토리 삭제
rm -rf "gcloud auth login"
```
**효과**: 전체 프로젝트 크기를 1.4GB → 476MB로 약 66% 감소

### 2. 개발 의존성 정리 (421MB 절약)

#### Frontend 의존성 최적화
```bash
cd frontend
# 사용하지 않는 패키지 제거
npm uninstall [unused-packages]
# 개발 의존성을 프로덕션에서 제외
npm prune --production
```

#### Backend 의존성 최적화  
```bash
cd backend
# 사용하지 않는 패키지 제거
npm uninstall [unused-packages]  
# 개발 의존성을 프로덕션에서 제외
npm prune --production
```

### 3. Git 이력 정리 (추가 절약 가능)
```bash
# 큰 파일이 커밋된 이력이 있다면
git filter-branch --tree-filter 'rm -rf path/to/large/files' HEAD
# 또는 BFG Repo-Cleaner 사용
```

## 장기적 경량화 전략

### 1. 패키지 의존성 최적화

#### Frontend 패키지 분석 필요
- Material-UI 관련 패키지들이 중복되어 있는지 확인
- AG Grid 같은 큰 라이브러리의 대안 검토
- Tree shaking이 제대로 작동하는지 확인

#### Backend 패키지 분석 필요
- Express 관련 미들웨어 중복 확인
- MongoDB 관련 패키지 최적화
- 개발용으로만 사용되는 패키지를 devDependencies로 이동

### 2. 빌드 최적화

#### Frontend 빌드 최적화
```bash
# Vite 빌드 최적화 설정
npm run build
# 빌드 결과물 크기 분석
npm run build-analyze
```

#### 코드 분할 및 지연 로딩
- React.lazy()를 사용한 컴포넌트 지연 로딩
- 라우트 기반 코드 분할
- 사용하지 않는 CSS 제거

### 3. 개발 환경 개선

#### .gitignore 최적화
```gitignore
# 추가해야 할 항목들
node_modules/
dist/
build/
*.log
.env.local
.DS_Store
coverage/
temp/
uploads/*
!uploads/.gitkeep
```

#### 개발용 Docker 이미지 최적화
- Multi-stage build 사용
- Alpine Linux 기반 이미지 사용
- 불필요한 패키지 제거

### 4. 자동화된 크기 모니터링

#### GitHub Actions 또는 CI/CD 파이프라인에 추가
```yaml
# 번들 크기 모니터링
- name: Check bundle size
  run: |
    npm run build
    npm run size-limit
```

#### 패키지 크기 분석 도구 도입
```bash
# 패키지 크기 분석
npm install -g bundle-analyzer
npm install -g webpack-bundle-analyzer
```

## 예상 경량화 효과

| 단계 | 현재 크기 | 절약량 | 결과 크기 | 감소율 |
|------|-----------|--------|-----------|--------|
| 1단계: gcloud 삭제 | 1.4GB | 924MB | 476MB | 66% |
| 2단계: node_modules 최적화 | 476MB | 200MB | 276MB | 42% |
| 3단계: 빌드 최적화 | 276MB | 50MB | 226MB | 18% |
| **총 예상 효과** | **1.4GB** | **1.17GB** | **226MB** | **84%** |

## 실행 우선순위

1. **즉시 실행** (5분): gcloud 디렉토리 삭제
2. **단기 실행** (30분): 불필요한 패키지 제거
3. **중기 실행** (2시간): 빌드 최적화 및 코드 분할
4. **장기 실행** (1일): 자동화 및 모니터링 구축

## 주의사항

- 패키지 제거 전 반드시 기능 테스트 수행
- 프로덕션 환경에서 필요한 패키지는 보존
- 변경사항은 git으로 추적하여 롤백 가능하도록 관리
- 팀원들과 변경사항 공유 및 문서화

## 추가 권장사항

### 정기적인 크기 점검
- 월 1회 프로젝트 크기 점검
- 새로운 패키지 추가 시 크기 영향 검토
- 불필요한 파일 및 디렉토리 정기 정리

### 개발팀 가이드라인
- 새 패키지 추가 시 대안 검토
- 번들 크기 임계값 설정 (예: 5MB 이상 시 검토)
- 코드 리뷰 시 성능 및 크기 영향 고려