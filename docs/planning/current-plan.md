# HR 시스템 버그 수정 계획

## 개요
테스트 과정에서 발견된 4개의 주요 이슈에 대한 체계적인 수정 계획입니다. 우선순위별로 정리하여 안정적인 시스템 운영을 보장합니다.

## 🚨 발견된 이슈 요약

### 긴급 (High Priority)
1. **사용자 생성 bcrypt 오류** - 새 사용자 등록 불가

### 높음 (Medium Priority)  
2. **휴가 승인 API 오류** - Manager/Admin 휴가 승인 불가
3. **휴가 데이터 업데이트 손실** - 휴가 수정 시 데이터 손실

### 중간 (Low Priority)
4. **연차 계산 로직 검토** - 일부 사용자 연차 잘못 계산

---

## 🔧 상세 수정 계획

### Issue #1: 사용자 생성 bcrypt 오류 (긴급)

#### 문제 상황
- **위치**: `backend/routes/users.js`
- **오류**: `"bcrypt is not defined"`
- **영향**: 새 사용자 생성 기능 완전 차단
- **재현**: POST /api/users 요청 시 서버 오류 발생

#### 근본 원인 분석
```javascript
// 현재 상태 (추정)
// backend/routes/users.js 상단에 bcrypt import 누락
const express = require('express');
// const bcrypt = require('bcryptjs'); // 이 줄이 누락됨

// 사용자 패스워드 해싱 시도
const hashedPassword = bcrypt.hashSync(password, 10); // 오류 발생
```

#### 수정 방안
**파일**: `backend/routes/users.js`

1. **Import 구문 추가**
```javascript
// 파일 상단에 추가
const bcrypt = require('bcryptjs');
```

2. **검증 코드 추가**
```javascript
// 사용자 생성 함수에서 패스워드 해싱 전 검증
if (!password || password.length < 6) {
  return res.status(400).json({ 
    success: false, 
    error: 'Password must be at least 6 characters' 
  });
}

const hashedPassword = bcrypt.hashSync(password, 10);
```

#### 테스트 방법
```bash
# 수정 후 테스트
curl -X POST http://localhost:5455/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user_fix",
    "password": "testpass123",
    "name": "테스트 사용자",
    "role": "user"
  }' \
  -b /tmp/cookies.txt
```

#### 예상 소요 시간
- **개발**: 10분
- **테스트**: 10분
- **총 소요**: 20분

---

### Issue #2: 휴가 승인 API 오류 (높음)

#### 문제 상황
- **위치**: `backend/routes/leave.js`
- **오류**: `"Invalid action"` 응답
- **영향**: Manager/Admin이 휴가 승인/거절 불가
- **재현**: POST /api/leave/:id/approve 요청 시 오류

#### 근본 원인 분석
```javascript
// 현재 상태 (추정)
router.post('/:id/approve', async (req, res) => {
  const { approved, note } = req.body;
  
  // 승인 로직이 잘못 구현되었거나 라우트 핸들러 누락
  if (!approved && !note) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  // 실제 승인 처리 로직 누락
});
```

#### 수정 방안
**파일**: `backend/routes/leave.js`

1. **승인 엔드포인트 재구현**
```javascript
// POST /api/leave/:id/approve
router.post('/:id/approve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, note, rejectionReason } = req.body;
    
    // 권한 확인
    const userPermissions = req.session.user.permissions || [];
    if (!userPermissions.includes('leave:manage')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }
    
    // 휴가 신청 조회
    const leaveRequest = await db.collection('leave_requests').findOne({
      _id: new ObjectId(id)
    });
    
    if (!leaveRequest) {
      return res.status(404).json({ 
        success: false, 
        error: 'Leave request not found' 
      });
    }
    
    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Leave request already processed' 
      });
    }
    
    // 승인/거절 처리
    const updateData = {
      status: approved ? 'approved' : 'rejected',
      approvedBy: req.session.user._id,
      approvedAt: new Date(),
      note: note || '',
      rejectionReason: approved ? null : (rejectionReason || ''),
      updatedAt: new Date()
    };
    
    // 승인된 경우 연차 차감
    if (approved) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(leaveRequest.userId) },
        { 
          $inc: { leaveBalance: -leaveRequest.actualLeaveDays }
        }
      );
    }
    
    // 휴가 신청 상태 업데이트
    await db.collection('leave_requests').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    res.json({
      success: true,
      message: approved ? 'Leave request approved' : 'Leave request rejected',
      data: { ...leaveRequest, ...updateData }
    });
    
  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process leave request' 
    });
  }
});
```

2. **거절 전용 엔드포인트 추가 (선택사항)**
```javascript
// POST /api/leave/:id/reject
router.post('/:id/reject', requireAuth, async (req, res) => {
  // 거절 전용 로직
});
```

#### 테스트 방법
```bash
# 승인 테스트
curl -X POST "http://localhost:5455/api/leave/{LEAVE_ID}/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "note": "승인 완료"
  }' \
  -b /tmp/cookies.txt

# 거절 테스트  
curl -X POST "http://localhost:5455/api/leave/{LEAVE_ID}/approve" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": false,
    "rejectionReason": "인력 부족으로 거절"
  }' \
  -b /tmp/cookies.txt
```

#### 예상 소요 시간
- **개발**: 45분
- **테스트**: 15분
- **총 소요**: 1시간

---

### Issue #3: 휴가 데이터 업데이트 손실 (높음)

#### 문제 상황
- **위치**: `backend/routes/leave.js` PUT 핸들러
- **오류**: 업데이트 시 기존 데이터가 null로 변경됨
- **영향**: 휴가 수정 기능 데이터 손실
- **재현**: PUT /api/leave/:id 요청 후 데이터 확인

#### 근본 원인 분석
```javascript
// 현재 상태 (추정) - 잘못된 업데이트 로직
router.put('/:id', async (req, res) => {
  const updateData = req.body;
  
  // 문제: 전체 문서를 req.body로 교체하거나 $unset 사용
  await db.collection('leave_requests').updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData } // 기존 필드들이 undefined로 덮어씌워짐
  );
});
```

#### 수정 방안
**파일**: `backend/routes/leave.js`

1. **안전한 부분 업데이트 로직**
```javascript
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, reason, daysCount } = req.body;
    
    // 기존 데이터 조회
    const existingRequest = await db.collection('leave_requests').findOne({
      _id: new ObjectId(id)
    });
    
    if (!existingRequest) {
      return res.status(404).json({ 
        success: false, 
        error: 'Leave request not found' 
      });
    }
    
    // 권한 확인 (본인 또는 관리자만)
    if (existingRequest.userId !== req.session.user._id && 
        !req.session.user.permissions.includes('leave:manage')) {
      return res.status(403).json({ 
        success: false, 
        error: 'Permission denied' 
      });
    }
    
    // pending 상태만 수정 가능
    if (existingRequest.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot modify processed leave request' 
      });
    }
    
    // 안전한 업데이트 데이터 구성 (기존 값 보존)
    const updateData = {
      updatedAt: new Date()
    };
    
    // 제공된 필드만 업데이트
    if (startDate !== undefined) {
      updateData.startDate = startDate;
    }
    if (endDate !== undefined) {
      updateData.endDate = endDate;
    }
    if (reason !== undefined) {
      updateData.reason = reason;
    }
    if (daysCount !== undefined) {
      updateData.daysCount = daysCount;
      updateData.actualLeaveDays = daysCount; // 실제 차감일수도 함께 업데이트
    }
    
    // 날짜 유효성 검사
    if (updateData.startDate || updateData.endDate) {
      const start = new Date(updateData.startDate || existingRequest.startDate);
      const end = new Date(updateData.endDate || existingRequest.endDate);
      
      if (start >= end) {
        return res.status(400).json({ 
          success: false, 
          error: 'End date must be after start date' 
        });
      }
      
      // 3일 사전 신청 규칙 확인
      const today = new Date();
      const diffDays = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 3) {
        return res.status(400).json({ 
          success: false, 
          error: '휴가는 최소 3일 전에 신청해야 합니다.' 
        });
      }
    }
    
    // 업데이트 실행
    const result = await db.collection('leave_requests').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Leave request not found' 
      });
    }
    
    // 업데이트된 데이터 조회
    const updatedRequest = await db.collection('leave_requests').findOne({
      _id: new ObjectId(id)
    });
    
    res.json({
      success: true,
      message: 'Leave request updated successfully',
      data: updatedRequest
    });
    
  } catch (error) {
    console.error('Update leave error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update leave request' 
    });
  }
});
```

2. **업데이트 필드 검증 미들웨어 추가**
```javascript
const validateLeaveUpdate = (req, res, next) => {
  const allowedFields = ['startDate', 'endDate', 'reason', 'daysCount'];
  const updateFields = Object.keys(req.body);
  
  const invalidFields = updateFields.filter(field => !allowedFields.includes(field));
  
  if (invalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `Invalid fields: ${invalidFields.join(', ')}`
    });
  }
  
  next();
};

// 라우트에 적용
router.put('/:id', requireAuth, validateLeaveUpdate, async (req, res) => {
  // 위의 업데이트 로직
});
```

#### 테스트 방법
```bash
# 부분 업데이트 테스트
curl -X PUT "http://localhost:5455/api/leave/{LEAVE_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "수정된 휴가 사유"
  }' \
  -b /tmp/cookies.txt

# 업데이트 후 데이터 확인
curl -X GET "http://localhost:5455/api/leave/{LEAVE_ID}" \
  -b /tmp/cookies.txt
```

#### 예상 소요 시간
- **개발**: 1시간
- **테스트**: 20분
- **총 소요**: 1시간 20분

---

### Issue #4: 연차 계산 로직 검토 (중간)

#### 문제 상황
- **위치**: `backend/utils/leaveUtils.js`
- **오류**: 신홍재(2년차)가 25일로 계산됨 (16일이어야 함)
- **영향**: 일부 사용자의 연차가 부정확하게 표시
- **재현**: 사용자 목록에서 yearsOfService와 annualLeave 불일치

#### 근본 원인 분석
```javascript
// 현재 상태 (추정) - 잘못된 연차 계산 공식
function calculateAnnualLeave(hireDate, contractType) {
  const years = calculateYearsOfService(hireDate);
  
  if (contractType === 'contract') {
    return Math.min(years * 12, 11); // 신입 월별 적립
  }
  
  // 문제: 계산 공식이 잘못됨
  return Math.min(15 + (years - 1), 25); // 25일 상한선이 잘못 적용
}
```

#### 올바른 연차 계산 규칙
```javascript
/**
 * 연차 계산 규칙:
 * - 신입(첫해): 월별 적립 (입사월에 따라 1~11일)
 * - 1년차: 15일
 * - 2년차: 16일 (15 + 1)
 * - 3년차: 17일 (15 + 2)
 * - ...
 * - 최대: 25일 (11년차부터)
 */
```

#### 수정 방안
**파일**: `backend/utils/leaveUtils.js`

1. **연차 계산 함수 재구현**
```javascript
/**
 * 정확한 연차 계산 함수
 * @param {Date|string} hireDate - 입사일
 * @param {string} contractType - 계약 유형 ('regular', 'contract')
 * @param {Date} baseDate - 기준일 (기본값: 현재)
 * @returns {number} 연차 일수
 */
function calculateAnnualLeave(hireDate, contractType = 'regular', baseDate = new Date()) {
  const hire = new Date(hireDate);
  const base = new Date(baseDate);
  
  // 입사년도와 기준년도 비교
  const hireYear = hire.getFullYear();
  const baseYear = base.getFullYear();
  const yearsOfService = baseYear - hireYear;
  
  // 계약직의 경우 다른 규칙 적용 (필요시)
  if (contractType === 'contract') {
    return calculateContractLeave(hire, base);
  }
  
  // 신입사원 (입사 첫해)
  if (yearsOfService === 0) {
    return calculateFirstYearLeave(hire, base);
  }
  
  // 정규직 연차 계산: 15 + (근속년수 - 1), 최대 25일
  const annualDays = Math.min(15 + (yearsOfService - 1), 25);
  
  return annualDays;
}

/**
 * 첫해 월별 연차 적립 계산
 */
function calculateFirstYearLeave(hireDate, baseDate = new Date()) {
  const hire = new Date(hireDate);
  const base = new Date(baseDate);
  
  // 입사월부터 12월까지 개월수 계산
  const hireMonth = hire.getMonth() + 1; // 1-12
  const baseMonth = base.getMonth() + 1;
  
  // 같은 해가 아니면 0 반환
  if (hire.getFullYear() !== base.getFullYear()) {
    return 0;
  }
  
  // 입사월부터 현재월까지의 개월수 (최대 11일)
  const monthsWorked = Math.max(0, baseMonth - hireMonth + 1);
  return Math.min(monthsWorked, 11);
}

/**
 * 계약직 연차 계산 (필요시 별도 규칙 적용)
 */
function calculateContractLeave(hireDate, baseDate = new Date()) {
  // 계약직도 동일한 규칙 적용하거나 별도 규칙 구현
  return calculateAnnualLeave(hireDate, 'regular', baseDate);
}

/**
 * 근속년수 계산
 * @param {Date|string} hireDate - 입사일
 * @param {Date} baseDate - 기준일
 * @returns {number} 근속년수
 */
function calculateYearsOfService(hireDate, baseDate = new Date()) {
  const hire = new Date(hireDate);
  const base = new Date(baseDate);
  
  let years = base.getFullYear() - hire.getFullYear();
  
  // 생일이 지나지 않았으면 1년 차감
  const hireAnniversary = new Date(base.getFullYear(), hire.getMonth(), hire.getDate());
  if (base < hireAnniversary) {
    years--;
  }
  
  return Math.max(0, years);
}
```

2. **사용자별 연차 재계산 스크립트**
```javascript
// backend/scripts/recalculate-leave-balance.js
const { MongoClient } = require('mongodb');
const { calculateAnnualLeave, calculateYearsOfService } = require('../utils/leaveUtils');

async function recalculateAllUserLeave() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('SM_nomu');
  
  console.log('연차 재계산 시작...');
  
  const users = await db.collection('users').find({}).toArray();
  let updated = 0;
  
  for (const user of users) {
    if (!user.hireDate) continue;
    
    const yearsOfService = calculateYearsOfService(user.hireDate);
    const annualLeave = calculateAnnualLeave(user.hireDate, user.contractType);
    
    // 계산된 값이 기존과 다르면 업데이트
    if (user.yearsOfService !== yearsOfService || user.annualLeave !== annualLeave) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            yearsOfService,
            annualLeave,
            updatedAt: new Date()
          }
        }
      );
      
      console.log(`${user.name}: ${user.annualLeave} → ${annualLeave}일`);
      updated++;
    }
  }
  
  console.log(`연차 재계산 완료: ${updated}명 업데이트됨`);
  await client.close();
}

// 실행
if (require.main === module) {
  recalculateAllUserLeave().catch(console.error);
}

module.exports = { recalculateAllUserLeave };
```

3. **사용자 조회 시 실시간 계산 적용**
```javascript
// backend/routes/users.js에서 사용자 조회 시
router.get('/', requireAuth, async (req, res) => {
  try {
    const users = await db.collection('users').find({}).toArray();
    
    // 실시간 연차 계산 적용
    const usersWithUpdatedLeave = users.map(user => ({
      ...user,
      yearsOfService: calculateYearsOfService(user.hireDate),
      annualLeave: calculateAnnualLeave(user.hireDate, user.contractType)
    }));
    
    res.json({
      success: true,
      data: usersWithUpdatedLeave
    });
  } catch (error) {
    // 에러 처리
  }
});
```

#### 테스트 방법
```bash
# 연차 재계산 스크립트 실행
node backend/scripts/recalculate-leave-balance.js

# 사용자별 연차 확인
curl -X GET "http://localhost:5455/api/users" \
  -b /tmp/cookies.txt | jq '.data[] | {name, hireDate, yearsOfService, annualLeave}'

# 특정 사용자 상세 확인
curl -X GET "http://localhost:5455/api/users/68833b3cd3919be8b385e7ae" \
  -b /tmp/cookies.txt
```

#### 예상 소요 시간
- **개발**: 1시간 30분
- **테스트**: 30분
- **총 소요**: 2시간

---

## 📅 전체 수정 일정

### Phase 1: 긴급 이슈 해결 (1시간)
- **Issue #1**: 사용자 생성 bcrypt 오류 (20분)
- **테스트 및 검증** (40분)

### Phase 2: 높음 우선순위 이슈 (2시간 30분)
- **Issue #2**: 휴가 승인 API 오류 (1시간)
- **Issue #3**: 휴가 데이터 업데이트 손실 (1시간 20분)
- **테스트 및 검증** (10분)

### Phase 3: 중간 우선순위 이슈 (2시간)
- **Issue #4**: 연차 계산 로직 검토 (2시간)

### 총 예상 소요 시간: 5시간 30분

## 🧪 수정 후 검증 계획

### 전체 기능 회귀 테스트
```bash
# 1. 사용자 관리 테스트
curl -X POST http://localhost:5455/api/users -H "Content-Type: application/json" -d '{"username":"test_fixed","password":"test123","name":"테스트","role":"user"}' -b /tmp/cookies.txt

# 2. 휴가 승인 테스트  
curl -X POST http://localhost:5455/api/leave/{ID}/approve -H "Content-Type: application/json" -d '{"approved":true,"note":"승인"}' -b /tmp/cookies.txt

# 3. 휴가 수정 테스트
curl -X PUT http://localhost:5455/api/leave/{ID} -H "Content-Type: application/json" -d '{"reason":"수정된 사유"}' -b /tmp/cookies.txt

# 4. 연차 계산 확인
curl -X GET http://localhost:5455/api/users -b /tmp/cookies.txt | jq '.data[] | {name, yearsOfService, annualLeave}'
```

### 성능 확인
- API 응답 시간 유지 (목표: <200ms)
- 데이터베이스 쿼리 성능 유지 (목표: <100ms)

## 🎯 완료 기준

### 각 이슈별 완료 조건
1. **Issue #1**: 새 사용자 생성 API 정상 작동
2. **Issue #2**: 휴가 승인/거절 API 정상 작동  
3. **Issue #3**: 휴가 수정 시 기존 데이터 보존
4. **Issue #4**: 모든 사용자 연차 정확히 계산됨

### 전체 완료 조건
- ✅ 모든 이슈 수정 완료
- ✅ 회귀 테스트 통과
- ✅ 성능 기준 유지
- ✅ 코드 리뷰 완료
- ✅ 문서 업데이트 완료

---

## 📝 참고사항

### 개발 환경 고려사항
- MongoDB 단일 인스턴스 환경에서 테스트
- 트랜잭션 대신 순차 처리 방식 유지
- 기존 세션 기반 인증 시스템 호환성 유지

### 위험 요소 및 대응
1. **데이터 손실 위험**: 수정 전 데이터베이스 백업 필수
2. **서비스 중단**: 점진적 배포로 영향 최소화
3. **성능 저하**: 각 수정 후 성능 테스트 실시

### 배포 전 체크리스트
- [ ] 로컬 환경에서 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 데이터베이스 백업 완료
- [ ] 롤백 계획 수립
- [ ] 모니터링 준비

이 수정 계획을 통해 HR 시스템의 모든 주요 기능이 안정적으로 작동할 수 있습니다.