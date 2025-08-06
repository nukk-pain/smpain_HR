// Remove email index from MongoDB
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'SM_nomu';

async function removeEmailIndex() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🗄️  이메일 인덱스 제거 시작...');
    
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    const users = db.collection('users');
    
    // Check if email index exists
    const indexes = await users.indexes();
    console.log('📋 현재 인덱스 목록:');
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Try to drop email index
    try {
      await users.dropIndex('idx_email_unique');
      console.log('✅ 이메일 인덱스 (idx_email_unique) 제거 완료');
    } catch (error) {
      if (error.code === 27 || error.codeName === 'IndexNotFound') {
        console.log('ℹ️  이메일 인덱스가 이미 존재하지 않습니다');
      } else {
        console.log('⚠️  이메일 인덱스 제거 실패:', error.message);
      }
    }
    
    // Check final indexes
    const finalIndexes = await users.indexes();
    console.log('\n📋 최종 인덱스 목록:');
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n🎉 데이터베이스 정리 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

removeEmailIndex();