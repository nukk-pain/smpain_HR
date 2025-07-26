const path = require('path');
const { MongoClient } = require(path.join(__dirname, '../../backend/node_modules/mongodb'));
const bcrypt = require(path.join(__dirname, '../../backend/node_modules/bcryptjs'));

// MongoDB 연결 설정 - 시놀로지 Docker 환경 (단일 노드 연결)
const url = 'mongodb://hr_app_user:Hr2025Secure@localhost:27018/SM_nomu?authSource=SM_nomu';
const dbName = 'SM_nomu';

async function resetDatabase() {
  const client = new MongoClient(url);
  
  try {
    console.log('🗄️  HR 시스템 데이터베이스 초기화 시작 (시놀로지 버전)...');
    console.log('📡 연결 중: localhost:27018 (Primary 노드)');
    
    // MongoDB 연결
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // 삭제할 컬렉션 목록
    const collectionsToDelete = [
      'leaveRequests',
      'leaveExceptions', 
      'leaveAdjustments',
      'monthly_payments',
      'payroll',
      'bonuses',
      'sales_data',
      'departments',
      'positions',
      'sessions'  // 세션도 초기화
    ];
    
    // 각 컬렉션 삭제
    for (const collection of collectionsToDelete) {
      try {
        await db.collection(collection).drop();
        console.log(`✅ ${collection} 컬렉션 삭제 완료`);
      } catch (err) {
        // 컬렉션이 존재하지 않는 경우 무시
        if (err.code !== 26) {  // 26 = NamespaceNotFound
          console.log(`⚠️  ${collection} 삭제 중 오류:`, err.message);
        }
      }
    }
    
    // admin이 아닌 사용자 삭제
    console.log('\n👥 사용자 데이터 초기화 중...');
    const deleteResult = await db.collection('users').deleteMany({ username: { $ne: 'admin' } });
    console.log(`🗑️  ${deleteResult.deletedCount}명의 사용자 삭제 완료`);
    
    // admin 사용자 확인 및 업데이트
    console.log('\n🔐 admin 계정 확인 중...');
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    
    if (!adminUser) {
      // admin 계정이 없으면 생성
      console.log('🆕 admin 계정 생성 중...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      const newAdmin = {
        username: 'admin',
        password: hashedPassword,
        name: '시스템 관리자',
        email: 'admin@company.com',
        employeeId: 'ADMIN001',
        department: '',
        position: '',
        role: 'admin',
        baseSalary: 0,
        hireDate: new Date(),
        permissions: [
          'users:view', 'users:manage',
          'leave:view', 'leave:manage', 
          'payroll:view', 'payroll:manage',
          'reports:view', 'files:view', 'files:manage',
          'departments:view', 'departments:manage',
          'admin:permissions'
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.collection('users').insertOne(newAdmin);
      console.log('✅ admin 계정 생성 완료');
    } else {
      // admin 계정이 존재하면 비밀번호만 재설정
      console.log('🔄 admin 계정 비밀번호 재설정 중...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      await db.collection('users').updateOne(
        { username: 'admin' },
        { 
          $set: { 
            password: hashedPassword,
            updatedAt: new Date()
          } 
        }
      );
      console.log('✅ admin 계정 비밀번호 재설정 완료');
    }
    
    
    // 최종 상태 확인
    console.log('\n📋 초기화 완료 후 상태:');
    const userCount = await db.collection('users').countDocuments();
    const leaveCount = await db.collection('leaveRequests').countDocuments();
    
    console.log(`👤 남은 사용자 수: ${userCount}`);
    console.log(`🏖️  휴가 신청 수: ${leaveCount}`);
    
    // 남은 사용자 목록 출력
    console.log('\n👥 남은 사용자 목록:');
    const users = await db.collection('users').find({}, { projection: { username: 1, name: 1, role: 1 } }).toArray();
    users.forEach(user => {
      console.log(`- ${user.username} (${user.name}) - ${user.role}`);
    });
    
    console.log('\n🎉 데이터베이스 초기화 완료!');
    console.log('💡 로그인 정보: admin / admin');
    console.log('📍 시놀로지 MongoDB 포트: 27018');
    
  } catch (error) {
    console.error('❌ 초기화 중 오류 발생:', error);
    
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
    }
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

// 확인 프롬프트
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🏢 시놀로지 HR 시스템 데이터베이스 초기화');
console.log('━'.repeat(50));
console.log('⚠️  경고: 이 작업은 admin 계정을 제외한 모든 데이터를 삭제합니다!');
console.log('📍 대상: 시놀로지 Docker MongoDB (포트: 27018)');
console.log('━'.repeat(50));

rl.question('정말로 계속하시겠습니까? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    resetDatabase();
  } else {
    console.log('❌ 초기화 취소됨');
  }
  rl.close();
});