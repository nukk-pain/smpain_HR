#!/usr/bin/env node

// Node.js 데이터베이스 초기화 스크립트
// 실행 방법: node scripts/reset-database.mjs

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const MONGODB_URL = 'mongodb://localhost:27017';
const DB_NAME = 'SM_nomu';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function resetDatabase() {
  console.log('🗄️ HR 시스템 데이터베이스 초기화 시작...');
  console.log('⚠️ 이 작업은 기존 데이터를 모두 삭제합니다!\n');

  // 확인 메시지
  const confirm = await askQuestion('정말로 데이터베이스를 초기화하시겠습니까? (y/N): ');
  
  if (confirm.toLowerCase() !== 'y') {
    console.log('❌ 초기화가 취소되었습니다.');
    rl.close();
    return;
  }

  let client;
  
  try {
    // MongoDB 연결
    console.log('\n🔄 MongoDB에 연결 중...');
    client = new MongoClient(MONGODB_URL);
    await client.connect();
    
    const db = client.db(DB_NAME);
    console.log('✅ MongoDB 연결 성공');

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
    console.log('\n🗑️ 컬렉션 삭제 중...');
    for (const collectionName of collectionsToDelete) {
      try {
        await db.collection(collectionName).drop();
        console.log(`✅ ${collectionName} 컬렉션 삭제 완료`);
      } catch (error) {
        if (error.codeName === 'NamespaceNotFound') {
          console.log(`⚠️ ${collectionName} 컬렉션이 존재하지 않음`);
        } else {
          console.log(`❌ ${collectionName} 삭제 실패:`, error.message);
        }
      }
    }

    // admin이 아닌 사용자 삭제
    console.log('\n👥 사용자 데이터 초기화 중...');
    const deleteResult = await db.collection('users').deleteMany({
      "username": { $ne: "admin" }
    });
    console.log(`🗑️ ${deleteResult.deletedCount}명의 사용자 삭제 완료`);

    // admin 사용자 확인 및 생성
    console.log('\n🔐 admin 계정 확인 중...');
    const adminUser = await db.collection('users').findOne({"username": "admin"});

    if (!adminUser) {
      console.log('🆕 admin 계정 생성 중...');
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
      
      await db.collection('users').insertOne(newAdmin);
      console.log('✅ admin 계정 생성 완료');
    } else {
      console.log('✅ admin 계정이 이미 존재합니다');
    }

    // 최종 상태 확인
    console.log('\n📋 초기화 완료 후 상태:');
    const userCount = await db.collection('users').countDocuments();
    const leaveCount = await db.collection('leaveRequests').countDocuments();
    const exceptionCount = await db.collection('leaveExceptions').countDocuments();
    
    console.log(`👤 남은 사용자 수: ${userCount}`);
    console.log(`🏖️ 휴가 신청 수: ${leaveCount}`);
    console.log(`⚙️ 예외 설정 수: ${exceptionCount}`);

    // 남은 사용자 목록 출력
    console.log('\n👥 남은 사용자 목록:');
    const users = await db.collection('users').find({}, {
      projection: { username: 1, name: 1, role: 1 }
    }).toArray();
    
    users.forEach(user => {
      console.log(`- ${user.username} (${user.name}) - ${user.role}`);
    });

    console.log('\n🎉 데이터베이스 초기화 완료!');
    console.log('💡 로그인 정보: admin / admin');
    console.log('🌐 접속: http://localhost:3727');

  } catch (error) {
    console.error('\n❌ 초기화 중 오류 발생:', error.message);
    console.log('💡 MongoDB가 실행 중인지 확인해주세요.');
  } finally {
    if (client) {
      await client.close();
    }
    rl.close();
  }
}

// 스크립트 실행
resetDatabase();