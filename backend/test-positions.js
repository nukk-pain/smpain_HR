const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'SM_nomu';

async function testPositions() {
  const client = new MongoClient(url);
  
  try {
    console.log('🔍 Testing Position functionality...');
    
    // MongoDB 연결
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    const db = client.db(dbName);
    
    // 1. 현재 positions 컬렉션 상태 확인
    console.log('\n📊 현재 positions 컬렉션 상태:');
    const positions = await db.collection('positions').find({}).toArray();
    console.log(`총 ${positions.length}개의 position 발견:`);
    positions.forEach((pos, idx) => {
      console.log(`${idx + 1}. ID: ${pos._id}, name: "${pos.name}", isActive: ${pos.isActive}`);
    });
    
    // 2. 활성화된 positions만 조회 (API와 동일한 쿼리)
    console.log('\n🔍 활성화된 positions만 조회:');
    const activePositions = await db.collection('positions')
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray();
    console.log(`활성화된 position ${activePositions.length}개:`);
    activePositions.forEach((pos, idx) => {
      console.log(`${idx + 1}. name: "${pos.name}", department: "${pos.department || 'N/A'}", description: "${pos.description || 'N/A'}"`);
    });
    
    // 3. 테스트용 position 생성
    console.log('\n🆕 테스트용 position 생성 중...');
    const testPosition = {
      name: 'Test Engineer',
      description: 'Software testing and quality assurance',
      department: 'IT',
      baseSalary: 50000,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-script'
    };
    
    // 중복 체크
    const existing = await db.collection('positions').findOne({ name: testPosition.name });
    if (existing) {
      console.log('⚠️ "Test Engineer" position이 이미 존재합니다.');
    } else {
      const result = await db.collection('positions').insertOne(testPosition);
      console.log(`✅ 테스트 position 생성됨. ID: ${result.insertedId}`);
    }
    
    // 4. 다시 조회해서 확인
    console.log('\n🔄 업데이트된 positions 목록:');
    const updatedPositions = await db.collection('positions')
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray();
    console.log(`현재 활성화된 position ${updatedPositions.length}개:`);
    updatedPositions.forEach((pos, idx) => {
      console.log(`${idx + 1}. name: "${pos.name}", department: "${pos.department || 'N/A'}"`);
    });
    
    // 5. API 응답 형식으로 변환 테스트
    console.log('\n🔧 API 응답 형식 테스트:');
    const apiResponse = {
      success: true,
      data: updatedPositions.map(position => ({
        ...position,
        id: position._id,
        title: position.name  // 프론트엔드 호환성
      }))
    };
    
    console.log('API 응답 형식:');
    apiResponse.data.forEach((pos, idx) => {
      console.log(`${idx + 1}. id: ${pos.id}, title: "${pos.title}", name: "${pos.name}"`);
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await client.close();
    console.log('\n👋 MongoDB 연결 종료');
  }
}

testPositions();