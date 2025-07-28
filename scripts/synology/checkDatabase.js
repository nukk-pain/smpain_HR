const path = require('path');
const { MongoClient } = require(path.join(__dirname, '../../backend/node_modules/mongodb'));

// MongoDB 연결 설정 - 시놀로지 Docker 환경 (단일 노드 연결)
const url = 'mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu&directConnection=true';
const dbName = 'SM_nomu';

async function checkDatabase() {
  const client = new MongoClient(url);
  
  try {
    console.log('🔍 HR 시스템 데이터베이스 상태 확인 (시놀로지 버전)...');
    console.log('📡 연결 중: localhost:27018 (Primary 노드)');
    console.log('━'.repeat(60));
    
    // MongoDB 연결
    await client.connect();
    console.log('✅ MongoDB 연결 성공\n');
    
    const db = client.db(dbName);
    
    // 컬렉션 목록 확인
    console.log('📁 컬렉션 목록:');
    const collections = await db.listCollections().toArray();
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count}개 문서`);
    }
    
    // 사용자 통계
    console.log('\n👥 사용자 통계:');
    const totalUsers = await db.collection('users').countDocuments();
    const activeUsers = await db.collection('users').countDocuments({ isActive: true });
    const adminUsers = await db.collection('users').countDocuments({ role: 'admin' });
    const managerUsers = await db.collection('users').countDocuments({ role: 'manager' });
    const normalUsers = await db.collection('users').countDocuments({ role: 'user' });
    
    console.log(`  - 전체 사용자: ${totalUsers}명`);
    console.log(`  - 활성 사용자: ${activeUsers}명`);
    console.log(`  - 관리자: ${adminUsers}명`);
    console.log(`  - 매니저: ${managerUsers}명`);
    console.log(`  - 일반 사용자: ${normalUsers}명`);
    
    // 휴가 통계
    console.log('\n🏖️  휴가 신청 통계:');
    const totalLeaveRequests = await db.collection('leaveRequests').countDocuments();
    const pendingRequests = await db.collection('leaveRequests').countDocuments({ status: 'pending' });
    const approvedRequests = await db.collection('leaveRequests').countDocuments({ status: 'approved' });
    const rejectedRequests = await db.collection('leaveRequests').countDocuments({ status: 'rejected' });
    
    console.log(`  - 전체 휴가 신청: ${totalLeaveRequests}건`);
    console.log(`  - 대기 중: ${pendingRequests}건`);
    console.log(`  - 승인됨: ${approvedRequests}건`);
    console.log(`  - 거절됨: ${rejectedRequests}건`);
    
    // 부서 정보
    console.log('\n🏢 부서 정보:');
    const departments = await db.collection('departments').find({}).toArray();
    if (departments.length > 0) {
      for (const dept of departments) {
        const userCount = await db.collection('users').countDocuments({ department: dept.name });
        console.log(`  - ${dept.name}: ${userCount}명`);
      }
    } else {
      console.log('  - 등록된 부서 없음');
    }
    
    // 최근 활동
    console.log('\n📊 최근 활동:');
    const recentUsers = await db.collection('users')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentUsers.length > 0) {
      console.log('  최근 생성된 사용자:');
      recentUsers.forEach(user => {
        const date = user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '날짜 없음';
        console.log(`    - ${user.username} (${user.name}) - ${date}`);
      });
    }
    
    // 시스템 정보
    console.log('\n⚙️  시스템 정보:');
    console.log(`  - 데이터베이스: ${dbName}`);
    console.log('  - 연결 포트: 27018 (Primary)');
    console.log('  - 인증 사용자: hr_app_user');
    console.log('  - 연결 모드: Direct (단일 노드)');
    
    // Admin 계정 확인
    console.log('\n🔐 Admin 계정:');
    const adminAccount = await db.collection('users').findOne({ username: 'admin' });
    if (adminAccount) {
      console.log('  ✅ admin 계정 존재');
      console.log(`  - 이름: ${adminAccount.name}`);
      console.log(`  - 상태: ${adminAccount.isActive ? '활성' : '비활성'}`);
    } else {
      console.log('  ❌ admin 계정 없음 (createAdmin-synology.js 실행 필요)');
    }
    
    console.log('\n━'.repeat(60));
    console.log('✅ 데이터베이스 상태 확인 완료');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    
    // 연결 오류 시 도움말 제공
    if (error.name === 'MongoServerError' || error.name === 'MongoNetworkError') {
      console.log('\n💡 연결 오류 해결 방법:');
      console.log('1. 시놀로지에서 Docker 컨테이너가 실행 중인지 확인');
      console.log('   docker ps | grep mongo-hr');
      console.log('2. 포트 27018이 열려있는지 확인');
      console.log('3. 인증 정보가 올바른지 확인');
      console.log('   - 사용자명: hr_app_user');
      console.log('   - 비밀번호: Hr2025Secure');
      console.log('   - 데이터베이스: SM_nomu');
      console.log('4. 방화벽 설정 확인');
    }
  } finally {
    await client.close();
  }
}

// 실행
checkDatabase();