// Script to add sample payslips for testing
const { MongoClient, ObjectId } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGO_URL = 'mongodb://localhost:27017';
const DB_NAME = 'SM_nomu';

async function addSamplePayslips() {
  const client = new MongoClient(MONGO_URL);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const payslipsCollection = db.collection('payslips');
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);
    
    if (users.length === 0) {
      console.log('No users found, creating sample users...');
      
      // Create sample users
      const sampleUsers = [
        {
          _id: new ObjectId(),
          username: 'john.doe',
          password: '$2a$10$YourHashedPasswordHere', // You'd need to hash this properly
          name: 'John Doe',
          employeeId: 'EMP001',
          role: 'User',
          department: '개발',
          position: 'Senior Developer',
          email: 'john.doe@company.com',
          phone: '010-1234-5678',
          hireDate: new Date('2020-01-15'),
          contractType: 'regular',
          permissions: ['leave:view', 'payroll:view'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: new ObjectId(),
          username: 'jane.smith',
          password: '$2a$10$YourHashedPasswordHere',
          name: 'Jane Smith',
          employeeId: 'EMP002',
          role: 'User',
          department: '영업',
          position: 'Sales Manager',
          email: 'jane.smith@company.com',
          phone: '010-2345-6789',
          hireDate: new Date('2019-06-01'),
          contractType: 'regular',
          permissions: ['leave:view', 'payroll:view'],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      await usersCollection.insertMany(sampleUsers);
      console.log('✅ Created sample users');
      users.push(...sampleUsers);
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'backend', 'uploads', 'payslips');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads/payslips directory');
    }
    
    // Create sample PDF file
    const samplePdfPath = path.join(uploadsDir, 'sample_payslip.pdf');
    if (!fs.existsSync(samplePdfPath)) {
      // Create a simple PDF placeholder (in real scenario, you'd use a PDF library)
      fs.writeFileSync(samplePdfPath, 'Sample PDF content - this would be a real PDF file');
      console.log('✅ Created sample PDF file');
    }
    
    // Add sample payslips for each user
    const samplePayslips = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    for (const user of users.slice(0, 2)) { // Just use first 2 users
      // Add payslips for last 3 months
      for (let i = 0; i < 3; i++) {
        let month = currentMonth - i;
        let year = currentYear;
        
        if (month <= 0) {
          month += 12;
          year -= 1;
        }
        
        const payslip = {
          _id: new ObjectId(),
          userId: user._id,
          year: year,
          month: month,
          yearMonth: `${year}-${String(month).padStart(2, '0')}`,
          fileName: `payslip_${user.employeeId}_${year}_${month}.pdf`,
          uniqueFileName: `payslip_${Date.now()}_${user.employeeId}_${year}_${month}.pdf`,
          originalFilename: `급여명세서_${user.name}_${year}년${month}월.pdf`,
          fileSize: 125432, // Sample size in bytes
          uploadedAt: new Date(),
          createdAt: new Date(),
          uploadedBy: new ObjectId('686cec6a12725dbeed8fec19'), // Admin ID
          status: 'available',
          deleted: false,
          modificationHistory: []
        };
        
        samplePayslips.push(payslip);
        
        // Copy sample PDF with unique name
        const uniquePath = path.join(uploadsDir, payslip.uniqueFileName);
        if (!fs.existsSync(uniquePath)) {
          fs.copyFileSync(samplePdfPath, uniquePath);
        }
      }
    }
    
    if (samplePayslips.length > 0) {
      // Clear existing payslips
      await payslipsCollection.deleteMany({});
      
      // Insert new sample payslips
      const result = await payslipsCollection.insertMany(samplePayslips);
      console.log(`✅ Added ${result.insertedCount} sample payslips`);
      
      // List the payslips
      console.log('\nSample payslips created:');
      for (const payslip of samplePayslips) {
        const user = users.find(u => u._id.toString() === payslip.userId.toString());
        console.log(`  - ${user?.name} (${user?.employeeId}): ${payslip.year}년 ${payslip.month}월`);
      }
    }
    
    console.log('\n✨ Sample data added successfully!');
    console.log('You can now test the My Documents and Admin Documents features.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

// Run the script
addSamplePayslips();