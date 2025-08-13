# 리팩토링 문서 인덱스

## Payroll-Enhanced 리팩토링 문서 목록 (순서대로)

### 📚 계획 및 전략 문서

1. **[01-payroll-enhanced-refactoring-plan-original.md](01-payroll-enhanced-refactoring-plan-original.md)**
   - 원본 리팩토링 계획
   - 기존 파일 재활용 전략
   - 예상 파일 크기 및 구조

2. **[02-refactoring-order-strategy.md](02-refactoring-order-strategy.md)**
   - 리팩토링 순서 결정 문서
   - "Payroll-Enhanced 먼저, Admin.js 나중에" 전략
   - 의사결정 매트릭스

3. **[03-payroll-enhanced-refactoring-step-by-step.md](03-payroll-enhanced-refactoring-step-by-step.md)** ⭐
   - **실행 가이드 (현재 사용 중)**
   - Phase별 상세 작업 내용
   - 테스트 및 롤백 계획

4. **[04-admin-split-decision-guide.md](04-admin-split-decision-guide.md)**
   - Admin.js 분할 의사결정 가이드
   - 3가지 옵션 비교
   - 미래 계획 (3개월 후)

~~5. Excel processor 리팩토링~~ ✅ **완료됨**
   - 파일 이동: `completed/05-excel-processor-refactoring-COMPLETED.md`
   - 완료 일자: 2025년 8월 12일
   - 결과: services/excel/ 폴더로 성공적으로 분할

---

## 🚀 현재 진행 상황

**사용 중인 문서**: `03-payroll-enhanced-refactoring-step-by-step.md`

**현재 Phase**: Phase 1 - payrollUtils.js 생성 준비

**전략**: 
- Payroll-Enhanced.js 제거 우선
- Admin.js는 분할하지 않고 adminPayroll.js 별도 생성
- 위험 최소화 접근

---

## 📅 예상 일정

- **Week 1**: Phase 1-4 (payrollUtils, reports, adminPayroll, upload)
- **Week 2**: Phase 5-7 (payroll, 통합, 테스트)
- **완료**: payroll-enhanced.js 제거
- **3개월 후**: admin.js 분할 재검토

---

## 📂 완료된 리팩토링

**위치**: `/mnt/d/my_programs/HR/completed/`

- **Excel Processor 리팩토링** ✅
  - 완료일: 2025년 8월 12일
  - 문서: `05-excel-processor-refactoring-COMPLETED.md`
  - 결과: `services/excel/` 폴더로 성공적으로 분할

---

## 기타 관련 문서

### 기능 개발 계획
- `plan.md` - 전체 프로젝트 계획
- `plan-payroll-features.md` - Payroll 기능 계획
- `plan-payroll-phase1.md` - Payroll Phase 1 계획

### Excel 관련
- `Excel_급여업로드_프리뷰_기능_개발계획.md`
- `Excel급여업로드_프로세스_분석.md`

### 기타
- `mongodb-atlas-to-local-migration.md` - MongoDB 마이그레이션
- `DEPLOYMENT_GUIDE.md` - 배포 가이드

---

## ⚠️ 중요 규칙

1. **진행 중인 리팩토링**: Root 폴더에 번호 접두사로 보관
2. **완료된 리팩토링**: `/completed/` 폴더로 이동
3. **실행 가이드**: `03-payroll-enhanced-refactoring-step-by-step.md` 사용