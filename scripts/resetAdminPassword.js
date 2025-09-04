const path = require('path');
const { MongoClient } = require(path.join(__dirname, '../backend/node_modules/mongodb'));
const bcrypt = require(path.join(__dirname, '../backend/node_modules/bcryptjs'));

// MongoDB 연결 설정
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'SM_nomu';

console.log(`🔗 연결 대상: ${MONGODB_URI.includes('localhost') ? '로컬 MongoDB' : 'MongoDB Atlas'}`);

async function resetAdminPassword() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔐 Admin 비밀번호 재설정 시작...');
    
    // MongoDB 연결
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // admin 사용자 확인
    console.log('🔍 admin 계정 확인 중...');
    const adminUser = await db.collection('users').findOne({ username: 'admin' });
    
    if (!adminUser) {
      // admin 계정이 없으면 생성
      console.log('🆕 admin 계정이 없어서 새로 생성합니다...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      const newAdmin = {
        username: 'admin',
        password: hashedPassword,
        name: '시스템 관리자',
        employeeId: 'ADMIN001',
        department: '',
        position: '',
        role: 'admin',  // 소문자로 통일
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
      console.log('📝 계정 정보: username: admin, password: admin');
    } else {
      // admin 계정이 존재하면 비밀번호만 재설정
      console.log('🔄 admin 계정 비밀번호 재설정 중...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      
      await db.collection('users').updateOne(
        { username: 'admin' },
        { 
          $set: { 
            password: hashedPassword,
            role: 'admin',  // 소문자로 통일
            isActive: true,
            updatedAt: new Date()
          }
        }
      );
      console.log('✅ admin 계정 비밀번호 재설정 완료');
      console.log('📝 새 비밀번호: admin');
      console.log(`📝 현재 role: ${adminUser.role} → admin`);
    }
    
    console.log('\n✅ 작업 완료!');
    console.log('🔐 로그인 정보:');
    console.log('   - Username: admin');
    console.log('   - Password: admin');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('🔌 MongoDB 연결 종료');
  }
}

// 스크립트 실행
resetAdminPassword();