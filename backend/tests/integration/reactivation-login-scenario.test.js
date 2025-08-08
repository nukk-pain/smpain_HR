const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

describe('Reactivation and Login Scenario E2E Tests', () => {
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

    it('should allow normal login after user reactivation', async () => {
        const testPassword = 'test123456';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'reactivation_login_test_' + Date.now(),
            password: hashedPassword,
            name: 'Reactivation Login Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'IT',
            employeeId: 'REACT_LOGIN_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 15
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        const testUsername = testUser.username;
        
        await client.close();

        // Step 2: Deactivate the user
        const deactivationResponse = await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Testing reactivation login scenario'
            })
            .expect(200);

        expect(deactivationResponse.body).toHaveProperty('success', true);
        expect(deactivationResponse.body).toHaveProperty('isActive', false);

        // Step 3: Verify login is blocked for deactivated user
        const blockedLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testPassword
            })
            .expect(401);

        expect(blockedLoginResponse.body).toHaveProperty('error');
        expect(blockedLoginResponse.body.error.toLowerCase()).toContain('deactivated');
        expect(blockedLoginResponse.body).not.toHaveProperty('token');

        // Step 4: Reactivate the user
        const reactivationResponse = await request(app)
            .put(`/api/users/${testUserId}/reactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        expect(reactivationResponse.body).toHaveProperty('success', true);
        expect(reactivationResponse.body).toHaveProperty('isActive', true);

        // Step 5: Verify login is now allowed after reactivation
        const successfulLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testPassword
            })
            .expect(200);

        // Verify successful login response
        expect(successfulLoginResponse.body).toHaveProperty('token');
        expect(successfulLoginResponse.body).toHaveProperty('user');
        expect(successfulLoginResponse.body.user).toHaveProperty('username', testUsername);
        expect(successfulLoginResponse.body.user).toHaveProperty('isActive', true);
        expect(successfulLoginResponse.body.user).not.toHaveProperty('password');

        // Step 6: Verify token is present and well-formed
        const token = successfulLoginResponse.body.token;
        expect(token).toBeTruthy();
        expect(typeof token).toBe('string');
        expect(token.split('.')).toHaveLength(3); // JWT format check

        // Step 7: Verify user database state after reactivation
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const finalUserState = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(finalUserState.isActive).toBe(true);
        expect(finalUserState.deactivatedAt).toBeNull();
        expect(finalUserState.deactivatedBy).toBeNull();
        expect(finalUserState.deactivationReason).toBeNull();
        
        await client2.close();

        // Step 8: Clean up - delete the test user
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });

    it('should handle multiple reactivation cycles correctly', async () => {
        const testPassword = 'cycletest123';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        
        // Step 1: Create a test user
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const testUser = {
            username: 'multiple_cycles_test_' + Date.now(),
            password: hashedPassword,
            name: 'Multiple Cycles Test User',
            role: 'user',
            isActive: true,
            permissions: ['leave:view'],
            department: 'HR',
            employeeId: 'MULTI_CYCLE_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: 10
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        const testUsername = testUser.username;
        
        await client.close();

        // Perform multiple deactivation-reactivation cycles
        for (let cycle = 1; cycle <= 3; cycle++) {
            // Deactivate
            await request(app)
                .put(`/api/users/${testUserId}/deactivate`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    reason: `Cycle ${cycle} - Testing multiple cycles`
                })
                .expect(200);

            // Verify login is blocked
            await request(app)
                .post('/api/auth/login')
                .send({
                    username: testUsername,
                    password: testPassword
                })
                .expect(401);

            // Reactivate
            await request(app)
                .put(`/api/users/${testUserId}/reactivate`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // Verify login works
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testUsername,
                    password: testPassword
                })
                .expect(200);

            expect(loginResponse.body).toHaveProperty('token');
            expect(loginResponse.body.user).toHaveProperty('isActive', true);
        }

        // Clean up
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        await db2.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client2.close();
    });

    it('should maintain user permissions and data after reactivation', async () => {
        const testPassword = 'permissions123';
        const hashedPassword = bcrypt.hashSync(testPassword, 10);
        
        // Step 1: Create a test user with specific permissions and data
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('SM_nomu');
        
        const originalPermissions = ['leave:view', 'leave:request', 'profile:edit'];
        const originalLeaveBalance = 18;
        const originalDepartment = 'Engineering';
        
        const testUser = {
            username: 'permissions_test_' + Date.now(),
            password: hashedPassword,
            name: 'Permissions Test User',
            role: 'user',
            isActive: true,
            permissions: originalPermissions,
            department: originalDepartment,
            employeeId: 'PERM_TEST_' + Date.now(),
            hireDate: new Date().toISOString().split('T')[0],
            leaveBalance: originalLeaveBalance,
            customField: 'Should be preserved'
        };
        
        const insertResult = await db.collection('users').insertOne(testUser);
        const testUserId = insertResult.insertedId.toString();
        const testUsername = testUser.username;
        
        await client.close();

        // Step 2: Deactivate and then reactivate
        await request(app)
            .put(`/api/users/${testUserId}/deactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                reason: 'Testing permissions preservation'
            })
            .expect(200);

        await request(app)
            .put(`/api/users/${testUserId}/reactivate`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

        // Step 3: Login and verify all data is preserved
        const loginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                username: testUsername,
                password: testPassword
            })
            .expect(200);

        const loggedInUser = loginResponse.body.user;
        
        // Verify all original data is preserved
        expect(loggedInUser).toHaveProperty('permissions');
        expect(loggedInUser.permissions).toEqual(expect.arrayContaining(originalPermissions));
        expect(loggedInUser).toHaveProperty('department', originalDepartment);
        expect(loggedInUser).toHaveProperty('leaveBalance', originalLeaveBalance);
        expect(loggedInUser).toHaveProperty('isActive', true);

        // Step 4: Verify database state
        const client2 = new MongoClient('mongodb://localhost:27017');
        await client2.connect();
        const db2 = client2.db('SM_nomu');
        
        const updatedUser = await db2.collection('users').findOne({ _id: new ObjectId(testUserId) });
        
        expect(updatedUser.permissions).toEqual(expect.arrayContaining(originalPermissions));
        expect(updatedUser.department).toBe(originalDepartment);
        expect(updatedUser.leaveBalance).toBe(originalLeaveBalance);
        expect(updatedUser.customField).toBe('Should be preserved');
        expect(updatedUser.isActive).toBe(true);
        
        await client2.close();

        // Clean up
        const client3 = new MongoClient('mongodb://localhost:27017');
        await client3.connect();
        const db3 = client3.db('SM_nomu');
        await db3.collection('users').deleteOne({ _id: new ObjectId(testUserId) });
        await client3.close();
    });
});