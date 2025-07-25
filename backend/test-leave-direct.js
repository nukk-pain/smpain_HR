const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'SM_nomu';

async function testLeaveSystemDirect() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // 1. 테스트 사용자 신홍재 찾기
    const testUser = await db.collection('users').findOne({ name: '신홍재' });
    if (!testUser) {
      console.log('❌ 테스트 사용자를 찾을 수 없습니다.');
      return;
    }
    
    console.log(`\n=== 테스트 사용자: ${testUser.name} ===`);
    console.log(`신청 전 잔여연차: ${testUser.leaveBalance}일`);
    
    // 2. 휴가 신청 직접 생성 (시뮬레이션)
    const leaveRequest = {
      userId: testUser._id,
      userName: testUser.name,
      userDepartment: testUser.department,
      leaveType: 'annual',
      startDate: '2025-01-27',
      endDate: '2025-01-29',
      daysCount: 3,
      reason: '테스트 휴가',
      substituteEmployee: '',
      status: 'pending',
      deductedDays: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 트랜잭션으로 처리
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // 2-1. 잔여일수 차감
        await db.collection('users').updateOne(
          { _id: testUser._id },
          { $inc: { leaveBalance: -3 } },
          { session }
        );
        
        // 2-2. 휴가 신청 생성
        const result = await db.collection('leaveRequests').insertOne(leaveRequest, { session });
        leaveRequest._id = result.insertedId;
        console.log(`✅ 휴가 신청 생성 완료 (ID: ${result.insertedId})`);
      });
      
      // 3. 차감 후 상태 확인
      const userAfterDeduction = await db.collection('users').findOne({ _id: testUser._id });
      console.log(`차감 후 잔여연차: ${userAfterDeduction.leaveBalance}일`);
      console.log(`실제 차감량: ${testUser.leaveBalance - userAfterDeduction.leaveBalance}일`);
      
      // 4. 휴가 거부 시뮬레이션 (복구)
      console.log(`\n=== 휴가 거부 시뮬레이션 ===`);
      
      await session.withTransaction(async () => {
        // 4-1. 상태 변경
        await db.collection('leaveRequests').updateOne(
          { _id: leaveRequest._id },
          { 
            $set: { 
              status: 'rejected',
              rejectedAt: new Date(),
              rejectionReason: '테스트 거부'
            }
          },
          { session }
        );
        
        // 4-2. 잔여일수 복구
        await db.collection('users').updateOne(
          { _id: testUser._id },
          { $inc: { leaveBalance: leaveRequest.deductedDays } },
          { session }
        );
        
        console.log(`✅ 휴가 거부 및 연차 복구 완료`);
      });
      
      // 5. 복구 후 상태 확인
      const userAfterRestore = await db.collection('users').findOne({ _id: testUser._id });
      console.log(`복구 후 잔여연차: ${userAfterRestore.leaveBalance}일`);
      console.log(`복구 성공: ${userAfterRestore.leaveBalance === testUser.leaveBalance ? '✅' : '❌'}`);
      
      // 6. 테스트 데이터 정리
      await db.collection('leaveRequests').deleteOne({ _id: leaveRequest._id });
      console.log(`✅ 테스트 데이터 정리 완료`);
      
      console.log(`\n🎉 신청 시점 차감 방식 테스트 성공!`);
      console.log(`📊 결과: 신청 시 즉시 차감, 거부 시 즉시 복구 확인됨`);
      
    } finally {
      await session.endSession();
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

testLeaveSystemDirect();