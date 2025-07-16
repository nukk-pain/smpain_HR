// MongoDB 데이터베이스 초기화 스크립트
// 실행 방법: mongo SM_nomu reset-database.js

print("🗄️ HR 시스템 데이터베이스 초기화 시작...");

// 현재 데이터베이스 확인
print("📊 현재 데이터베이스:", db.getName());

// 삭제할 컬렉션 목록
const collectionsToDelete = [
  'leaveRequests',
  'leaveExceptions', 
  'leaveAdjustments',
  'monthly_payments',
  'bonuses',
  'sales_data',
  'departments',
  'positions'
];

// 각 컬렉션 삭제
collectionsToDelete.forEach(collection => {
  const result = db[collection].drop();
  if (result) {
    print(`✅ ${collection} 컬렉션 삭제 완료`);
  } else {
    print(`⚠️ ${collection} 컬렉션이 존재하지 않거나 삭제 실패`);
  }
});

// admin이 아닌 사용자 삭제
print("👥 사용자 데이터 초기화 중...");
const deleteResult = db.users.deleteMany({"username": {$ne: "admin"}});
print(`🗑️ ${deleteResult.deletedCount}명의 사용자 삭제 완료`);

// admin 사용자 확인 및 업데이트
print("🔐 admin 계정 확인 중...");
const adminUser = db.users.findOne({"username": "admin"});

if (!adminUser) {
  // admin 계정이 없으면 생성
  print("🆕 admin 계정 생성 중...");
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin', 10);
  
  const newAdmin = {
    username: 'admin',
    password: hashedPassword,
    name: '시스템 관리자',
    department: 'IT',
    position: '관리자',
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
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  db.users.insertOne(newAdmin);
  print("✅ admin 계정 생성 완료");
} else {
  print("✅ admin 계정이 이미 존재합니다");
}

// 최종 상태 확인
print("\n📋 초기화 완료 후 상태:");
print("👤 남은 사용자 수:", db.users.countDocuments());
print("🏖️ 휴가 신청 수:", db.leaveRequests.countDocuments());
print("⚙️ 예외 설정 수:", db.leaveExceptions.countDocuments());

// 남은 사용자 목록 출력
print("\n👥 남은 사용자 목록:");
db.users.find({}, {username: 1, name: 1, role: 1}).forEach(user => {
  print(`- ${user.username} (${user.name}) - ${user.role}`);
});

print("\n🎉 데이터베이스 초기화 완료!");
print("💡 로그인 정보: admin / admin");