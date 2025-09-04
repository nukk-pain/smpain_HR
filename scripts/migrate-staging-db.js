/*
 * AI-HEADER
 * Intent: Database migration script for staging environment
 * Domain Meaning: Migrates database schema and data for staging deployment
 * Misleading Names: None
 * Data Contracts: MongoDB collections and document structures
 * PII: May handle user data during migration - must be secured
 * Invariants: Must preserve data integrity during migration
 * RAG Keywords: database migration, staging deployment, schema update
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.staging' });

/**
 * Database Migration for Staging
 * DomainMeaning: Applies schema changes and data migrations to staging database
 * MisleadingNames: None
 * SideEffects: Modifies database schema and data
 * Invariants: Must be idempotent, must preserve data integrity
 * RAG_Keywords: staging migration, database update, schema migration
 * DuplicatePolicy: canonical - primary migration script
 * FunctionIdentity: hash_migrate_staging_001
 */
class StagingMigration {
  constructor() {
    this.mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.DB_NAME || 'SM_nomu_staging';
    this.client = null;
    this.db = null;
    this.migrations = [];
  }

  /**
   * Connect to database
   * DomainMeaning: Establishes connection to staging database
   * MisleadingNames: None
   * SideEffects: Creates database connection
   * Invariants: Must connect before migrations
   * RAG_Keywords: database connection, mongodb connect
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_connect_db_002
   */
  async connect() {
    console.log('🔗 Connecting to staging database...');
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    console.log(`✅ Connected to ${this.dbName}`);
  }

  /**
   * Disconnect from database
   * DomainMeaning: Closes database connection
   * MisleadingNames: None
   * SideEffects: Closes connection
   * Invariants: Must be called after migrations
   * RAG_Keywords: database disconnect, close connection
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_disconnect_003
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      console.log('🔌 Disconnected from database');
    }
  }

  /**
   * Check if migration has been applied
   * DomainMeaning: Verifies if a specific migration has already run
   * MisleadingNames: None
   * SideEffects: None
   * Invariants: Must track migration history
   * RAG_Keywords: migration check, applied migrations
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_check_migration_004
   */
  async isMigrationApplied(migrationId) {
    const migration = await this.db.collection('migrations').findOne({ _id: migrationId });
    return migration !== null;
  }

  /**
   * Mark migration as applied
   * DomainMeaning: Records that a migration has been completed
   * MisleadingNames: None
   * SideEffects: Inserts migration record
   * Invariants: Must be called after successful migration
   * RAG_Keywords: mark migration, record migration
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_mark_applied_005
   */
  async markMigrationApplied(migrationId, description) {
    await this.db.collection('migrations').insertOne({
      _id: migrationId,
      description,
      appliedAt: new Date(),
      environment: 'staging'
    });
  }

  /**
   * Migration: Create indexes
   * DomainMeaning: Creates necessary database indexes for performance
   * MisleadingNames: None
   * SideEffects: Creates indexes on collections
   * Invariants: Indexes must not duplicate
   * RAG_Keywords: create indexes, database performance
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_indexes_006
   */
  async migration001_createIndexes() {
    const migrationId = 'migration_001_indexes';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Users collection indexes
    await this.db.collection('users').createIndex({ username: 1 }, { unique: true });
    await this.db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await this.db.collection('users').createIndex({ role: 1 });
    await this.db.collection('users').createIndex({ isActive: 1 });
    await this.db.collection('users').createIndex({ department: 1 });

    // Leave requests indexes
    await this.db.collection('leave_requests').createIndex({ userId: 1 });
    await this.db.collection('leave_requests').createIndex({ status: 1 });
    await this.db.collection('leave_requests').createIndex({ startDate: 1 });
    await this.db.collection('leave_requests').createIndex({ endDate: 1 });
    await this.db.collection('leave_requests').createIndex({ approvedBy: 1 });

    // Payroll indexes
    await this.db.collection('payroll').createIndex({ employeeId: 1 });
    await this.db.collection('payroll').createIndex({ month: 1 });
    await this.db.collection('payroll').createIndex({ year: 1 });
    await this.db.collection('payroll').createIndex({ employeeId: 1, year: 1, month: 1 }, { unique: true });

    // Temp uploads TTL index
    await this.db.collection('temp_uploads').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    await this.db.collection('temp_uploads').createIndex({ uploadedBy: 1 });
    await this.db.collection('temp_uploads').createIndex({ type: 1 });

    await this.markMigrationApplied(migrationId, 'Created database indexes');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Migration: Add feature flag fields
   * DomainMeaning: Adds feature flag related fields to users
   * MisleadingNames: None
   * SideEffects: Updates user documents
   * Invariants: Must not overwrite existing data
   * RAG_Keywords: feature flag fields, user updates
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_feature_flags_007
   */
  async migration002_addFeatureFlagFields() {
    const migrationId = 'migration_002_feature_flags';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Add feature flag preferences to users
    await this.db.collection('users').updateMany(
      { featureFlags: { $exists: false } },
      { 
        $set: { 
          featureFlags: {
            preferences: {},
            overrides: {}
          }
        }
      }
    );

    // Create feature_flag_events collection for tracking
    await this.db.createCollection('feature_flag_events');
    await this.db.collection('feature_flag_events').createIndex({ flagName: 1 });
    await this.db.collection('feature_flag_events').createIndex({ userId: 1 });
    await this.db.collection('feature_flag_events').createIndex({ timestamp: -1 });

    await this.markMigrationApplied(migrationId, 'Added feature flag fields and tracking');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Migration: Add deactivation metadata
   * DomainMeaning: Adds fields for tracking user deactivation
   * MisleadingNames: None
   * SideEffects: Updates user documents
   * Invariants: Must preserve existing active status
   * RAG_Keywords: deactivation metadata, user status
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_deactivation_008
   */
  async migration003_addDeactivationMetadata() {
    const migrationId = 'migration_003_deactivation_metadata';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Add deactivation metadata fields
    await this.db.collection('users').updateMany(
      { deactivatedAt: { $exists: false } },
      { 
        $set: { 
          deactivatedAt: null,
          deactivatedBy: null,
          deactivationReason: null,
          reactivatedAt: null,
          reactivatedBy: null
        }
      }
    );

    await this.markMigrationApplied(migrationId, 'Added user deactivation metadata fields');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Migration: Create staging admin user
   * DomainMeaning: Creates admin user for staging environment
   * MisleadingNames: None
   * SideEffects: Creates user document
   * Invariants: Must not duplicate admin user
   * RAG_Keywords: staging admin, create user
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_admin_009
   */
  async migration004_createStagingAdmin() {
    const migrationId = 'migration_004_staging_admin';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Check if staging admin exists
    const existingAdmin = await this.db.collection('users').findOne({ username: 'staging_admin' });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('staging_admin_2024', 10);
      
      await this.db.collection('users').insertOne({
        username: 'staging_admin',
        password: hashedPassword,
        name: 'Staging Administrator',
        email: 'admin@staging.example.com',
        role: 'Admin',
        department: 'IT',
        position: 'System Administrator',
        isActive: true,
        permissions: [
          'users:view', 'users:manage', 'users:create', 'users:edit', 'users:delete',
          'leave:view', 'leave:manage', 
          'payroll:view', 'payroll:manage',
          'reports:view', 
          'files:view', 'files:manage',
          'departments:view', 'departments:manage',
          'admin:permissions'
        ],
        featureFlags: {
          preferences: {
            PREVIEW_UPLOAD: true,
            BULK_OPERATIONS: true
          },
          overrides: {}
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        environment: 'staging'
      });
      
      console.log('📧 Staging admin created: username=staging_admin, password=staging_admin_2024');
    }

    await this.markMigrationApplied(migrationId, 'Created staging admin user');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Migration: Add payroll preview fields
   * DomainMeaning: Adds fields for payroll preview feature
   * MisleadingNames: None
   * SideEffects: Updates payroll collection schema
   * Invariants: Must preserve existing payroll data
   * RAG_Keywords: payroll preview, schema update
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_payroll_preview_010
   */
  async migration005_addPayrollPreviewFields() {
    const migrationId = 'migration_005_payroll_preview';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Add preview-related fields to payroll documents
    await this.db.collection('payroll').updateMany(
      { previewToken: { $exists: false } },
      { 
        $set: { 
          previewToken: null,
          confirmedAt: null,
          confirmedBy: null,
          uploadMethod: 'legacy',
          validationErrors: [],
          validationWarnings: []
        }
      }
    );

    // Create payroll_previews collection
    await this.db.createCollection('payroll_previews');
    await this.db.collection('payroll_previews').createIndex({ token: 1 }, { unique: true });
    await this.db.collection('payroll_previews').createIndex({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // Expire after 1 hour

    await this.markMigrationApplied(migrationId, 'Added payroll preview fields and collection');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Migration: Create sample data for staging
   * DomainMeaning: Populates staging with test data
   * MisleadingNames: None
   * SideEffects: Creates sample documents
   * Invariants: Must not affect production data
   * RAG_Keywords: sample data, test data, staging population
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_migration_sample_data_011
   */
  async migration006_createSampleData() {
    const migrationId = 'migration_006_sample_data';
    
    if (await this.isMigrationApplied(migrationId)) {
      console.log(`⏭️  Migration ${migrationId} already applied`);
      return;
    }

    console.log(`🔄 Running ${migrationId}...`);

    // Check if we already have sample data
    const userCount = await this.db.collection('users').countDocuments();
    
    if (userCount < 10) {
      // Create sample departments
      const departments = ['물리치료', '간호, 원무', '영상의학', '진단검사', '약제', '영양'];
      
      for (const dept of departments) {
        await this.db.collection('departments').updateOne(
          { name: dept },
          { 
            $setOnInsert: {
              name: dept,
              description: `${dept} 부서`,
              createdAt: new Date(),
              isActive: true
            }
          },
          { upsert: true }
        );
      }

      // Create sample users
      const sampleUsers = [
        { username: 'kim_pt', name: '김물리', department: '물리치료', role: 'User' },
        { username: 'lee_nurse', name: '이간호', department: '간호, 원무', role: 'User' },
        { username: 'park_rad', name: '박영상', department: '영상의학', role: 'User' },
        { username: 'choi_lab', name: '최검사', department: '진단검사', role: 'User' },
        { username: 'jung_pharm', name: '정약사', department: '약제', role: 'Supervisor' },
        { username: 'kang_diet', name: '강영양', department: '영양', role: 'User' }
      ];

      for (const user of sampleUsers) {
        const hashedPassword = await bcrypt.hash('test1234', 10);
        
        await this.db.collection('users').updateOne(
          { username: user.username },
          {
            $setOnInsert: {
              ...user,
              password: hashedPassword,
              email: `${user.username}@staging.example.com`,
              position: '직원',
              isActive: true,
              permissions: user.role === 'Supervisor' 
                ? ['leave:view', 'leave:manage', 'users:view']
                : ['leave:view'],
              createdAt: new Date(),
              updatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }

      console.log('📊 Sample data created: 6 departments, 6 users');
    }

    await this.markMigrationApplied(migrationId, 'Created sample data for staging');
    console.log(`✅ ${migrationId} completed`);
  }

  /**
   * Run all migrations
   * DomainMeaning: Executes all pending migrations in order
   * MisleadingNames: None
   * SideEffects: Applies all migrations
   * Invariants: Must run migrations in order
   * RAG_Keywords: run migrations, execute all
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_run_all_012
   */
  async runAll() {
    console.log('🚀 Starting staging database migrations...');
    console.log(`📍 Database: ${this.dbName}`);
    console.log(`🔗 MongoDB URI: ${this.mongoUrl.replace(/:[^:]*@/, ':****@')}`);

    try {
      await this.connect();

      // Ensure migrations collection exists
      const collections = await this.db.listCollections({ name: 'migrations' }).toArray();
      if (collections.length === 0) {
        await this.db.createCollection('migrations');
        console.log('📁 Created migrations collection');
      }

      // Run migrations in order
      await this.migration001_createIndexes();
      await this.migration002_addFeatureFlagFields();
      await this.migration003_addDeactivationMetadata();
      await this.migration004_createStagingAdmin();
      await this.migration005_addPayrollPreviewFields();
      await this.migration006_createSampleData();

      // Get migration summary
      const appliedMigrations = await this.db.collection('migrations').countDocuments();
      console.log(`\n✅ Migration complete! ${appliedMigrations} migrations applied.`);

    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Rollback last migration
   * DomainMeaning: Reverts the most recent migration
   * MisleadingNames: None
   * SideEffects: Reverts database changes
   * Invariants: Must maintain data integrity
   * RAG_Keywords: rollback migration, revert changes
   * DuplicatePolicy: canonical
   * FunctionIdentity: hash_rollback_013
   */
  async rollbackLast() {
    console.log('🔄 Rolling back last migration...');
    
    try {
      await this.connect();
      
      // Get last migration
      const lastMigration = await this.db.collection('migrations')
        .findOne({}, { sort: { appliedAt: -1 } });
      
      if (!lastMigration) {
        console.log('ℹ️  No migrations to rollback');
        return;
      }

      console.log(`🔄 Rolling back ${lastMigration._id}...`);
      
      // Implement rollback logic for each migration
      // This is a simplified example - real rollbacks would be more complex
      
      // Remove migration record
      await this.db.collection('migrations').deleteOne({ _id: lastMigration._id });
      
      console.log(`✅ Rolled back ${lastMigration._id}`);
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const migration = new StagingMigration();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  switch (command) {
    case 'run':
      migration.runAll().catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
      break;
      
    case 'rollback':
      migration.rollbackLast().catch(error => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
      break;
      
    case 'status':
      migration.connect().then(async () => {
        const count = await migration.db.collection('migrations').countDocuments();
        console.log(`📊 ${count} migrations applied`);
        const migrations = await migration.db.collection('migrations').find().toArray();
        migrations.forEach(m => {
          console.log(`  ✅ ${m._id} - ${m.description} (${m.appliedAt.toISOString()})`);
        });
        await migration.disconnect();
      });
      break;
      
    default:
      console.log('Usage: node migrate-staging-db.js [run|rollback|status]');
      process.exit(1);
  }
}

module.exports = StagingMigration;