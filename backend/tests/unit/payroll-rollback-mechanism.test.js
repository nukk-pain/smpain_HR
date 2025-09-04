/**
 * AI-HEADER
 * intent: Test rollback mechanism for payroll operations to ensure data consistency
 * domain_meaning: Ensures failed payroll operations can be safely rolled back without data corruption
 * misleading_names: None - clear testing purpose
 * data_contracts: Expects payroll collection, transaction support, rollback functionality
 * PII: Contains test salary data - not production data
 * invariants: Rollback must restore database to exact pre-operation state
 * rag_keywords: rollback, transaction, payroll, atomicity, consistency, error recovery
 */

const { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

/**
 * DomainMeaning: Tests for payroll transaction rollback mechanisms
 * MisleadingNames: None
 * SideEffects: Creates/deletes test data in MongoDB
 * Invariants: All rollback operations must leave database in consistent state
 * RAG_Keywords: rollback, testing, transactions, payroll
 * DuplicatePolicy: canonical
 * FunctionIdentity: payroll-rollback-test-suite-001
 */
describe('Payroll Rollback Mechanism Tests', () => {
  let client;
  let db;
  let payrollCollection;
  let userCollection;
  
  // Test data setup
  const testUsers = [
    {
      _id: new ObjectId(),
      employeeId: 'EMP001',
      name: 'John Doe',
      role: 'User'
    },
    {
      _id: new ObjectId(),
      employeeId: 'EMP002', 
      name: 'Jane Smith',
      role: 'User'
    }
  ];
  
  const validPayrollData = [
    {
      userId: testUsers[0]._id,
      year: 2025,
      month: 8,
      baseSalary: 50000,
      allowances: { housing: 5000, transport: 2000 },
      deductions: { tax: 5000, insurance: 1000 },
      netSalary: 51000
    },
    {
      userId: testUsers[1]._id,
      year: 2025,
      month: 8,
      baseSalary: 60000,
      allowances: { housing: 6000, transport: 2000 },
      deductions: { tax: 6000, insurance: 1200 },
      netSalary: 60800
    }
  ];

  beforeAll(async () => {
    const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = `hr_test_rollback_${process.env.PORT || 3000}`;
    
    client = new MongoClient(url);
    await client.connect();
    db = client.db(dbName);
    
    payrollCollection = db.collection('payroll');
    userCollection = db.collection('users');
    
    // Insert test users
    await userCollection.insertMany(testUsers);
  });

  afterAll(async () => {
    if (db) {
      await db.dropDatabase();
    }
    if (client) {
      await client.close();
    }
  });

  beforeEach(async () => {
    // Clean up payroll data before each test
    await payrollCollection.deleteMany({});
  });

  afterEach(async () => {
    // Clean up after each test
    await payrollCollection.deleteMany({});
  });

  /**
   * DomainMeaning: Tests successful transaction that doesn't require rollback
   * MisleadingNames: None
   * SideEffects: Creates payroll records in database
   * Invariants: All records must be successfully inserted
   * RAG_Keywords: transaction, success, baseline test
   * DuplicatePolicy: canonical
   * FunctionIdentity: successful-transaction-test-001
   */
  it('should successfully complete transaction without rollback needed', async () => {
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        const insertResult = await payrollCollection.insertMany(validPayrollData, { session });
        expect(insertResult.insertedCount).toBe(2);
      });
      
      // Verify records exist after transaction
      const recordCount = await payrollCollection.countDocuments({});
      expect(recordCount).toBe(2);
      
      console.log('✅ Successful transaction completed without rollback');
    } finally {
      await session.endSession();
    }
  });

  /**
   * DomainMeaning: Tests automatic rollback when transaction fails
   * MisleadingNames: None  
   * SideEffects: Attempts to create records then rolls back
   * Invariants: Database state must be unchanged after failed transaction
   * RAG_Keywords: rollback, transaction failure, atomicity
   * DuplicatePolicy: canonical
   * FunctionIdentity: automatic-rollback-test-001
   */
  it('should automatically rollback on transaction failure', async () => {
    const session = client.startSession();
    
    try {
      // Insert first record successfully, then simulate failure
      await expect(session.withTransaction(async () => {
        // Insert first valid record
        await payrollCollection.insertOne(validPayrollData[0], { session });
        
        // Verify it's inserted within transaction
        const tempCount = await payrollCollection.countDocuments({}, { session });
        expect(tempCount).toBe(1);
        
        // Simulate error that should trigger rollback
        throw new Error('Simulated transaction failure');
      })).rejects.toThrow('Simulated transaction failure');
      
      // Verify rollback occurred - no records should exist
      const finalCount = await payrollCollection.countDocuments({});
      expect(finalCount).toBe(0);
      
      console.log('✅ Automatic rollback on transaction failure verified');
    } finally {
      await session.endSession();
    }
  });

  /**
   * DomainMeaning: Tests rollback when duplicate key error occurs
   * MisleadingNames: None
   * SideEffects: Creates duplicate records to trigger constraint violation
   * Invariants: Database must rollback completely on constraint violation
   * RAG_Keywords: rollback, duplicate key, constraint violation
   * DuplicatePolicy: canonical
   * FunctionIdentity: duplicate-key-rollback-test-001
   */
  it('should rollback on duplicate key constraint violation', async () => {
    // First, create a unique index on userId, year, month combination
    await payrollCollection.createIndex(
      { userId: 1, year: 1, month: 1 },
      { unique: true, background: true }
    );
    
    // Insert initial record
    await payrollCollection.insertOne(validPayrollData[0]);
    const initialCount = await payrollCollection.countDocuments({});
    expect(initialCount).toBe(1);
    
    const session = client.startSession();
    
    try {
      // Attempt to insert duplicate record in transaction
      await expect(session.withTransaction(async () => {
        // Insert a new valid record first
        await payrollCollection.insertOne(validPayrollData[1], { session });
        
        // Then try to insert duplicate (should fail)
        await payrollCollection.insertOne(validPayrollData[0], { session });
      })).rejects.toThrow();
      
      // Verify rollback - only original record should exist
      const finalCount = await payrollCollection.countDocuments({});
      expect(finalCount).toBe(1);
      
      // Verify the original record still exists unchanged
      const existingRecord = await payrollCollection.findOne({ userId: testUsers[0]._id });
      expect(existingRecord).toBeTruthy();
      expect(existingRecord.baseSalary).toBe(50000);
      
      console.log('✅ Rollback on duplicate key constraint verified');
    } finally {
      await session.endSession();
    }
  });

  /**
   * DomainMeaning: Tests partial rollback scenario with bulk operations
   * MisleadingNames: None
   * SideEffects: Creates bulk insert scenario with some failures
   * Invariants: All operations must be rolled back if any fail in transaction
   * RAG_Keywords: bulk rollback, partial failure, all-or-nothing
   * DuplicatePolicy: canonical
   * FunctionIdentity: bulk-rollback-test-001
   */
  it('should rollback all records on partial bulk operation failure', async () => {
    // Insert one valid record first
    await payrollCollection.insertOne(validPayrollData[0]);
    
    const session = client.startSession();
    const bulkData = [
      {
        userId: testUsers[1]._id,
        year: 2025,
        month: 8,
        baseSalary: 45000,
        allowances: { housing: 4500 },
        deductions: { tax: 4500 },
        netSalary: 45000
      },
      // Invalid record - missing required fields
      {
        userId: testUsers[0]._id,
        year: 2025,
        month: 8,
        // Missing baseSalary - should cause validation error
        allowances: { housing: 5000 },
        deductions: { tax: 5000 }
      }
    ];
    
    try {
      await expect(session.withTransaction(async () => {
        // Insert the new user record first (valid)
        await payrollCollection.insertOne(bulkData[0], { session });
        
        // Verify intermediate state
        const tempCount = await payrollCollection.countDocuments({}, { session });
        expect(tempCount).toBe(2); // Original + new record
        
        // Try to insert invalid record (should fail validation)
        await payrollCollection.insertOne(bulkData[1], { session });
        
      })).rejects.toThrow();
      
      // Verify complete rollback - only original record should remain
      const finalCount = await payrollCollection.countDocuments({});
      expect(finalCount).toBe(1);
      
      const remainingRecord = await payrollCollection.findOne({});
      expect(remainingRecord.userId.toString()).toBe(testUsers[0]._id.toString());
      
      console.log('✅ Bulk operation rollback verified');
    } finally {
      await session.endSession();
    }
  });

  /**
   * DomainMeaning: Tests cross-collection transaction rollback
   * MisleadingNames: None
   * SideEffects: Modifies both users and payroll collections
   * Invariants: All collections must be rolled back atomically
   * RAG_Keywords: cross-collection, multi-document, atomic rollback
   * DuplicatePolicy: canonical
   * FunctionIdentity: cross-collection-rollback-test-001
   */
  it('should rollback changes across multiple collections', async () => {
    const session = client.startSession();
    const newUser = {
      _id: new ObjectId(),
      employeeId: 'EMP003',
      name: 'Bob Wilson',
      role: 'User'
    };
    
    const initialUserCount = await userCollection.countDocuments({});
    const initialPayrollCount = await payrollCollection.countDocuments({});
    
    try {
      await expect(session.withTransaction(async () => {
        // Insert new user
        await userCollection.insertOne(newUser, { session });
        
        // Insert payroll for new user
        await payrollCollection.insertOne({
          userId: newUser._id,
          year: 2025,
          month: 8,
          baseSalary: 40000,
          allowances: { housing: 4000 },
          deductions: { tax: 4000 },
          netSalary: 40000
        }, { session });
        
        // Verify intermediate state
        const tempUserCount = await userCollection.countDocuments({}, { session });
        const tempPayrollCount = await payrollCollection.countDocuments({}, { session });
        expect(tempUserCount).toBe(initialUserCount + 1);
        expect(tempPayrollCount).toBe(initialPayrollCount + 1);
        
        // Simulate failure
        throw new Error('Cross-collection transaction failure');
        
      })).rejects.toThrow('Cross-collection transaction failure');
      
      // Verify rollback across both collections
      const finalUserCount = await userCollection.countDocuments({});
      const finalPayrollCount = await payrollCollection.countDocuments({});
      
      expect(finalUserCount).toBe(initialUserCount);
      expect(finalPayrollCount).toBe(initialPayrollCount);
      
      // Verify new user was not persisted
      const shouldNotExist = await userCollection.findOne({ _id: newUser._id });
      expect(shouldNotExist).toBe(null);
      
      console.log('✅ Cross-collection rollback verified');
    } finally {
      await session.endSession();
    }
  });

  /**
   * DomainMeaning: Tests rollback mechanism performance under load
   * MisleadingNames: None
   * SideEffects: Creates many records then rolls back
   * Invariants: Performance must be acceptable even for large rollbacks
   * RAG_Keywords: performance, rollback, stress test, large dataset
   * DuplicatePolicy: canonical
   * FunctionIdentity: rollback-performance-test-001
   */
  it('should handle rollback efficiently with large dataset', async () => {
    const largeDataset = [];
    const RECORD_COUNT = 100;
    
    // Generate large test dataset
    for (let i = 0; i < RECORD_COUNT; i++) {
      largeDataset.push({
        userId: i % 2 === 0 ? testUsers[0]._id : testUsers[1]._id,
        year: 2025,
        month: 8,
        baseSalary: 40000 + (i * 100),
        allowances: { housing: 4000 + (i * 10) },
        deductions: { tax: 4000 + (i * 10) },
        netSalary: 40000 + (i * 90),
        recordIndex: i // Add index to make records unique
      });
    }
    
    const session = client.startSession();
    const startTime = Date.now();
    
    try {
      await expect(session.withTransaction(async () => {
        // Insert all records
        await payrollCollection.insertMany(largeDataset, { session, ordered: false });
        
        // Verify all inserted
        const tempCount = await payrollCollection.countDocuments({}, { session });
        expect(tempCount).toBe(RECORD_COUNT);
        
        // Force rollback
        throw new Error('Forced rollback for performance test');
        
      })).rejects.toThrow('Forced rollback for performance test');
      
      const endTime = Date.now();
      const rollbackTime = endTime - startTime;
      
      // Verify complete rollback
      const finalCount = await payrollCollection.countDocuments({});
      expect(finalCount).toBe(0);
      
      // Performance assertion - should complete within reasonable time (5 seconds)
      expect(rollbackTime).toBeLessThan(5000);
      
      console.log(`✅ Large dataset rollback completed in ${rollbackTime}ms`);
    } finally {
      await session.endSession();
    }
  });
});