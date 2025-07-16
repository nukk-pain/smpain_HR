const { MongoClient } = require('mongodb');

async function testConnection() {
  try {
    console.log('🔗 MongoDB 연결 시도...');
    const client = new MongoClient('mongodb://hr_app_user:HrSecure2025@localhost:27018');
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db('SM_nomu');
    const adminUser = await db.collection('users').findOne({username: 'admin'});
    console.log('👤 Admin 사용자 확인:', adminUser ? 'OK' : 'NOT FOUND');
    
    const userCount = await db.collection('users').countDocuments();
    console.log('📊 전체 사용자 수:', userCount);
    
    await client.close();
  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
    console.error('상세 오류:', error);
  }
}

testConnection();