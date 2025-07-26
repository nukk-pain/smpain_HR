const { connectToDatabase } = require('./utils/database');

async function testPositionAPI() {
  
  try {
    console.log('🔍 Testing Position API logic...');
    
    // MongoDB 연결
    const { db } = await connectToDatabase();
    console.log('✅ MongoDB 연결 성공');
    
    // 1. 직접 MongoDB 쿼리 (API와 동일한 쿼리)
    console.log('\n📊 Direct MongoDB Query:');
    const directQuery = await db.collection('positions')
      .find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .toArray();
    
    console.log(`Direct query result: ${directQuery.length} positions`);
    directQuery.forEach((pos, idx) => {
      console.log(`${idx + 1}. _id: ${pos._id}, name: "${pos.name}", isActive: ${pos.isActive}`);
    });
    
    // 2. API 응답 형식으로 변환 (백엔드 로직과 동일)
    console.log('\n🔧 API Response Format:');
    const apiResponse = {
      success: true,
      data: directQuery.map(position => ({
        ...position,
        id: position._id,
        title: position.name  // 프론트엔드 호환성
      }))
    };
    
    console.log(`API response data length: ${apiResponse.data.length}`);
    apiResponse.data.forEach((pos, idx) => {
      console.log(`${idx + 1}. id: ${pos.id}, title: "${pos.title}", name: "${pos.name}"`);
    });
    
    // 3. 모든 positions 확인 (isActive 조건 없이)
    console.log('\n🔍 All positions (without isActive filter):');
    const allPositions = await db.collection('positions').find({}).toArray();
    console.log(`Total positions in DB: ${allPositions.length}`);
    allPositions.forEach((pos, idx) => {
      console.log(`${idx + 1}. _id: ${pos._id}, name: "${pos.name}", isActive: ${pos.isActive}`);
    });
    
    // 4. isActive 필드 상태 확인
    console.log('\n🔎 isActive field analysis:');
    const activeTrue = await db.collection('positions').countDocuments({ isActive: true });
    const activeFalse = await db.collection('positions').countDocuments({ isActive: false });
    const activeUndefined = await db.collection('positions').countDocuments({ isActive: { $exists: false } });
    const activeNull = await db.collection('positions').countDocuments({ isActive: null });
    
    console.log(`isActive: true = ${activeTrue}`);
    console.log(`isActive: false = ${activeFalse}`);
    console.log(`isActive: undefined = ${activeUndefined}`);
    console.log(`isActive: null = ${activeNull}`);
    
    // 5. 쿼리 조건 테스트
    console.log('\n🧪 Query condition tests:');
    
    // 조건 1: { isActive: { $ne: false } }
    const condition1 = await db.collection('positions').find({ isActive: { $ne: false } }).toArray();
    console.log(`{ isActive: { $ne: false } } = ${condition1.length} positions`);
    
    // 조건 2: { $or: [ { isActive: true }, { isActive: { $exists: false } } ] }
    const condition2 = await db.collection('positions').find({ 
      $or: [ { isActive: true }, { isActive: { $exists: false } } ] 
    }).toArray();
    console.log(`{ $or: [ { isActive: true }, { isActive: { $exists: false } } ] } = ${condition2.length} positions`);
    
    // 조건 3: { isActive: { $ne: false, $exists: true } }
    const condition3 = await db.collection('positions').find({ 
      isActive: { $ne: false, $exists: true } 
    }).toArray();
    console.log(`{ isActive: { $ne: false, $exists: true } } = ${condition3.length} positions`);
    
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

testPositionAPI().then(() => {
  console.log('\n✅ Test API completed');
  process.exit(0);
});