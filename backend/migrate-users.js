const { connectToDatabase } = require('./utils/database');

async function migrateUsers() {
  try {
    const { db } = await connectToDatabase();
    console.log('✅ Connected to MongoDB');
    
    // Update admin user
    await db.collection('users').updateOne(
      { username: 'admin' },
      {
        $set: {
          hireDate: new Date('2024-01-01'),
          department: 'IT',
          position: 'System Administrator',
          employeeId: 'ADM001',
          phone: '010-1234-5678',
          accountNumber: '123-456-789012',
          managerId: null,
          contractType: 'regular',
          terminationDate: null
        }
      }
    );
    console.log('✅ Updated admin user');

    // Update 신홍재
    await db.collection('users').updateOne(
      { username: 'shin' },
      {
        $set: {
          hireDate: new Date('2023-03-15'),
          department: '영업1팀',
          position: '대리',
          employeeId: 'EMP001',
          phone: '010-1111-2222',
          accountNumber: '111-222-333444',
          managerId: null,
          contractType: 'regular',
          terminationDate: null,
          incentiveFormula: 'sales * 0.15'
        }
      }
    );
    console.log('✅ Updated shin user');

    // Update 정민정
    await db.collection('users').updateOne(
      { username: 'jung' },
      {
        $set: {
          hireDate: new Date('2023-06-01'),
          department: '영업2팀',
          position: '사원',
          employeeId: 'EMP002',
          phone: '010-3333-4444',
          accountNumber: '333-444-555666',
          managerId: null,
          contractType: 'regular',
          terminationDate: null
        }
      }
    );
    console.log('✅ Updated jung user');

    // Update 오현중
    await db.collection('users').updateOne(
      { username: 'oh' },
      {
        $set: {
          hireDate: new Date('2022-01-10'),
          department: '영업1팀',
          position: '과장',
          employeeId: 'MGR001',
          phone: '010-5555-6666',
          accountNumber: '555-666-777888',
          managerId: null,
          contractType: 'regular',
          terminationDate: null
        }
      }
    );
    console.log('✅ Updated oh user');

    // Update 김채영
    await db.collection('users').updateOne(
      { username: 'kim' },
      {
        $set: {
          hireDate: new Date('2023-09-01'),
          department: '영업2팀',
          position: '사원',
          employeeId: 'EMP003',
          phone: '010-7777-8888',
          accountNumber: '777-888-999000',
          managerId: null,
          contractType: 'contract',
          terminationDate: null
        }
      }
    );
    console.log('✅ Updated kim user');

    // Verify updates
    console.log('\n📊 Updated Users:');
    const users = await db.collection('users').find({}, {
      projection: { password: 0 }
    }).toArray();
    
    users.forEach((user) => {
      console.log(`\n${user.name} (${user.username})`);
      console.log(`   Department: ${user.department}`);
      console.log(`   Position: ${user.position}`);
      console.log(`   Employee ID: ${user.employeeId}`);
      console.log(`   Hire Date: ${user.hireDate ? new Date(user.hireDate).toLocaleDateString('ko-KR') : 'N/A'}`);
      console.log(`   Contract Type: ${user.contractType}`);
      console.log(`   Phone: ${user.phone}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers().then(() => {
  console.log('\n✅ Migration completed');
  process.exit(0);
});