/*
 * AI-HEADER
 * Intent: Create MongoDB indexes for payroll collections
 * Domain Meaning: Performance optimization for payroll queries
 * Misleading Names: None
 * Data Contracts: Follows payroll schema index requirements
 * PII: No PII in indexes, only field names
 * Invariants: Indexes must match query patterns
 * RAG Keywords: mongodb, indexes, payroll, performance, query optimization
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/SM_nomu';

/**
 * Create indexes for payroll collections to optimize query performance
 * DomainMeaning: Database performance optimization for payroll operations
 * MisleadingNames: None
 * SideEffects: Creates indexes on MongoDB collections
 * Invariants: Only creates indexes if they don't already exist
 * RAG_Keywords: mongodb, createIndex, payroll performance
 * DuplicatePolicy: canonical - first implementation
 * FunctionIdentity: hash_payroll_indexes_001
 */
async function createPayrollIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('Creating payroll collection indexes...');
    
    // Payroll collection indexes
    const payrollIndexes = [
      { key: { userId: 1, year: -1, month: -1 }, name: 'userId_year_month' },
      { key: { paymentStatus: 1 }, name: 'paymentStatus' },
      { key: { year: 1, month: 1 }, name: 'year_month' },
      { key: { createdAt: -1 }, name: 'createdAt_desc' },
      { key: { paymentDate: -1 }, name: 'paymentDate_desc' }
    ];
    
    for (const index of payrollIndexes) {
      try {
        await db.collection('payroll').createIndex(index.key, { name: index.name });
        console.log(`✓ Created payroll index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`- Payroll index already exists: ${index.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\nCreating payroll_documents collection indexes...');
    
    // Payroll documents collection indexes
    const documentsIndexes = [
      { key: { userId: 1, year: -1, month: -1 }, name: 'userId_year_month' },
      { key: { payrollId: 1 }, name: 'payrollId' },
      { key: { documentType: 1 }, name: 'documentType' },
      { key: { uploadedAt: -1 }, name: 'uploadedAt_desc' }
    ];
    
    for (const index of documentsIndexes) {
      try {
        await db.collection('payroll_documents').createIndex(index.key, { name: index.name });
        console.log(`✓ Created payroll_documents index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`- PayrollDocuments index already exists: ${index.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\nCreating payroll_templates collection indexes...');
    
    // Payroll templates collection indexes
    const templatesIndexes = [
      { key: { isActive: 1, name: 1 }, name: 'isActive_name' },
      { key: { createdAt: -1 }, name: 'createdAt_desc' }
    ];
    
    for (const index of templatesIndexes) {
      try {
        await db.collection('payroll_templates').createIndex(index.key, { name: index.name });
        console.log(`✓ Created payroll_templates index: ${index.name}`);
      } catch (error) {
        if (error.code === 85) { // Index already exists
          console.log(`- PayrollTemplates index already exists: ${index.name}`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n✅ All payroll indexes created successfully!');
    
    // List all indexes for verification
    console.log('\n📋 Current indexes:');
    const collections = ['payroll', 'payroll_documents', 'payroll_templates'];
    
    for (const collectionName of collections) {
      console.log(`\n${collectionName}:`);
      const indexes = await db.collection(collectionName).listIndexes().toArray();
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run if called directly
if (require.main === module) {
  createPayrollIndexes()
    .then(() => {
      console.log('\n🎉 Index creation completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Index creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createPayrollIndexes };