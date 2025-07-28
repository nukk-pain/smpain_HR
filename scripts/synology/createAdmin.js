const path = require('path');
const { MongoClient } = require(path.join(__dirname, '../../backend/node_modules/mongodb'));
const bcrypt = require(path.join(__dirname, '../../backend/node_modules/bcryptjs'));

// MongoDB 연결 설정 - 시놀로지 Docker 환경 (Replica Set 연결)
const url = 'mongodb://hr_app_user:Hr2025Secure@localhost:27018,localhost:27019,localhost:27020/SM_nomu?replicaSet=hrapp&authSource=SM_nomu&readPreference=primary';
const dbName = 'SM_nomu';

async function createAdminUser() {
  const client = new MongoClient(url);
  
  try {
    console.log('🔐 HR 시스템 Admin 계정 생성 (시놀로지 버전)...');
    console.log('📡 연결 중: localhost:27018 (Primary 노드)');
    
    // MongoDB 연결
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // 기존 admin 사용자 확인
    console.log('\n🔍 기존 admin 계정 확인 중...');
    const existingAdmin = await db.collection('users').findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('⚠️  admin 계정이 이미 존재합니다.');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        rl.question('비밀번호를 재설정하시겠습니까? (yes/no): ', async (answer) => {
          if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
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
            console.log('💡 새 로그인 정보: admin / admin');
          } else {
            console.log('❌ 작업 취소됨');
          }
          rl.close();
          resolve();
        });
      });
    } else {
      // admin 계정 생성
      console.log('🆕 새 admin 계정 생성 중...');
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
      console.log('\n📋 생성된 계정 정보:');
      console.log('- 사용자명: admin');
      console.log('- 비밀번호: admin');
      console.log('- 이름: 시스템 관리자');
      console.log('- 권한: 전체 관리자 권한');
    }
    
    console.log('\n🎉 작업 완료!');
    
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
    }
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

// 실행
console.log('🏢 시놀로지 HR 시스템 Admin 계정 관리');
console.log('━'.repeat(50));
createAdminUser();