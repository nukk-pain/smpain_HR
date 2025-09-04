# 📢 DEPLOY-01 배포 공지

## 한국어 버전

### HR System v1.0.0 Production 배포 안내

**배포 일정**: 2025년 09월 XX일 XX:00 KST  
**예상 다운타임**: 없음 (무중단 배포)  
**대상 시스템**: SM Pain HR Management System

#### 📌 주요 변경사항

1. **보안 강화**
   - 급여 관리 기능 Admin 권한 전용으로 변경
   - JWT 기반 인증 시스템 전환 완료
   - 토큰 자동 갱신 기능 추가

2. **권한 변경 사항**
   - **Admin**: 모든 기능 접근 가능 (변경 없음)
   - **Supervisor**: 급여 메뉴 접근 불가 (중요 변경)
   - **일반 사용자**: 기존과 동일

3. **기술적 개선**
   - 응답 속도 개선
   - 데이터베이스 인덱스 최적화
   - 에러 처리 강화

#### ⚠️ 사용자 영향

- **모든 사용자**: 첫 접속 시 재로그인 필요
- **Supervisor 권한 사용자**: 급여 메뉴가 더 이상 표시되지 않음
- **세션 만료**: 24시간 후 자동 로그아웃 (기존 동일)

#### 📞 문의처

- 기술 지원: IT 개발팀
- 긴급 문의: XXX-XXXX-XXXX
- 이메일: hr-support@smpain.com

---

## English Version

### HR System v1.0.0 Production Deployment Notice

**Deployment Schedule**: September XX, 2025 XX:00 KST  
**Expected Downtime**: None (Zero-downtime deployment)  
**Target System**: SM Pain HR Management System

#### 📌 Major Changes

1. **Security Enhancement**
   - Payroll management restricted to Admin role only
   - JWT-based authentication system migration completed
   - Automatic token refresh feature added

2. **Permission Changes**
   - **Admin**: Full access maintained
   - **Supervisor**: Payroll menu access removed (Important change)
   - **Regular Users**: No changes

3. **Technical Improvements**
   - Improved response times
   - Database index optimization
   - Enhanced error handling

#### ⚠️ User Impact

- **All users**: Re-login required on first access
- **Supervisor role users**: Payroll menu will no longer be visible
- **Session timeout**: Automatic logout after 24 hours (unchanged)

#### 📞 Contact Information

- Technical Support: IT Development Team
- Emergency Contact: XXX-XXXX-XXXX
- Email: hr-support@smpain.com

---

## 배포 후 확인 사항 (내부용)

### 즉시 확인 (배포 직후)
- [ ] 프로덕션 URL 접속 확인
- [ ] Admin 계정 로그인 테스트
- [ ] Supervisor 계정 급여 접근 차단 확인
- [ ] 일반 사용자 로그인 테스트

### 30분 내 확인
- [ ] 에러 로그 모니터링
- [ ] API 응답 시간 확인
- [ ] 데이터베이스 연결 상태

### 24시간 모니터링
- [ ] 사용자 피드백 수집
- [ ] 성능 메트릭 분석
- [ ] 에러 발생률 확인

---

**작성일**: 2025년 09월 04일  
**작성자**: 개발팀  
**승인자**: _______________