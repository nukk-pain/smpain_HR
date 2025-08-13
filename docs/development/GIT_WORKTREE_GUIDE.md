# Git Worktree 사용 가이드

## 개요
Git worktree를 사용하면 동일한 저장소에서 여러 브랜치를 동시에 작업할 수 있는 독립적인 작업 공간을 만들 수 있습니다.

## 사용 시나리오
- 현재 브랜치 작업을 중단하지 않고 다른 브랜치의 긴급 이슈 수정
- 병렬로 여러 기능 개발
- 코드 리뷰하면서 동시에 개발 진행

## 기본 명령어

### Worktree 생성
```bash
# 새 worktree 생성 (기존 브랜치)
git worktree add <경로> <브랜치명>

# 새 브랜치와 함께 worktree 생성
git worktree add -b <새브랜치명> <경로> <기반브랜치>
```

### Worktree 관리
```bash
# worktree 목록 확인
git worktree list

# worktree 제거
git worktree remove <경로>

# 사용하지 않는 worktree 정리
git worktree prune
```

## 실제 사용 예시: Feature 브랜치 작업 중 Master 이슈 수정

### 상황
- 현재 `payroll` 브랜치에서 기능 개발 중
- `master` 브랜치에 긴급 수정이 필요한 이슈 발생
- 현재 작업을 중단하지 않고 이슈 수정 필요

### 해결 방법

#### 1. Master용 Worktree 생성
```bash
# master 브랜치용 독립적인 작업 공간 생성
git worktree add ../HR-hotfix master
```

#### 2. 새 터미널에서 Hotfix 작업
```bash
# 새 작업 공간으로 이동
cd ../HR-hotfix

# 필요시 dependencies 설치
cd backend && npm install
cd ../frontend && npm install

# 이슈 수정
# ... 코드 수정 ...

# 수정사항 커밋 및 푸시
git add .
git commit -m "fix: 이슈 설명"
git push origin master
```

#### 3. 원래 브랜치에서 수정사항 가져오기
```bash
# 원래 디렉토리로 돌아가기
cd ../HR

# 원격 저장소 업데이트
git fetch origin

# 옵션 1: master 전체를 merge
git merge origin/master

# 옵션 2: 특정 커밋만 cherry-pick
git cherry-pick <commit-hash>
```

#### 4. Worktree 정리
```bash
# 작업 완료 후 worktree 제거
git worktree remove ../HR-hotfix
```

## 다른 유용한 패턴들

### 패턴 1: 동일 브랜치 병렬 작업
```bash
# 같은 브랜치는 동시에 체크아웃 불가, 대신 파생 브랜치 생성
git worktree add -b payroll-task1 ../HR-task1 payroll
git worktree add -b payroll-task2 ../HR-task2 payroll
```

### 패턴 2: 코드 리뷰용 Worktree
```bash
# PR 리뷰를 위한 임시 worktree
git worktree add ../HR-review origin/feature-branch
```

### 패턴 3: 실험적 작업
```bash
# 실험적 변경을 위한 worktree
git worktree add -b experiment ../HR-experiment main
```

## 장단점

### 장점
- ✅ 현재 작업 중단 없이 다른 브랜치 작업 가능
- ✅ 독립적인 작업 환경 (빌드 캐시, node_modules 등 분리)
- ✅ 여러 브랜치 동시 테스트 가능
- ✅ stash/unstash 과정 불필요

### 단점
- ❌ 디스크 공간 추가 사용
- ❌ 각 worktree별 dependencies 설치 필요
- ❌ 동일 브랜치는 한 worktree에서만 체크아웃 가능

## 주의사항
- Worktree 디렉토리를 수동으로 삭제하지 말고 `git worktree remove` 사용
- 장기간 사용하지 않는 worktree는 정리 (`git worktree prune`)
- Worktree 내에서도 일반적인 git 명령어 모두 사용 가능

## 대안 방법들

### Stash 사용
```bash
git stash
git checkout master
# 작업...
git checkout feature-branch
git stash pop
```

### Temporary Commit
```bash
git add . && git commit -m "WIP"
git checkout master
# 작업...
git checkout feature-branch
git reset HEAD~1
```

### Cherry-pick
```bash
# master에서 수정 후
git checkout feature-branch
git cherry-pick <master-commit-hash>
```

## 프로젝트별 활용 예시

### HR 프로젝트에서의 활용
1. `payroll` 기능 개발 중 `master`의 보안 이슈 수정
2. `leave-management` 리팩토링 중 `production` 버그 수정
3. 여러 PR 동시 리뷰

### 명령어 체크리스트
- [ ] `git worktree add ../HR-hotfix master` - hotfix용 worktree 생성
- [ ] `cd ../HR-hotfix` - worktree로 이동
- [ ] 작업 수행 및 커밋
- [ ] `git push origin master` - 원격 저장소 업데이트
- [ ] `cd ../HR` - 원래 디렉토리로 복귀
- [ ] `git fetch && git merge origin/master` - 변경사항 가져오기
- [ ] `git worktree remove ../HR-hotfix` - worktree 제거