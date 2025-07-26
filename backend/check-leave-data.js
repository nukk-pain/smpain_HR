const { connectToDatabase } = require('./utils/database');

async function checkLeaveData() {
  
  try {
    const { db } = await connectToDatabase();
    console.log('✅ MongoDB 연결 성공');
    
    // 1. 사용자별 잔여 연차 현황
    console.log('\n=== 사용자별 잔여 연차 현황 ===');
    const users = await db.collection('users').find({}, {
      projection: { name: 1, leaveBalance: 1, employeeId: 1 }
    }).toArray();
    
    users.forEach(user => {
      console.log(`${user.name} (${user.employeeId}): ${user.leaveBalance || 'undefined'}일`);
    });
    
    // 2. 휴가 신청 상태별 현황
    console.log('\n=== 휴가 신청 상태별 현황 ===');
    const leaveStats = await db.collection('leaveRequests').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$daysCount' }
        }
      }
    ]).toArray();
    
    leaveStats.forEach(stat => {
      console.log(`${stat._id}: ${stat.count}건, ${stat.totalDays}일`);
    });
    
    // 3. 현재 pending 상태 신청들 상세
    console.log('\n=== Pending 상태 신청 상세 ===');
    const pendingRequests = await db.collection('leaveRequests').find({
      status: 'pending'
    }).toArray();
    
    console.log(`총 ${pendingRequests.length}건의 pending 신청`);
    pendingRequests.forEach(req => {
      console.log(`- 사용자ID: ${req.userId}, 일수: ${req.daysCount}일, 시작일: ${req.startDate}`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkLeaveData().then(() => {
  console.log('\n✅ Leave data check completed');
  process.exit(0);
});