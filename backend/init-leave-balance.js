const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'SM_nomu';

async function initLeaveBalance() {
  const client = new MongoClient(url);
  
  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // 1. leaveBalance가 undefined인 사용자들을 15일로 초기화
    const result = await db.collection('users').updateMany(
      { leaveBalance: { $exists: false } },
      { $set: { leaveBalance: 15 } }
    );
    
    console.log(`${result.modifiedCount}명의 사용자 연차를 15일로 초기화했습니다.`);
    
    // 2. 업데이트 후 상태 확인
    console.log('\n=== 업데이트 후 사용자별 잔여 연차 ===');
    const users = await db.collection('users').find({}, {
      projection: { name: 1, leaveBalance: 1, employeeId: 1 }
    }).toArray();
    
    users.forEach(user => {
      console.log(`${user.name} (${user.employeeId}): ${user.leaveBalance}일`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

initLeaveBalance();