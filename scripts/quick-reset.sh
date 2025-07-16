#!/bin/bash

echo "🗄️ HR 시스템 데이터베이스 빠른 초기화..."
echo "⚠️ 이 작업은 admin을 제외한 모든 데이터를 삭제합니다!"
echo ""

read -p "계속하시겠습니까? (y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "❌ 취소되었습니다."
    exit 1
fi

echo "🔄 초기화 실행 중..."

# MongoDB 명령어를 한 번에 실행
mongo SM_nomu --eval "
print('🗄️ 데이터베이스 초기화 시작...');

// 컬렉션 삭제
try { db.leaveRequests.drop(); print('✅ leaveRequests 삭제'); } catch(e) {}
try { db.leaveExceptions.drop(); print('✅ leaveExceptions 삭제'); } catch(e) {}
try { db.leaveAdjustments.drop(); print('✅ leaveAdjustments 삭제'); } catch(e) {}
try { db.monthly_payments.drop(); print('✅ monthly_payments 삭제'); } catch(e) {}
try { db.bonuses.drop(); print('✅ bonuses 삭제'); } catch(e) {}
try { db.sales_data.drop(); print('✅ sales_data 삭제'); } catch(e) {}
try { db.departments.drop(); print('✅ departments 삭제'); } catch(e) {}
try { db.positions.drop(); print('✅ positions 삭제'); } catch(e) {}

// admin 외 사용자 삭제
var result = db.users.deleteMany({username: {\$ne: 'admin'}});
print('🗑️ ' + result.deletedCount + '명 사용자 삭제');

// admin 계정 확인 및 생성
var admin = db.users.findOne({username: 'admin'});
if (!admin) {
    db.users.insertOne({
        username: 'admin',
        password: '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
        name: '시스템 관리자',
        department: 'IT',
        position: '관리자',
        role: 'admin',
        baseSalary: 0,
        hireDate: new Date(),
        permissions: ['users:view', 'users:manage', 'leave:view', 'leave:manage', 'payroll:view', 'payroll:manage', 'reports:view', 'files:view', 'files:manage', 'departments:view', 'departments:manage', 'admin:permissions'],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    print('✅ admin 계정 생성 완료');
} else {
    print('✅ admin 계정 확인됨');
}

print('🎉 초기화 완료!');
print('💡 로그인: admin / admin');
"

echo ""
echo "✅ 데이터베이스 초기화 완료!"
echo "🔑 로그인 정보: admin / admin"
echo "🌐 접속: http://localhost:3727"