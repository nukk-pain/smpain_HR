// 간단한 MongoDB 초기화 스크립트 (의존성 없음)
// 실행 방법: mongo SM_nomu simple-reset.js

print("🗄️ HR 시스템 데이터베이스 초기화 시작...");

// 현재 데이터베이스 확인
print("📊 현재 데이터베이스:", db.getName());

// 컬렉션 삭제
print("\n🗑️ 컬렉션 삭제 중...");

try { db.leaveRequests.drop(); print("✅ leaveRequests 삭제"); } catch(e) { print("⚠️ leaveRequests 없음"); }
try { db.leaveExceptions.drop(); print("✅ leaveExceptions 삭제"); } catch(e) { print("⚠️ leaveExceptions 없음"); }
try { db.leaveAdjustments.drop(); print("✅ leaveAdjustments 삭제"); } catch(e) { print("⚠️ leaveAdjustments 없음"); }
try { db.monthly_payments.drop(); print("✅ monthly_payments 삭제"); } catch(e) { print("⚠️ monthly_payments 없음"); }
try { db.bonuses.drop(); print("✅ bonuses 삭제"); } catch(e) { print("⚠️ bonuses 없음"); }
try { db.sales_data.drop(); print("✅ sales_data 삭제"); } catch(e) { print("⚠️ sales_data 없음"); }
try { db.departments.drop(); print("✅ departments 삭제"); } catch(e) { print("⚠️ departments 없음"); }
try { db.positions.drop(); print("✅ positions 삭제"); } catch(e) { print("⚠️ positions 없음"); }

// admin이 아닌 사용자 삭제
print("\n👥 사용자 데이터 초기화 중...");
var deleteResult = db.users.deleteMany({"username": {$ne: "admin"}});
print("🗑️ " + deleteResult.deletedCount + "명의 사용자 삭제 완료");

// admin 계정 확인
print("\n🔐 admin 계정 확인 중...");
var adminUser = db.users.findOne({"username": "admin"});

if (!adminUser) {
    print("🆕 admin 계정 생성 중...");
    
    // bcryptjs 해시 생성 (admin 패스워드)
    // $2a$10$N9qo8uLOickgx2ZMRZoMye 는 'admin'의 bcrypt 해시
    var newAdmin = {
        username: 'admin',
        password: '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', // 'admin' 해시
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
db.users.find({}, {username: 1, name: 1, role: 1}).forEach(function(user) {
    print("- " + user.username + " (" + user.name + ") - " + user.role);
});

print("\n🎉 데이터베이스 초기화 완료!");
print("💡 로그인 정보: admin / admin");
print("🌐 접속: http://localhost:3727 또는 http://[서버IP]:3727");