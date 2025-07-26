const axios = require('axios');

const API_BASE = 'http://localhost:5455/api';

async function testNewLeaveSystem() {
  try {
    console.log('🧪 새로운 휴가 시스템 테스트 시작...\n');
    
    // 1. 로그인
    console.log('1️⃣ 관리자 로그인...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      withCredentials: true
    });
    
    const cookie = loginResponse.headers['set-cookie'];
    console.log('✅ 로그인 성공\n');
    
    // 2. 사용자 목록 조회
    console.log('2️⃣ 사용자 목록 조회...');
    const usersResponse = await axios.get(`${API_BASE}/users`, {
      headers: { Cookie: cookie }
    });
    
    const testUser = usersResponse.data.data.find(u => u.name === '신홍재');
    if (!testUser) {
      console.log('❌ 테스트 사용자(신홍재)를 찾을 수 없습니다.');
      return;
    }
    console.log(`✅ 테스트 사용자: ${testUser.name} (${testUser.employeeId})\n`);
    
    // 3. 휴가 신청 전 잔여일수 확인
    console.log('3️⃣ 휴가 신청 전 잔여일수 확인...');
    const balanceResponse = await axios.get(`${API_BASE}/leave/balance/${testUser._id}`, {
      headers: { Cookie: cookie }
    });
    
    const beforeBalance = balanceResponse.data.data;
    console.log(`✅ 신청 전 잔여연차: ${beforeBalance.remainingAnnualLeave}일\n`);
    
    // 4. 휴가 신청 (관리자가 대신 신청)
    console.log('4️⃣ 휴가 신청 (3일)...');
    
    // 먼저 관리자를 테스트 사용자로 변경
    const switchUserResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: testUser.username || 'EMP001',
      password: 'defaultpassword' // 임시
    }, {
      withCredentials: true
    });
    
    if (switchUserResponse.status !== 200) {
      console.log('⚠️ 사용자 계정으로 로그인 실패, 관리자로 계속 진행...');
    }
    
    const leaveRequest = {
      leaveType: 'annual',
      startDate: '2025-01-27',
      endDate: '2025-01-29',
      reason: '개인 사유',
      substituteEmployee: ''
    };
    
    const createResponse = await axios.post(`${API_BASE}/leave`, leaveRequest, {
      headers: { Cookie: cookie }
    });
    
    console.log(`✅ 휴가 신청 성공: ${createResponse.data.message}`);
    const requestId = createResponse.data.data.id;
    console.log(`📋 신청 ID: ${requestId}\n`);
    
    // 5. 휴가 신청 후 잔여일수 확인
    console.log('5️⃣ 휴가 신청 후 잔여일수 확인...');
    const afterBalanceResponse = await axios.get(`${API_BASE}/leave/balance/${testUser._id}`, {
      headers: { Cookie: cookie }
    });
    
    const afterBalance = afterBalanceResponse.data.data;
    console.log(`✅ 신청 후 잔여연차: ${afterBalance.remainingAnnualLeave}일`);
    console.log(`📊 차감된 일수: ${beforeBalance.remainingAnnualLeave - afterBalance.remainingAnnualLeave}일\n`);
    
    // 6. 관리자로 다시 로그인
    console.log('6️⃣ 관리자로 재로그인...');
    await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin'
    }, {
      withCredentials: true
    });
    
    // 7. 휴가 거부 테스트
    console.log('7️⃣ 휴가 거부 테스트...');
    const rejectResponse = await axios.post(`${API_BASE}/leave/${requestId}/approve`, {
      action: 'reject',
      comment: '테스트 거부'
    }, {
      headers: { Cookie: cookie }
    });
    
    console.log(`✅ 휴가 거부 성공: ${rejectResponse.data.message}`);
    if (rejectResponse.data.balanceRestored) {
      console.log(`💰 복구된 연차: ${rejectResponse.data.balanceRestored}일\n`);
    }
    
    // 8. 거부 후 잔여일수 확인
    console.log('8️⃣ 거부 후 잔여일수 확인...');
    const finalBalanceResponse = await axios.get(`${API_BASE}/leave/balance/${testUser._id}`, {
      headers: { Cookie: cookie }
    });
    
    const finalBalance = finalBalanceResponse.data.data;
    console.log(`✅ 거부 후 잔여연차: ${finalBalance.remainingAnnualLeave}일`);
    console.log(`🔄 복구 확인: ${finalBalance.remainingAnnualLeave === beforeBalance.remainingAnnualLeave ? '성공' : '실패'}\n`);
    
    console.log('🎉 새로운 휴가 시스템 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.response?.data || error.message);
  }
}

testNewLeaveSystem();