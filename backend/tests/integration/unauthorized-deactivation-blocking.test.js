const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

describe('Unauthorized User Deactivation Blocking E2E Tests', () => {
    let adminToken;
    let userToken;
    let supervisorToken;
    let testAdminId;
    let testUserId;
    let testSupervisorId;

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

        // Generate regular user token using real user ID from database
        testUserId = '6893039f1674302dd0059716';
        userToken = jwt.sign(
            { 
                id: testUserId,
                username: 'regular_user',
                role: 'user'
            },
            secret,
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );

        // Generate supervisor token using real supervisor ID from database
        testSupervisorId = '6890031063d2ea528219a4f8';
        supervisorToken = jwt.sign(
            { 
                id: testSupervisorId,
                username: 'supervisor_user',
                role: 'supervisor'
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

    it('should block regular user from deactivating other users in complete E2E scenario', async () => {
        // Step 1: Create test users to simulate realistic scenario
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        // Create victim user that regular user will try to deactivate
        const victimUser = {
            username: 'victim_user_' + Date.now(),
            password: bcrypt.hashSync('victim123', 10),
            name: 'Victim User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'VICTIM_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 15
        };
        
        const victimResult = await db.collection('users').insertOne(victimUser);
        const victimUserId = victimResult.insertedId.toString();
        
        await client.close();

        // Step 2: Regular user attempts to login (should work)
        // Note: This would require the actual user credentials to exist in database
        // For test purposes, we'll skip actual login and just use the pre-generated token

        // Step 3: Regular user attempts to deactivate victim user (should fail with 403)
        const deactivationResponse = await request(app)
            .put(`/api/users/${victimUserId}/deactivate`)
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                reason: 'Unauthorized attempt by regular user'
            })
            .expect(403);

        // Verify appropriate error response
        expect(deactivationResponse.body).toHaveProperty('error');
        expect(deactivationResponse.body.error.toLowerCase()).toContain('permission');

        // Step 4: Verify victim user remains active and untouched
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const unchangedVictim = await db2.collection('users').findOne({ _id: new ObjectId(victimUserId) });
        
        expect(unchangedVictim.isActive).toBe(true);
        expect(unchangedVictim.deactivatedAt).toBeUndefined();
        expect(unchangedVictim.deactivatedBy).toBeUndefined();
        expect(unchangedVictim.deactivationReason).toBeUndefined();
        
        await client2.close();

        // Step 5: Verify admin can still deactivate the same user (control test)
        const adminDeactivationResponse = await request(app)
            .put(`/api/users/${victimUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Admin control deactivation after failed unauthorized attempt'
            })
            .expect(200);

        expect(adminDeactivationResponse.body).toHaveProperty('success', true);
        expect(adminDeactivationResponse.body).toHaveProperty('isActive', false);

        // Step 6: Clean up - delete victim user
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(victimUserId) });
        await client3.close();
    });

    it('should block supervisor from deactivating users if lacking permissions', async () => {
        // Step 1: Create target user for supervisor deactivation attempt
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const targetUser = {
            username: 'supervisor_target_' + Date.now(),
            password: bcrypt.hashSync('target123', 10),
            name: 'Supervisor Target User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'HR',
            employeeId: 'SUP_TARGET_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 12
        };
        
        const targetResult = await db.collection('users').insertOne(targetUser);
        const targetUserId = targetResult.insertedId.toString();
        
        await client.close();

        // Step 2: Supervisor attempts to deactivate user (should fail with 403)
        const deactivationResponse = await request(app)
            .put(`/api/users/${targetUserId}/deactivate`)
            .set('Authorization', `Bearer ${supervisorToken}`)
            .send({
                reason: 'Supervisor unauthorized deactivation attempt'
            })
            .expect(403);

        expect(deactivationResponse.body).toHaveProperty('error');
        expect(deactivationResponse.body.error.toLowerCase()).toContain('permission');

        // Step 3: Verify target user remains unaffected
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const unchangedTarget = await db2.collection('users').findOne({ _id: new ObjectId(targetUserId) });
        
        expect(unchangedTarget.isActive).toBe(true);
        expect(unchangedTarget.deactivatedAt).toBeUndefined();
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(targetUserId) });
        await client3.close();
    });

    it('should block unauthenticated requests completely', async () => {
        // Step 1: Create target user for unauthenticated attempt
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const targetUser = {
            username: 'unauth_target_' + Date.now(),
            password: bcrypt.hashSync('unauth123', 10),
            name: 'Unauthenticated Target User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'Finance',
            employeeId: 'UNAUTH_TARGET_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 20
        };
        
        const targetResult = await db.collection('users').insertOne(targetUser);
        const targetUserId = targetResult.insertedId.toString();
        
        await client.close();

        // Step 2: Attempt deactivation without any authentication token (should fail with 401)
        const deactivationResponse = await request(app)
            .put(`/api/users/${targetUserId}/deactivate`)
            .send({
                reason: 'Completely unauthenticated deactivation attempt'
            })
            .expect(401);

        expect(deactivationResponse.body).toHaveProperty('error');
        expect(deactivationResponse.body.error.toLowerCase()).toMatch(/auth|token/);

        // Step 3: Verify target user remains unaffected
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const unchangedTarget = await db2.collection('users').findOne({ _id: new ObjectId(targetUserId) });
        
        expect(unchangedTarget.isActive).toBe(true);
        expect(unchangedTarget.deactivatedAt).toBeUndefined();
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(targetUserId) });
        await client3.close();
    });

    it('should block attempts with invalid/malformed tokens', async () => {
        // Step 1: Get any existing user ID for the attempt
        const usersResponse = await request(app)
            .get('/api/users')
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        const targetUser = usersResponse.body.data.find(u => u.role !== 'admin');
        
        if (!targetUser) {
            console.log('No suitable user found for invalid token test - skipping');
            return;
        }

        // Step 2: Attempt deactivation with various invalid tokens
        const invalidTokens = [
            'invalid.token.signature',
            'Bearer malformed',
            'not-a-jwt-at-all',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'
        ];

        for (const invalidToken of invalidTokens) {
            const deactivationResponse = await request(app)
                .put(`/api/users/${targetUser._id}/deactivate`)
                .set('Authorization', `Bearer ${invalidToken}`)
                .send({
                    reason: 'Invalid token deactivation attempt'
                })
                .expect(401);

            expect(deactivationResponse.body).toHaveProperty('error');
        }
    });

    it('should prevent users from deactivating themselves', async () => {
        // Step 1: Create a test user who will try to deactivate themselves
        const testPassword = 'selfdeactivate123';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const selfTargetUser = {
            username: 'self_target_' + Date.now(),
            password: hashedPassword,
            name: 'Self Target User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view', 'users:manage'], // Even with user management permission
            department: 'IT',
            employeeId: 'SELF_TARGET_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 10
        };
        
        const insertResult = await db.collection('users').insertOne(selfTargetUser);
        const selfTargetUserId = insertResult.insertedId.toString();
        
        await client.close();

        // Step 2: Generate token for the user themselves
        const secret = 'hr-development-secret-2025';
        const selfToken = jwt.sign(
            { 
                id: selfTargetUserId,
                username: selfTargetUser.username,
                role: 'user'
            },
            secret,
            { 
                expiresIn: '24h',
                issuer: 'hr-system',
                audience: 'hr-frontend'
            }
        );

        // Step 3: User attempts to deactivate themselves (should fail with 403 due to lack of permission)
        const deactivationResponse = await request(app)
            .put(`/api/users/${selfTargetUserId}/deactivate`)
            .set('Authorization', `Bearer ${selfToken}`)
            .send({
                reason: 'Self-deactivation attempt'
            })
            .expect(403);

        expect(deactivationResponse.body).toHaveProperty('error');
        expect(deactivationResponse.body.error.toLowerCase()).toContain('permission');

        // Step 4: Verify user remains active
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const unchangedUser = await db2.collection('users').findOne({ _id: new ObjectId(selfTargetUserId) });
        
        expect(unchangedUser.isActive).toBe(true);
        expect(unchangedUser.deactivatedAt).toBeUndefined();
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(selfTargetUserId) });
        await client3.close();
    });
});