const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const { MongoClient, ObjectId } = require('mongodb');

describe('User Deactivation Metadata Fields Tests', () => {
    let adminToken;
    let testAdminId;

    beforeAll(async () => {
        // Wait for server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const secret = 'hr-development-secret-2025';
        
        // Generate admin token using real admin ID from database
        testAdminId = '68941a36f348ccab6ce13319';
        adminToken = jwt.sign(
            { 
                id: testAdminId,
                username: 'test_api_admin',
                role: 'admin'
            },
            secret,
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );
    });

    afterAll((done) => {
        done();
    });

    it('should properly set deactivatedAt timestamp when user is deactivated', async () => {
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'deactivated_at_test_' + Date.now(),
            password: 'hashedpassword123',
            name: 'DeactivatedAt Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'DEACT_AT_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 15
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        await client.close();

        // Record the time before deactivation
        const beforeDeactivation = new Date();

        // Step 2: Deactivate the user
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Testing deactivatedAt timestamp'
            })
            .expect(200);

        // Record the time after deactivation
        const afterDeactivation = new Date();

        // Step 3: Verify deactivatedAt is set correctly
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(updatedUser).toHaveProperty('deactivatedAt');
        expect(updatedUser.deactivatedAt).toBeInstanceOf(Date);
        
        // Verify deactivatedAt is within the expected time range
        const deactivatedAt = new Date(updatedUser.deactivatedAt);
        expect(deactivatedAt.getTime()).toBeGreaterThanOrEqual(beforeDeactivation.getTime());
        expect(deactivatedAt.getTime()).toBeLessThanOrEqual(afterDeactivation.getTime());
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });

    it('should properly set deactivatedBy field with admin user ID', async () => {
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'deactivated_by_test_' + Date.now(),
            password: 'hashedpassword123',
            name: 'DeactivatedBy Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'HR',
            employeeId: 'DEACT_BY_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 12
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        await client.close();

        // Step 2: Deactivate the user
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Testing deactivatedBy field'
            })
            .expect(200);

        // Step 3: Verify deactivatedBy is set to the admin user ID
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(updatedUser).toHaveProperty('deactivatedBy');
        expect(updatedUser.deactivatedBy).toBe(testAdminId);
        expect(typeof updatedUser.deactivatedBy).toBe('string');
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });

    it('should properly set deactivationReason field with provided reason', async () => {
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'deactivation_reason_test_' + Date.now(),
            password: 'hashedpassword123',
            name: 'DeactivationReason Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'Finance',
            employeeId: 'DEACT_REASON_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 8
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        await client.close();

        // Step 2: Deactivate the user with specific reason
        const testReason = 'Employee violated company policy regarding attendance';
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: testReason
            })
            .expect(200);

        // Step 3: Verify deactivationReason is set correctly
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(updatedUser).toHaveProperty('deactivationReason');
        expect(updatedUser.deactivationReason).toBe(testReason);
        expect(typeof updatedUser.deactivationReason).toBe('string');
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });

    it('should handle null deactivationReason when no reason is provided', async () => {
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'null_reason_test_' + Date.now(),
            password: 'hashedpassword123',
            name: 'Null Reason Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'NULL_REASON_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 10
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        await client.close();

        // Step 2: Deactivate the user without providing a reason
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({}) // No reason provided
            .expect(200);

        // Step 3: Verify deactivationReason is null
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(updatedUser).toHaveProperty('deactivationReason');
        expect(updatedUser.deactivationReason).toBeNull();
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });

    it('should set all three metadata fields together during deactivation', async () => {
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'all_metadata_test_' + Date.now(),
            password: 'hashedpassword123',
            name: 'All Metadata Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'Operations',
            employeeId: 'ALL_META_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 20
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        await client.close();

        // Record time before deactivation
        const beforeDeactivation = new Date();

        // Step 2: Deactivate the user
        const testReason = 'Comprehensive metadata test - all fields';
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: testReason
            })
            .expect(200);

        const afterDeactivation = new Date();

        // Step 3: Verify all metadata fields are set correctly
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        // Verify deactivatedAt
        expect(updatedUser).toHaveProperty('deactivatedAt');
        expect(updatedUser.deactivatedAt).toBeInstanceOf(Date);
        const deactivatedAt = new Date(updatedUser.deactivatedAt);
        expect(deactivatedAt.getTime()).toBeGreaterThanOrEqual(beforeDeactivation.getTime());
        expect(deactivatedAt.getTime()).toBeLessThanOrEqual(afterDeactivation.getTime());
        
        // Verify deactivatedBy
        expect(updatedUser).toHaveProperty('deactivatedBy', testAdminId);
        expect(typeof updatedUser.deactivatedBy).toBe('string');
        
        // Verify deactivationReason
        expect(updatedUser).toHaveProperty('deactivationReason', testReason);
        expect(typeof updatedUser.deactivationReason).toBe('string');
        
        // Verify isActive is false
        expect(updatedUser.isActive).toBe(false);
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });
});