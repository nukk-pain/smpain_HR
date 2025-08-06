# DB 데이터 일관성 및 충돌 확인 계획

## 1. 현재 문제 상황
- 사용자 생성 시 'manager' role 오류 발생 (기존 DB에 'manager' role 사용자 존재 추정)
- 프론트엔드 role 선택 옵션과 DB 실제 데이터 불일치
- 사용자 목록에 기존 DB 사용자들이 제대로 표시되지 않을 가능성

## 2. 확인해야 할 항목들

### 2.1 Role 데이터 일관성
- [ ] **기존 사용자들의 role 값 확인**
  ```javascript
  db.users.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } }
  ])
  ```
- [ ] **'manager' role 사용자 존재 여부**
- [ ] **유효하지 않은 role 값들 식별**
- [ ] **role 마이그레이션 계획 수립**

### 2.2 사용자 생성 충돌 검사
- [ ] **Username 중복 검사 강화**
  ```javascript
  // 백엔드에서 대소문자 구분 없이 검사
  const existingUser = await db.collection('users').findOne({ 
    username: { $regex: new RegExp(`^${username}$`, 'i') }
  });
  ```
- [ ] **EmployeeId 중복 검사**
- [ ] **Email 중복 검사 (있는 경우)**
- [ ] **PhoneNumber 중복 검사**

### 2.3 데이터 스키마 일관성
- [ ] **필수 필드 누락 확인**
  ```javascript
  db.users.find({
    $or: [
      { username: { $exists: false } },
      { name: { $exists: false } },
      { role: { $exists: false } }
    ]
  })
  ```
- [ ] **Date 필드 형식 확인** (hireDate, birthDate)
- [ ] **VisibleTeams 구조 확인**
- [ ] **Permissions 배열 구조 확인**

### 2.4 프론트엔드 표시 문제
- [ ] **사용자 목록 로딩 확인**
- [ ] **필터링 및 정렬 동작 확인**
- [ ] **Role별 권한 표시 확인**
- [ ] **Department/Position 데이터 매칭 확인**

## 3. 구체적인 검사 스크립트

### 3.1 DB 상태 확인 스크립트
```javascript
// scripts/checkDbConsistency.js
const { MongoClient } = require('mongodb');

async function checkDbConsistency() {
  // 1. Role 분포 확인
  const roleStats = await db.collection('users').aggregate([
    { $group: { _id: "$role", count: { $sum: 1 }, users: { $push: "$username" } } }
  ]).toArray();
  
  // 2. 필수 필드 누락 확인
  const missingFields = await db.collection('users').find({
    $or: [
      { username: { $exists: false } },
      { name: { $exists: false } },
      { role: { $exists: false } },
      { employeeId: { $exists: false } }
    ]
  }).toArray();
  
  // 3. 중복 데이터 확인
  const duplicateUsernames = await db.collection('users').aggregate([
    { $group: { _id: "$username", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  
  return { roleStats, missingFields, duplicateUsernames };
}
```

### 3.2 데이터 마이그레이션 스크립트
```javascript
// scripts/migrateUserData.js
async function migrateUserData() {
  // 1. 'manager' role을 'supervisor'로 변경
  await db.collection('users').updateMany(
    { role: 'manager' },
    { $set: { role: 'supervisor' } }
  );
  
  // 2. 누락된 필수 필드 추가
  await db.collection('users').updateMany(
    { employeeId: { $exists: false } },
    { $set: { employeeId: 'TEMP' + Date.now() } }
  );
  
  // 3. visibleTeams 구조 표준화
  await db.collection('users').updateMany(
    { visibleTeams: { $exists: false } },
    { $set: { visibleTeams: [] } }
  );
}
```

## 4. 백엔드 검증 강화

### 4.1 사용자 생성 시 추가 검증
```javascript
// routes/users.js - CREATE 엔드포인트 강화
const createUserValidation = {
  // Username 중복 (대소문자 무시)
  checkUsernameConflict: async (username) => {
    return await db.collection('users').findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
  },
  
  // EmployeeId 중복
  checkEmployeeIdConflict: async (employeeId) => {
    return await db.collection('users').findOne({ employeeId });
  },
  
  // Role 유효성 (legacy 포함)
  validateRole: (role) => {
    const validRoles = ['admin', 'supervisor', 'user'];
    const legacyRoles = { 'manager': 'supervisor' };
    
    if (legacyRoles[role]) return legacyRoles[role];
    return validRoles.includes(role) ? role : null;
  }
};
```

### 4.2 에러 메시지 개선
```javascript
// 구체적인 충돌 정보 제공
if (existingUser) {
  return res.status(400).json({ 
    error: 'Username already exists',
    conflict: {
      field: 'username',
      value: username,
      existingUser: existingUser._id
    }
  });
}
```

## 5. 프론트엔드 개선 사항

### 5.1 실시간 중복 검사
- [ ] **Username 입력 시 실시간 중복 확인**
- [ ] **EmployeeId 자동 생성 전 충돌 확인**
- [ ] **더 구체적인 오류 메시지 표시**

### 5.2 사용자 목록 디버깅
- [ ] **API 응답 데이터 로그 확인**
- [ ] **필터링 로직 검증**
- [ ] **Role 매핑 정확성 확인**

## 6. 실행 순서

1. **DB 현황 파악** (checkDbConsistency.js 실행)
2. **데이터 마이그레이션** (필요시 migrateUserData.js 실행)
3. **백엔드 검증 로직 강화**
4. **프론트엔드 에러 처리 개선**
5. **전체 기능 테스트**

## 7. 테스트 케이스

### 7.1 사용자 생성 테스트
- [ ] 정상적인 신규 사용자 생성
- [ ] Username 중복 시 오류 처리
- [ ] 잘못된 role 값 처리
- [ ] 필수 필드 누락 시 오류 처리

### 7.2 사용자 목록 테스트
- [ ] 모든 기존 사용자 표시 확인
- [ ] Role별 필터링 동작 확인
- [ ] Department별 필터링 동작 확인
- [ ] 검색 기능 동작 확인

## 8. 모니터링 및 로깅

### 8.1 추가 로깅
- [ ] 사용자 생성/수정 시 상세 로그
- [ ] DB 쿼리 성능 모니터링
- [ ] 에러 발생 패턴 분석

### 8.2 알림 설정
- [ ] 중복 데이터 감지 시 알림
- [ ] 스키마 불일치 감지 시 알림
- [ ] 대량 데이터 변경 시 백업 알림

---

## 즉시 실행할 작업 (우선순위 순)

1. **DB 현황 확인**: `db.users.find({role: "manager"}).count()`
2. **Role 데이터 분석**: 모든 role 값 조회 및 분석
3. **사용자 목록 API 응답 확인**: 프론트엔드에서 실제 로딩되는 데이터 검증
4. **백엔드 충돌 검사 로직 추가**: username, employeeId 중복 방지
5. **프론트엔드 에러 처리 개선**: 더 구체적인 오류 메시지 표시